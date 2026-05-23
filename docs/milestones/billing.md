# MILESTONE_BILLING.md — Premier client payant

> Spec opérationnelle pour la milestone "Premier client payant" d'OnMange.app.
>
> **À placer dans le repo** : `docs/milestones/billing.md` (créer le dossier si besoin).
>
> **Dernière mise à jour** : 23 mai 2026.

---

## 1. Vue d'ensemble

Cette milestone livre l'infra de billing manquante qui empêche aujourd'hui OnMange.app d'avoir des revenus. À la fin de la milestone :

- Un food trucker peut s'inscrire, utiliser le produit pendant 14 jours sans CB, puis ajouter sa CB pour continuer à 29€ HT/mois.
- Un food trucker peut gérer son abonnement lui-même (mise à jour CB, annulation, historique factures) via le Customer Portal Stripe.
- Xavier peut voir sur `admin.onmange.app` qui est en trial, qui est actif, le MRR, le churn, et faire des gestes commerciaux (offrir 1 mois, voir comme un utilisateur).

**Effort estimé** : 9 à 15 jours de Claude Code, étalés sur 2-3 semaines réelles avec checkpoint entre chaque phase.

---

## 2. Décisions structurantes

| Décision                               | Choix                                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Modèle de découverte                   | Trial 14 jours sans CB                                                                                      |
| Tarification                           | 1 seul plan : **29€ HT/mois** (34,80€ TTC)                                                                  |
| Comportement fin de trial sans CB      | Mode dégradé (lecture seule, données conservées)                                                            |
| Comportement annulation / non-paiement | Mode dégradé (idem)                                                                                         |
| Provider billing                       | Stripe Billing direct + Customer Portal                                                                     |
| Dunning                                | Défauts Stripe (retries auto sur ~3 semaines)                                                               |
| TVA                                    | Affichage "29€ HT/mois", "34,80€ TTC" en sous-texte ; déclaration trimestrielle manuelle via impots.gouv.fr |
| Stripe Tax                             | Non activé pour le moment (France-only)                                                                     |
| Admin panel — où                       | App séparée sur `admin.onmange.app`, nouveau package `packages/admin/`                                      |
| Admin panel — scope                    | Moyen : MRR, churn, conversion, recherche, "offrir 1 mois", "voir comme cet utilisateur"                    |
| Admin auth                             | Table `admins` (id + email) en BDD, plutôt qu'env var hardcodé                                              |

---

## 3. Architecture cible

```
SUPABASE
├── Tables: + subscriptions, + admins, + admin_actions
├── Edge Functions:
│   ├── + stripe-webhook
│   ├── + create-checkout-session
│   ├── + create-portal-session
│   ├── + expire-trials (cron)
│   ├── + send-trial-reminders (cron)
│   └── + admin-stats
└── _shared/stripe.ts (NEW, après cleanup du legacy)

packages/
├── shared/
│   ├── api/billing.ts (NEW)
│   └── types/billing.ts (NEW)
├── dashboard/
│   ├── contexts/SubscriptionContext.tsx (NEW)
│   ├── pages/Billing.tsx (NEW)
│   ├── components/TrialBanner.tsx (NEW)
│   └── components/DegradedModeBanner.tsx (NEW)
├── landing/
│   └── components/Pricing.tsx (UPDATED)
└── admin/ (NEW PACKAGE)
```

Subdomain routing à ajouter dans `vercel.json` : `admin.onmange.app` → `packages/admin/dist`.

---

## 4. Schéma BDD

### Table `subscriptions`

Un food truck = une subscription. Créée en `trialing` à la création du food truck via trigger.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID NOT NULL UNIQUE REFERENCES foodtrucks(id) ON DELETE CASCADE,

  -- Stripe
  stripe_customer_id TEXT UNIQUE,           -- NULL tant que pas de CB ajoutée
  stripe_subscription_id TEXT UNIQUE,       -- NULL tant que pas de CB ajoutée

  -- Statut
  status TEXT NOT NULL CHECK (status IN (
    'trialing',       -- 14j sans CB (notre trial, pas celui de Stripe)
    'active',         -- payant, OK
    'past_due',       -- paiement échoué, Stripe retry en cours
    'canceled',       -- annulé à la fin de la période
    'unpaid',         -- retries Stripe épuisés
    'incomplete',     -- checkout pas finalisé
    'paused',         -- pause volontaire (action admin)
    'expired_trial'   -- trial fini sans CB
  )),

  -- Dates clés
  trial_started_at TIMESTAMPTZ NOT NULL,
  trial_ends_at TIMESTAMPTZ NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_trial_ends_at
  ON subscriptions(trial_ends_at)
  WHERE status = 'trialing';
