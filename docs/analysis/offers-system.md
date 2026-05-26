# Analyse exhaustive — Système d'offres unifié OnMange.app

> Document d'audit technique. Lecture seule, aucune modification de code.
> Date : 26 mai 2026

---

## 1. Vue d'ensemble

Le système d'offres unifié remplace trois systèmes legacy (`promo_codes`, `deals`, `promo_code_uses` / `deal_uses`) par un modèle unique capable de représenter 4 types d'offres :

| Type                 | Description                   | Exemple                                 |
| -------------------- | ----------------------------- | --------------------------------------- |
| `bundle`             | Menu composé à prix fixe      | "Menu Burger + Frites + Boisson = 12 €" |
| `buy_x_get_y`        | Achat X, offert Y             | "3 achetés, 1 offert"                   |
| `promo_code`         | Code saisi → remise fixe ou % | "BIENVENUE → -10%"                      |
| `threshold_discount` | Seuil de montant → remise     | "Dès 20 € → -3 €"                       |

Le système est conçu pour :

- Calculer automatiquement la meilleure combinaison d'offres applicable à un panier
- Empêcher le gaming (un item ne peut satisfaire qu'une seule offre)
- Valider côté serveur que le discount annoncé par le client est correct

---

## 2. Modèle de données

### Table `offers`

```sql
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID NOT NULL REFERENCES foodtrucks(id),
  name TEXT NOT NULL,
  type offer_type NOT NULL,  -- enum: bundle, buy_x_get_y, promo_code, threshold_discount
  active BOOLEAN DEFAULT true,

  -- Scheduling
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  day_of_week INTEGER[],     -- 0=dim … 6=sam (null = tous les jours)

  -- Config selon type (JSONB)
  config JSONB NOT NULL DEFAULT '{}',

  -- Promo code specifics
  code TEXT,                  -- unique par foodtruck quand non-null

  -- Usage limits
  max_uses INTEGER,
  max_uses_per_customer INTEGER,

  -- Display
  description TEXT,
  image_url TEXT,
  position INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Table `offer_items`

Lie une offre à des items du menu. La sémantique varie selon le type :

```sql
CREATE TABLE offer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  role TEXT NOT NULL DEFAULT 'required', -- 'required', 'choice', 'free'
  quantity INTEGER DEFAULT 1,
  group_index INTEGER DEFAULT 0,         -- pour les groupes de choix bundle
  position INTEGER DEFAULT 0
);
```

Pour un **bundle** : `group_index` sépare les groupes de choix (entrée, plat, boisson). `role='choice'` = le client choisit parmi les items du groupe.

Pour un **buy_x_get_y** : `role='required'` = items qui comptent pour le X, `role='free'` = items offerts pour le Y.

### Table `offer_uses`

```sql
CREATE TABLE offer_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  customer_email TEXT,
  discount_amount INTEGER NOT NULL, -- en centimes
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Config JSONB par type

| Type                 | Champs config                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `bundle`             | `{ fixed_price: number }` (centimes)                                                            |
| `buy_x_get_y`        | `{ buy_quantity: number, get_quantity: number, discount_percent: number }`                      |
| `promo_code`         | `{ discount_type: 'percentage' \| 'fixed', discount_value: number, min_order_amount?: number }` |
| `threshold_discount` | `{ threshold_amount: number, discount_type: 'percentage' \| 'fixed', discount_value: number }`  |

---

## 3. Saisie côté food trucker (dashboard)

### Fichier : `packages/dashboard/src/pages/Offers/useOffers.ts` (633 lignes)

Le hook `useOffers` gère un formulaire wizard avec ~86 champs d'état pour couvrir les 4 types. Points notables :

- **`buildConfig()`** : sérialise le state du formulaire en `config` JSONB selon le type sélectionné
- **`validateForm()`** : validation client-side avant soumission (nom requis, prix > 0, au moins un item, etc.)
- **`handleSubmit()`** : crée/update l'offre + ses `offer_items` en base

**Dette technique identifiée** :