CREATE INDEX idx_subscriptions_stripe_customer
  ON subscriptions(stripe_customer_id);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Le food trucker propriétaire peut lire SA subscription
CREATE POLICY "read own subscription" ON subscriptions
  FOR SELECT USING (
    foodtruck_id IN (SELECT id FROM foodtrucks WHERE user_id = auth.uid())
  );
-- INSERT/UPDATE/DELETE uniquement via service_role (Edge Functions + triggers)
```

### État dérivé `access_state`

```sql
CREATE OR REPLACE FUNCTION get_access_state(p_status TEXT)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE
    WHEN p_status IN ('trialing', 'active', 'past_due') THEN 'full'
    ELSE 'degraded'
  END;
$$;
```

`past_due` garde l'accès pendant que Stripe retry (~3 semaines). Si retries épuisés → `unpaid` → degraded.

### Trigger création auto

```sql
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (foodtruck_id, status, trial_started_at, trial_ends_at)
  VALUES (NEW.id, 'trialing', NOW(), NOW() + INTERVAL '14 days');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_foodtruck_created
  AFTER INSERT ON foodtrucks
  FOR EACH ROW EXECUTE FUNCTION create_trial_subscription();
```

### Table `admins`

```sql
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read admins" ON admins
  FOR SELECT USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));
```

Insertion manuelle du premier admin (Xavier) via SQL après migration.

### Table `admin_actions` (audit trail)

```sql
CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id),
  action TEXT NOT NULL,           -- 'gift_month', 'impersonate', 'pause', etc.
  target_foodtruck_id UUID REFERENCES foodtrucks(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read admin_actions" ON admin_actions
  FOR SELECT USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));
```

---

## 5. Phase 0 — Cleanup Stripe Connect legacy

**Objectif** : supprimer tout le code Stripe Connect mort avant d'introduire Stripe Billing.

**Pré-requis** : aucun.

**Fichiers à supprimer / nettoyer** :

- `supabase/functions/stripe-connect/` (dossier entier)
- `supabase/functions/_shared/stripe.ts`
- Toutes les refs Stripe dans `supabase/functions/_shared/orders.ts`
- Types Stripe dans `packages/shared/src/types/api.ts`
- Var `VITE_STRIPE_PUBLISHABLE_KEY` dans `.env.example`
- Toutes les colonnes BDD orphelines liées à Stripe Connect si elles existent (à vérifier)

**Critères d'acceptance** :

- `grep -ri "stripe" --include="*.ts" --include="*.tsx" --include="*.sql" supabase/ packages/` retourne zéro résultat (hors `node_modules`)
- `grep -ri "STRIPE" .env.example` retourne zéro résultat
- Build passe (`pnpm build`)
- Tests passent (`pnpm test`)
- Migration de cleanup créée et appliquée si des colonnes BDD étaient à dégager

---

## 6. Phase 1 — Infra Stripe Billing

**Objectif** : poser toute la plomberie Stripe Billing côté backend + une page `/billing` minimale dans le dashboard.

**Pré-requis** : Phase 0 terminée.

### 6.1 Checklist Stripe à faire manuellement par Xavier (~1h)

1. Créer un compte Stripe (mode test d'abord)
2. Dans Dashboard Stripe → Products : créer un **Product** "OnMange.app" avec une **Price** récurrente mensuelle de **29€ EUR (excluding tax)**
3. Récupérer la `price_id` (commence par `price_...`)
4. Activer le **Customer Portal** dans Settings → Billing → Customer portal :
   - Autoriser : mise à jour CB, annulation, historique factures, mise à jour adresse de facturation
   - Cancellation : `cancel_at_period_end = true` (accès jusqu'à la fin de la période payée)
5. Récupérer la clé API : `STRIPE_SECRET_KEY` (test : `sk_test_...`)
6. Configurer le webhook endpoint après déploiement de l'Edge Function (étape 6.3), récupérer `STRIPE_WEBHOOK_SECRET`

### 6.2 Migration BDD

Créer la table `subscriptions` (§4), le trigger de création auto, la fonction `get_access_state`.

**Backfill** dans la migration pour les food trucks existants :

```sql
INSERT INTO subscriptions (foodtruck_id, status, trial_started_at, trial_ends_at)
SELECT id, 'trialing', NOW(), NOW() + INTERVAL '14 days'
FROM foodtrucks
WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE foodtruck_id = foodtrucks.id);
```

### 6.3 Edge Functions

**`supabase/functions/_shared/stripe.ts`** (NEW, après cleanup) — wrapper Stripe SDK Deno :

- Init Stripe avec `STRIPE_SECRET_KEY`
- Helpers : `getOrCreateCustomer(email, metadata)`, `verifyWebhookSignature(body, sig)`

**`supabase/functions/stripe-webhook/index.ts`** — handle les events :

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Pour chaque event : update la row `subscriptions` correspondante (lookup par `stripe_subscription_id`).

**Important** :

- Vérification de signature obligatoire via `STRIPE_WEBHOOK_SECRET`
- Idempotence : Stripe peut envoyer le même event plusieurs fois, gérer les replays (par exemple via `stripe_event_id` dans une table de dedup, ou check du statut avant update)

**`supabase/functions/create-checkout-session/index.ts`** :

- Auth requise (food trucker)
- Crée le Stripe Customer si pas déjà fait, save `stripe_customer_id` en BDD
- Crée une Checkout Session en mode `subscription` avec la `price_id`
- `success_url` = `https://pro.onmange.app/billing?success=1`
- `cancel_url` = `https://pro.onmange.app/billing`
- Renvoie l'URL pour redirection

**`supabase/functions/create-portal-session/index.ts`** :

- Auth requise (food trucker)
- Crée une Stripe Portal Session pour le `stripe_customer_id`
- Renvoie l'URL pour redirection

**Variables d'env à ajouter** (`Deno.env`) : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`.

### 6.4 Couche shared

**`packages/shared/src/types/billing.ts`** — types `Subscription`, `SubscriptionStatus`, `AccessState`.

**`packages/shared/src/api/billing.ts`** :

- `getSubscription(foodtruckId)`
- `createCheckoutSession()` → renvoie l'URL
- `createPortalSession()` → renvoie l'URL

À ajouter dans la factory `createApi(supabase)`.

### 6.5 Page Billing dashboard (minimale)

**`packages/dashboard/src/pages/Billing.tsx`** :

- Affiche le statut actuel
- Si trial : compteur de jours restants, bouton "Ajouter ma CB" → checkout
- Si active : bouton "Gérer mon abonnement" → portal
- Si dégradé : CTA "Réactiver mon abonnement" → checkout

Route : `/billing` dans `App.tsx`.

### Critères d'acceptance Phase 1

- Webhook Stripe configuré et reçoit les events (vérifier dans Stripe Dashboard → Webhooks)
- Un food trucker peut faire le parcours : "Ajouter ma CB" → Stripe Checkout → paiement test avec carte `4242 4242 4242 4242` → retour `/billing?success=1` → BDD reflète `status='active'`
- Le Customer Portal s'ouvre et permet de gérer la subscription
- Annulation depuis le Portal : webhook reçu, BDD reflète `cancel_at_period_end=true`
- À la fin de la période : webhook `subscription.deleted` reçu, `status='canceled'`
- Tests unitaires sur les Edge Functions (mock Stripe SDK)

---

## 7. Phase 2 — Trial flow

**Objectif** : un food trucker fraîchement inscrit bénéficie d'un trial 14j visible et qui se termine proprement.

**Pré-requis** : Phase 1 terminée.

### 7.1 SubscriptionContext

**`packages/dashboard/src/contexts/SubscriptionContext.tsx`** :

- Fetch la subscription au mount
- Expose `subscription`, `accessState`, `daysRemainingInTrial`
- Refresh sur focus + polling 60s (pattern similaire à `OrderNotificationContext`)

### 7.2 Banner countdown

**`packages/dashboard/src/components/TrialBanner.tsx`** :

- Visible sur toutes les pages si `subscription.status === 'trialing'`
- "Il vous reste X jours d'essai. [Ajouter ma CB →]"
- À J-3, J-1, J-0 : style insistant (orange puis rouge)

### 7.3 Emails de relance

Cron Edge Function **`send-trial-reminders`** :

- Tourne 1×/jour
- Identifie les subscriptions `trialing` avec `trial_ends_at` à J-7, J-3, J-1, J-0
- Envoie un email via Resend avec CTA vers `/billing`

Templates dans `supabase/functions/_shared/emails/trial-*.html`.

### 7.4 Expiration du trial

Cron Edge Function **`expire-trials`** :