- 11 casts `as any` pour contourner des types Supabase mal régénérés
- Appels Supabase directs (ne passe PAS par `shared/api/offers.ts`) — violation de la convention, documentée dans BACKLOG
- Gestion optimiste des erreurs : certains `catch` font juste `console.error` sans feedback utilisateur

### Flux de création

1. L'utilisateur choisit le type d'offre
2. Il configure les paramètres (prix fixe, quantités, pourcentage…)
3. Il sélectionne les items du menu concernés (avec rôles et groupes)
4. Il définit optionnellement des contraintes (dates, jours, limites d'usage)
5. `handleSubmit()` fait un INSERT dans `offers` puis des INSERTs batch dans `offer_items`

---

## 4. Algorithme d'évaluation (optimisation)

### Objectif

Étant donné un panier, trouver la combinaison d'offres qui maximise la remise totale pour le client, sans qu'un item du panier ne serve à deux offres différentes.

### Fichier principal : migration `20260209000001_optimal_offer_combination.sql`

#### Fonction `get_optimized_offers(p_foodtruck_id, p_cart_items, p_total_amount)`

Stratégie duale — essaie deux ordres de priorité et garde le meilleur :

1. **Stratégie A** : bundles d'abord → puis buy_x_get_y sur les items restants
2. **Stratégie B** : buy_x_get_y d'abord → puis bundles sur les items restants

Chaque stratégie :

1. Marque les items comme "disponibles" dans un tableau temporaire
2. Applique les offres du premier type (greedy, par discount décroissant)
3. Applique les offres du second type sur les items non encore consommés
4. Applique `threshold_discount` sur le total (indépendant des items)
5. Retourne la somme des discounts

La stratégie gagnante (discount total max) est retournée au client.

#### Sous-fonctions

- **`process_bundle_offers()`** : pour chaque bundle actif, vérifie si le panier contient assez d'items non marqués pour satisfaire tous les groupes. Si oui, calcule le discount = somme des prix des items consommés − prix fixe du bundle.
- **`process_buy_x_get_y_offers()`** : pour chaque offre BxGy, compte combien de "lots" complets le client peut former, calcule le discount via `calculate_fair_buy_x_get_y_discount()`.
- **`mark_items_used_safe()`** : marque N items d'un menu_item_id comme utilisés dans le tableau temporaire. Retourne false si pas assez d'items disponibles.
- **`mark_first_unused_item()`** : marque un seul item non utilisé (pour les groupes de choix bundle).

### Fichier anti-gaming : migration `20260123000002_fair_pricing_algorithm.sql`

#### `calculate_fair_buy_x_get_y_discount()`

Logique "skip" anti-gaming :

1. Trier tous les items éligibles par prix croissant
2. Ignorer les `N mod (X+Y)` items les moins chers (ils ne forment pas un lot complet)
3. Grouper les restants en lots de (X+Y)
4. Dans chaque lot, les Y items les moins chers sont "offerts" → discount = somme de leurs prix × `discount_percent/100`

Cela empêche un client d'ajouter un item à 0.01 € pour bénéficier d'un "1 offert".

#### `calculate_fair_bundle_discount()`

Utilise les items les plus chers du panier (parmi ceux éligibles) pour calculer le discount. Le discount = somme des prix des items choisis − prix fixe du bundle. Si le discount est ≤ 0, le bundle n'est pas appliqué (le client paierait plus cher avec le bundle).

---

## 5. Cumulabilité

### Règles

- **Un item ne peut servir qu'à une seule offre** (marquage dans le tableau temporaire)
- **Bundles et buy_x_get_y sont mutuellement exclusifs sur les mêmes items** (d'où la stratégie duale)
- **Threshold_discount est toujours cumulable** car il porte sur le montant total, pas sur des items spécifiques
- **Promo_code** : appliqué séparément (un seul code par commande), cumulable avec les offres automatiques
- **Plusieurs bundles** peuvent s'appliquer s'ils portent sur des items différents
- **Plusieurs buy_x_get_y** peuvent s'appliquer s'ils portent sur des items différents

### Limite

Le système ne gère PAS la cumulabilité configurable (ex: "cette offre ne se cumule pas avec telle autre"). Toutes les offres sont cumulables tant que les items ne se chevauchent pas. C'est un choix de simplicité assumé.

---

## 6. Anti-gaming

### Mécanismes en place

1. **Skip logic (buy_x_get_y)** : les items résiduels qui ne forment pas un lot complet sont ignorés. Un client ne peut pas ajouter 1 item cheap pour trigger un "offert".

2. **Most expensive first (bundle)** : le bundle consomme les items les plus chers du panier. Le client ne peut pas ajouter un item à 1 centime et prétendre au discount d'un bundle à 12 €.

3. **Discount ≤ 0 → offre ignorée** : si le prix fixe du bundle est supérieur à la somme des items, l'offre n'est pas proposée.

4. **`max_uses` / `max_uses_per_customer`** : limites d'usage globales et par email.

5. **Validation server-side** : `validateAppliedOffers()` dans `create-order` recalcule tout et refuse la commande si le discount annoncé ne correspond pas (tolérance : 1 centime).

### Failles résiduelles identifiées

- **Pas de rate-limiting** sur la création de commandes : un attaquant pourrait bruteforcer un code promo
- **`customer_email` non vérifié** : le comptage `max_uses_per_customer` repose sur l'email déclaré, pas sur un compte authentifié (les clients ne sont pas obligés de créer un compte)
- **Pas de cap global sur le discount** : théoriquement, un panier très large pourrait accumuler un discount > 50% du total si plusieurs offres sont actives simultanément

---

## 7. Application en commande (client)

### Fichier : `packages/client/src/hooks/useOffers.ts` (235 lignes)

Le hook client :

1. Charge les offres actives du foodtruck au mount
2. Filtre les bundles dont tous les items de la carte sont disponibles
3. Quand le panier change, appelle `api.offers.getOptimized()` (qui invoque la fonction SQL `get_optimized_offers`)
4. Affiche les offres applicables avec le discount calculé
5. L'utilisateur peut appliquer/retirer manuellement un promo_code

### Fichier : `supabase/functions/_shared/orders.ts` (lignes 539-788)

#### `validateAppliedOffers()`

Validation serveur à la création de commande :

- Vérifie que chaque offre est `active`, dans ses dates, et dans ses jours de semaine
- Vérifie `max_uses` et `max_uses_per_customer`
- Pour les bundles : vérifie que le panier contient les items requis en quantité suffisante
- Pour buy_x_get_y : vérifie que le nombre de lots revendiqués est cohérent
- Vérifie que le `discount_amount` annoncé correspond au recalcul server-side (tolérance 1 centime)

#### `validateOrderTotal()`

Recalcule le total de la commande côté serveur :

- Somme des items × quantité × prix (avec options/suppléments)
- Soustrait les discounts validés
- Compare au `total_amount` envoyé par le client (tolérance 1 centime)

#### `calculateOrder()` — tracking d'instances bundle

Pour les bundles qui apparaissent plusieurs fois dans un panier, le code maintient un compteur d'instances (`bundle_instance_index`) pour s'assurer que chaque instance consomme ses propres items.

---

## 8. Tests existants

### Tests unitaires identifiés

| Fichier                                                 | Couverture                                           |
| ------------------------------------------------------- | ---------------------------------------------------- |
| `packages/shared/src/utils/pricing.test.ts`             | Calcul prix bundles, deltas options, formule de base |
| `packages/client/src/hooks/useOffers.test.ts`           | Hook client (mock API, filtrage bundles)             |
| `packages/dashboard/src/pages/Offers/useOffers.test.ts` | Hook dashboard (CRUD, validation form)               |

### Tests d'intégration SQL

Les migrations contiennent des commentaires détaillés sur les cas testés manuellement mais **il n'y a pas de suite de tests automatisés** pour les fonctions SQL d'optimisation. C'est un risque : les 20 migrations successives (avec 12 fixes documentées dans `20260122220000`) montrent que ces fonctions sont fragiles et que des régressions ont eu lieu.

### Tests E2E

Le parcours checkout dans les E2E Playwright inclut l'application d'un promo_code, mais ne couvre pas les scénarios d'optimisation multi-offres.

---

## 9. Constats du dev

### Ce qui fonctionne bien

- Le modèle de données est propre et extensible (JSONB config permet d'ajouter des types sans migration)
- La stratégie duale d'optimisation est ingénieuse et couvre le cas réel le plus fréquent
- Le fair pricing est une vraie protection contre le gaming
- La validation server-side est solide (1 centime de tolérance, recalcul complet)

### Ce qui est fragile

1. **20 migrations pour un seul système** : le code SQL a évolué par patch successifs. La migration `20260122220000` documente 12 bugs corrigés en une seule passe. Le risque de régression sans tests automatisés est réel.

2. **Dual code path** : le hook dashboard (`useOffers.ts`, 633 lignes) ne passe pas par `shared/api/offers.ts` et fait ses propres appels Supabase. Toute modification du schéma doit être répercutée à deux endroits.

3. **`as any` épidémie** : 11 casts dans le hook dashboard + 7 dans l'API shared = 18 endroits où le compilateur ne vérifie plus rien. Certains masquent des incompatibilités de types réelles (types DB non régénérés).

4. **Pas de tests d'intégration SQL** : les fonctions `get_optimized_offers`, `calculate_fair_buy_x_get_y_discount`, `calculate_fair_bundle_discount` ne sont testées qu'implicitement via le E2E. Un changement dans une migration ultérieure pourrait casser l'optimisation sans que rien ne le détecte avant la prod.

5. **Complexité cyclomatique** : `process_bundle_offers()` fait ~80 lignes de PL/pgSQL avec des boucles imbriquées et des early returns. Difficile à debugger sans `RAISE NOTICE`.

6. **Pas de cap global sur le discount** : si un food trucker crée par erreur 5 offres buy_x_get_y sur les mêmes items avec des conditions différentes, le système peut potentiellement offrir un discount aberrant.

7. **Performance non mesurée** : `get_optimized_offers()` est O(offres × items × quantités). Pour un panier de 20 items avec 10 offres actives, le nombre d'itérations reste raisonnable (~200), mais aucun benchmark n'existe.

### Hacks assumés

- Le `group_index` dans `offer_items` est un hack d'UI pour gérer les "groupes de choix" des bundles. Il n'a aucune sémantique métier claire en dehors du contexte d'affichage.
- Le `position` dans `offer_items` et `offers` sert exclusivement au tri d'affichage et n'affecte pas l'algorithme.
- Le champ `code` est nullable et unique par foodtruck via un index partiel (`WHERE code IS NOT NULL`). Les offres sans code sont automatiques.

---

## 10. Résumé exécutif

| Dimension                     | Verdict                                                                |
| ----------------------------- | ---------------------------------------------------------------------- |
| **Modèle de données**         | Solide, extensible, bien normalisé                                     |
| **Algorithme d'optimisation** | Ingénieux (dual strategy), correct pour les cas courants               |
| **Anti-gaming**               | Bon niveau (skip logic, most expensive first, server-side validation)  |
| **Robustesse**                | Fragile — 20 migrations, 12 bugs patchés, 0 test d'intégration SQL     |
| **Maintenabilité**            | Moyenne — dual code path, 18 `as any`, hook de 633 lignes              |
| **Couverture de tests**       | Insuffisante sur le coeur algorithmique (SQL)                          |
| **Performance**               | Non mesurée mais probablement OK pour les volumes actuels              |
| **Sécurité**                  | Correcte (validation server-side), faille mineure sur le rate-limiting |

### Recommandations prioritaires (non implémentées ici)

1. Écrire une suite de tests d'intégration pour `get_optimized_offers()` avec des fixtures couvrant : panier vide, un seul bundle, bundles concurrents, buy_x_get_y avec reste, combinaison mixte, edge case discount négatif
2. Migrer `useOffers.ts` (dashboard) vers `shared/api/offers.ts` pour supprimer le dual code path
3. Régénérer `database.types.ts` et éliminer les 18 `as any`
4. Ajouter un cap configurable (`max_discount_percent`) par foodtruck pour éviter les accidents de configuration
5. Consolider les 20 migrations en une seule migration baseline (optionnel, cosmétique)

---

_Fin du document._