- Tourne 1×/heure
- Identifie les subscriptions `trialing` avec `trial_ends_at < NOW()` ET `stripe_subscription_id IS NULL`
- Update : `status = 'expired_trial'`

**Subtilité importante** : on n'utilise PAS le trial natif Stripe. Quand un food trucker ajoute sa CB pendant notre trial (par exemple à J+5), on lance la subscription Stripe immédiatement avec un `trial_period_days` Stripe correspondant au reste de notre trial (14 - 5 = 9 jours), pour qu'il ne soit pas facturé avant la fin de la période promise. Détail à confirmer à l'implémentation, deux options :

- (a) `trial_period_days: N` à la création de la Checkout Session (Stripe gère, simple)
- (b) `trial_end: <timestamp>` (plus précis)

### Critères d'acceptance Phase 2

- Création d'un nouveau food truck → trial 14j démarre, visible sur le dashboard
- Banner countdown affiché et précis
- Emails reçus à J-7, J-3, J-1 (testable en avançant `trial_ends_at` en dev)
- À l'expiration : `status = 'expired_trial'`, le mode dégradé s'active (Phase 3)

---

## 8. Phase 3 — Gating / mode dégradé

**Objectif** : un food trucker en mode dégradé voit clairement son état, ne peut plus faire d'opérations critiques, mais ne perd rien.

**Pré-requis** : Phase 2 terminée.

### 8.1 Guard côté dashboard

Wrapper autour des routes privées (`PrivateRoute` existant à étendre) qui check `accessState` via le `SubscriptionContext` :

- Si `full` : passage normal
- Si `degraded` : autorisé uniquement sur `/billing` et `/settings`, redirection forcée vers `/billing` pour les autres

### 8.2 Mode dégradé concret

Définition précise du "lecture seule" :

- ✅ Voir le dashboard, les commandes existantes, le menu, le planning
- ❌ Recevoir de nouvelles commandes (page client : "Ce food truck ne prend pas de commandes pour le moment")
- ❌ Modifier le menu, le planning, lancer des campagnes, créer des offres
- ❌ Recevoir les emails / push de nouvelles commandes

Désactivation côté serveur :

- Edge Function `create-order` : refuse si `accessState != 'full'`
- Edge Function `send-campaign` : idem

Désactivation côté UI : tous les boutons d'écriture `disabled` avec tooltip "Réactivez votre abonnement pour utiliser cette fonctionnalité".

### 8.3 Banner mode dégradé

**`packages/dashboard/src/components/DegradedModeBanner.tsx`** :

- Banner rouge persistant en haut de toutes les pages
- "Votre abonnement est expiré. [Réactiver pour 29€ HT/mois →]"

### 8.4 Page client publique en mode dégradé

Si le food truck visité est dégradé, la page `<slug>.onmange.app` :

- Affiche le menu et les infos (lecture seule)
- Affiche un message clair : "Ce food truck ne prend pas de commandes pour le moment via OnMange.app"
- Pas de panier, pas de checkout

### Critères d'acceptance Phase 3

- Un food trucker en `expired_trial` ou `canceled` redirige sur `/billing` quoi qu'il fasse
- Page client publique d'un food truck dégradé : commandes désactivées, message clair
- Edge Function `create-order` refuse une commande pour un food truck dégradé (test E2E)
- Réactivation via paiement Stripe → tout revient à la normale

---

## 9. Phase 4 — Landing pricing + parcours upgrade

**Objectif** : la landing communique le prix clairement et amène à l'inscription.

**Pré-requis** : Phase 2 minimum.

### 9.1 Section Pricing

**`packages/landing/src/components/Pricing.tsx`** (UPDATED) :

- Single card : **29€ HT/mois** (en sous-texte : "soit 34,80€ TTC")
- "Tout inclus, sans engagement, sans CB demandée à l'inscription"
- Liste des features clés
- CTA : "Commencer mon essai gratuit de 14 jours" → `/register` sur le dashboard
- Footer du bloc : "Annulation à tout moment, en un clic, depuis votre espace."

### 9.2 FAQ

Section FAQ à côté du pricing :

- Que se passe-t-il après les 14 jours ?
- Comment annuler ?
- Mes données sont-elles conservées si j'annule ?
- Puis-je utiliser OnMange.app si je suis micro-entrepreneur ?
- Y a-t-il des frais en plus ?

### Critères d'acceptance Phase 4

- Landing affiche le pricing clairement, mobile et desktop
- CTA fonctionnel vers `/register`
- FAQ traitable en un coup d'œil

---

## 10. Phase 5 — Admin panel

**Objectif** : Xavier dispose d'un outil pour piloter l'activité et faire des gestes commerciaux.

**Pré-requis** : Phase 1 minimum (table `subscriptions` doit exister). Idéalement Phase 3 aussi.

### 10.1 Setup nouveau package

```
packages/admin/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── FoodTrucks.tsx
│   │   └── FoodTruckDetail.tsx
│   ├── components/
│   ├── contexts/AdminAuthContext.tsx
│   ├── hooks/
│   └── lib/
│       ├── api.ts
│       └── supabase.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

Stack identique au dashboard. Réutilise les composants de `@foodtruck/shared`.

### 10.2 Routing Vercel

Modifier `vercel.json` pour router `admin.onmange.app` → `packages/admin/dist`. Adapter `scripts/combine-dist.js` et `scripts/validate-vercel-config.js`.

### 10.3 Auth admin

- Login Supabase classique (email + password)
- Au login, check que `auth.uid()` est dans la table `admins`
- Sinon, logout immédiat + message "Accès refusé"
- `AdminAuthContext` expose `isAdmin` et bloque toute l'app si false

### 10.4 Pages

**`Dashboard.tsx`** :

- Cards KPIs :
  - MRR actuel (somme des subscriptions `active` × 29€)
  - MoM growth
  - Nombre de trials actifs
  - Nombre d'actifs payants
  - Taux de conversion trial → paid (30 derniers jours)
  - Churn (subscriptions canceled le mois en cours)
- Graphique évolution MRR sur 6 mois (Recharts)

Toutes les données via Edge Function `admin-stats` (SECURITY DEFINER + ownership check via table `admins`).

**`FoodTrucks.tsx`** :

- Liste paginée (nom, slug, email, statut subscription, date d'inscription, dernière activité)
- Filtres : statut subscription, ancienneté, recherche par nom/email
- Click → `FoodTruckDetail.tsx`

**`FoodTruckDetail.tsx`** :

- Infos foodtruck (read-only)
- État subscription complet
- Actions (toutes tracées dans `admin_actions`) :
  - **"Offrir 1 mois"** : crée un crédit Stripe (`customer balance`) OU prolonge `trial_ends_at` — la méthode Stripe est plus propre côté facturation
  - **"Voir comme cet utilisateur"** : génère un magic link Supabase pour ce user, ouvre dans un nouvel onglet
  - **"Mettre en pause"** : `status = 'paused'` (si on en a besoin, sinon skip)

### Critères d'acceptance Phase 5

- `admin.onmange.app` accessible et fonctionnel
- Login bloqué pour non-admins (testable)
- Dashboard KPIs corrects (vérifiables manuellement avec données de test)
- "Offrir 1 mois" fonctionne et est tracé dans `admin_actions`
- "Voir comme cet utilisateur" fonctionne
- Tests unitaires sur la couche auth admin

---

## 11. Out of scope

Explicitement HORS de cette milestone, à mettre dans le BACKLOG si pertinent :

- Multi-utilisateurs sur un compte food truck
- Plans multiples (Basic/Pro/Premium) — single tier 29€ uniquement
- Programme d'affiliation / parrainage
- Facturation par client final (les food truckers n'émettent pas de factures à leurs clients, c'est sur place)
- Stripe Tax (à activer le jour où on vend hors France)
- Annual billing avec discount
- Coupons / codes promo pour l'abonnement OnMange (sauf via "Offrir 1 mois" admin)
- Internationalisation (FR uniquement)
- Refacto des god components / migration React Query (déjà au BACKLOG)

---

## 12. Critères de done pour la milestone

La milestone est considérée terminée quand :

1. Un food trucker peut s'inscrire, utiliser le produit 14 jours, ajouter sa CB, payer 29€ HT/mois, voir sa facture, annuler depuis le portal Stripe, et tout reprendre quand il veut.
2. Un food trucker qui ne paye pas tombe en mode dégradé propre, sans perte de données.
3. Xavier dispose de `admin.onmange.app` pour piloter, et a fait son premier "geste commercial" sur un client test.
4. Tous les tests passent, typecheck OK, build OK.
5. La landing communique le pricing clairement.
6. Au moins **1 food trucker pilote** (gratuit, en relation directe avec Xavier) a fait le parcours complet en conditions réelles.
7. `BACKLOG.md` est mis à jour : Milestone marquée comme done, items émergés ajoutés.

---

_Spec rédigée le 23 mai 2026. À mettre à jour au fil de l'exécution si des décisions évoluent._
