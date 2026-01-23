# CLAUDE.md - FoodTruck SaaS

## 📋 Résumé du projet

SaaS permettant aux foodtrucks de digitaliser leurs **pré-commandes**. Les clients accèdent via lien/QR code (pas d'app store), consultent le menu et passent commande. **Les paiements s'effectuent sur place directement auprès du commerçant** (MonTruck ne gère pas les paiements - conformité NF525).

**Nom du projet :** FoodTruck SaaS
**Cible :** Foodtrucks indépendants en France
**Modèle économique :** Abonnement mensuel (29€ Basic / 49€ Pro / 79€ Premium)

---

## 🛠 Stack Technique

| Élément | Technologie |
|---------|-------------|
| Monorepo | pnpm workspaces |
| Client PWA | React + Vite + TailwindCSS |
| Dashboard Gestionnaire | React + Vite + TailwindCSS |
| Backend | Supabase (Auth, PostgreSQL, Storage, Realtime, Edge Functions) |
| Maps | Google Maps API ou Leaflet |
| Hébergement | Vercel |
| Langage | TypeScript (strict mode) |

---

## 📁 Structure du projet

```
foodtruck-saas/
├── packages/
│   ├── client/          # PWA client final
│   ├── dashboard/       # Dashboard gestionnaire foodtruck
│   └── shared/          # Types et utilitaires partagés
├── supabase/
│   ├── migrations/      # SQL migrations
│   └── functions/       # Edge functions
├── package.json         # Workspace root
├── pnpm-workspace.yaml
├── CLAUDE.md            # Ce fichier
└── README.md
```

---

## 🎯 Fonctionnalités V1 (MVP)

### Interface Gestionnaire (Dashboard)

#### Authentification
- [x] Inscription/connexion email + magic link
- [x] Gestion profil foodtruck (nom, description, photo, type de cuisine)

#### Gestion du menu
- [x] CRUD plats (nom, description, prix, photo, allergènes, catégorie)
- [x] Activation/désactivation rapide (rupture de stock)
- [x] Catégories : entrées, plats, desserts, boissons
- [x] CRUD catégories (création, édition, suppression, réorganisation)
- [x] Menu du jour
- [x] Options/variantes sur les plats (tailles, suppléments, cuissons)

#### Planning récurrent
- [x] Sélection jours de la semaine (checkboxes "tous les lundis", etc.)
- [x] Horaires par jour (arrivée/départ)
- [x] Adresse/emplacement par jour
- [x] Exceptions (vacances, jours fériés)

#### Commandes
- [x] Liste commandes en temps réel (Supabase Realtime)
- [x] Statuts : nouvelle → en préparation → prête → retirée
- [x] Notification sonore nouvelles commandes
- [x] Vue planning vertical (créneaux de retrait par tranches de 15min)
- [x] Prise de commande manuelle (interface POS pour commandes sur place)

#### Paramètres
- [x] Option affichage photos dans le menu (avec/sans photos côté client)

#### Analytics avancée
- [x] CA jour/semaine/mois avec périodes personnalisables
- [x] Comparaison avec la période précédente (%)
- [x] Commandes par jour et par heure (heures de pointe)
- [x] Plats les plus vendus (top 10 avec barres de progression)
- [x] Performance par catégorie
- [x] CA par emplacement (meilleurs spots)
- [x] Clients uniques et fidèles
- [x] Export CSV des données

#### CRM & Marketing
- [x] Base clients avec historique (créée automatiquement depuis commandes)
- [x] Opt-in RGPD email/SMS au checkout
- [x] Segmentation clients (tous, par emplacement, inactifs, fidèles, nouveaux)
- [x] Gestion des campagnes marketing (création, ciblage, contenu)
- [x] Envoi email via Resend
- [x] Envoi SMS via Twilio
- [x] Statistiques campagnes (envoyés, ouverts, cliqués)
- [x] Export CSV des clients
- [x] Page de désabonnement (RGPD)

#### Système Unifié d'Offres (/offers)
- [x] 4 templates d'offres : Menu/Formule, X achetés = Y offert, Code Promo, Remise au palier
- [x] Wizard de création avec formulaires adaptés par type
- [x] Configuration flexible via JSONB (prix fixe, quantités, codes...)
- [x] Validité temporelle (date début/fin)
- [x] Limites d'utilisation (max total, max par client)
- [x] Articles liés pour bundles et buy_x_get_y
- [x] Statistiques d'utilisation (utilisations, réductions accordées)
- [x] Option cumulable avec d'autres offres
- [x] Migration automatique des anciens promo_codes et deals
- [x] Optimisation globale via fonction SQL `get_optimized_offers`
- [x] Application automatique des offres (pas de sélection manuelle)

**Stratégie d'optimisation des offres :**
- Les bundles utilisent automatiquement les articles les plus chers du panier
- Les offres "X achetés = Y offert" offrent l'article le moins cher
- La fonction SQL calcule la meilleure combinaison d'offres pour maximiser la réduction client

#### Codes Promo (legacy - migré vers /offers)
- [x] Création de codes promo (pourcentage ou montant fixe)
- [x] Validité temporelle (date début/fin)
- [x] Limites d'utilisation (max total, max par client)
- [x] Montant minimum de commande
- [x] Réduction max pour les pourcentages
- [x] Statistiques d'utilisation
- [x] Application côté client au checkout

#### Formules / Deals (legacy - migré vers /offers)
- [x] Création de formules (ex: "3 pizzas = boisson offerte")
- [x] Conditions par catégorie et quantité
- [x] 3 types de récompenses : article offert, réduction %, réduction €
- [x] Application automatique au checkout (pas de code requis)
- [x] Affichage des offres disponibles côté client
- [x] Indicateur de progression ("plus que X articles pour...")
- [x] Statistiques d'utilisation
- [x] Option cumulable avec codes promo

#### Programme de fidélité
- [x] Configuration (activer/désactiver, points par euro, seuil, récompense)
- [x] Crédit automatique des points après commande
- [x] Affichage progression client au checkout (barre de progression)
- [x] Historique des transactions de points

### Interface Client (PWA)

#### Accès
- [x] Pas d'app store : lien direct ou QR code
- [x] Connexion optionnelle (email pour historique)

#### Consultation
- [x] Menu complet avec photos
- [x] Infos foodtruck (description, type cuisine)
- [x] Planning de la semaine (où et quand)
- [x] Carte avec position du jour

#### Commande
- [x] Sélection plats + quantités
- [x] Personnalisation (notes spéciales)
- [x] Choix créneau de retrait (par tranches de 15min)
- [x] Récapitulatif avant confirmation
- [x] Affichage "Montant à régler sur place" (paiement externe)

#### Suivi
- [ ] Confirmation par email
- [x] Statut commande en temps réel
- [x] Historique commandes (si connecté)

---

## 🗄 Base de données Supabase

### Tables

```sql
-- Extension de auth.users
users (
  id UUID PRIMARY KEY REFERENCES auth.users,
  role TEXT CHECK (role IN ('client', 'gestionnaire')),
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Profil foodtruck
foodtrucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  cuisine_types TEXT[],  -- Tableau pour supporter plusieurs types de cuisine
  photo_url TEXT,
  -- Fidélité
  loyalty_enabled BOOLEAN DEFAULT FALSE,
  loyalty_points_per_euro INTEGER DEFAULT 1,
  loyalty_threshold INTEGER DEFAULT 50,
  loyalty_reward INTEGER DEFAULT 500,  -- en centimes (500 = 5€)
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Catégories de plats
categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID REFERENCES foodtrucks(id),
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
)

-- Plats du menu
menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID REFERENCES foodtrucks(id),
  category_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  photo_url TEXT,
  allergens TEXT[],
  is_available BOOLEAN DEFAULT true,
  is_daily_special BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Planning récurrent
schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID REFERENCES foodtrucks(id),
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_active BOOLEAN DEFAULT true
)

-- Exceptions au planning
schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID REFERENCES foodtrucks(id),
  exception_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT true,
  reason TEXT
)

-- Commandes (pré-commandes uniquement, paiements gérés en externe)
orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID REFERENCES foodtrucks(id),
  customer_id UUID REFERENCES users(id),
  customer_email TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  -- Statuts: pending → confirmed → preparing → ready → picked_up/cancelled/no_show
  status TEXT CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'cancelled', 'no_show')) DEFAULT 'pending',
  pickup_time TIMESTAMPTZ NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,  -- Montant à régler sur place
  discount_amount INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Items de commande
order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  menu_item_id UUID REFERENCES menu_items(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  notes TEXT
)

-- Groupes d'options (ex: "Taille", "Suppléments")
option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  is_multiple BOOLEAN DEFAULT FALSE,  -- Taille: false (1 choix) / Suppléments: true (plusieurs)
  display_order INTEGER DEFAULT 0
)

-- Options individuelles (ex: "S", "M", "L")
options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_group_id UUID REFERENCES option_groups(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price_modifier INTEGER DEFAULT 0,  -- En centimes (+200 = +2€)
  is_available BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0
)

-- Options sélectionnées dans les commandes
order_item_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  option_id UUID REFERENCES options(id) ON DELETE SET NULL,
  option_name VARCHAR(100) NOT NULL,      -- Dénormalisé (historique)
  option_group_name VARCHAR(100) NOT NULL,
  price_modifier INTEGER NOT NULL
)

-- Emplacements (liés au planning)
locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID REFERENCES foodtrucks(id),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Clients CRM (créés automatiquement via trigger)
customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID REFERENCES foodtrucks(id),
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  email_opt_in BOOLEAN DEFAULT FALSE,
  sms_opt_in BOOLEAN DEFAULT FALSE,
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  total_orders INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,  -- en centimes
  loyalty_points INTEGER DEFAULT 0,  -- points actuels
  lifetime_points INTEGER DEFAULT 0,  -- total points gagnés (stats)
  UNIQUE(foodtruck_id, email)
)

-- Campagnes marketing
campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID REFERENCES foodtrucks(id),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('manual', 'automated')),
  channel TEXT CHECK (channel IN ('email', 'sms', 'both')),
  status TEXT CHECK (status IN ('draft', 'active', 'completed')),
  targeting JSONB NOT NULL,  -- {"segment": "all|location|inactive|loyal|new", ...}
  email_subject TEXT,
  email_body TEXT,
  sms_body TEXT
)

-- Codes promo
promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID REFERENCES foodtrucks(id),
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL,  -- % ou centimes
  min_order_amount INTEGER DEFAULT 0,
  max_discount INTEGER,
  max_uses INTEGER,
  max_uses_per_customer INTEGER DEFAULT 1,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  current_uses INTEGER DEFAULT 0,
  UNIQUE(foodtruck_id, code)
)

-- Utilisation codes promo
promo_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID REFERENCES promo_codes(id),
  order_id UUID REFERENCES orders(id),
  customer_email TEXT NOT NULL,
  discount_applied INTEGER NOT NULL
)

-- Formules / Deals
deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID REFERENCES foodtrucks(id),
  name TEXT NOT NULL,
  description TEXT,
  trigger_category_id UUID REFERENCES categories(id),
  trigger_quantity INTEGER NOT NULL,
  reward_type TEXT CHECK (reward_type IN ('free_item', 'percentage', 'fixed')),
  reward_item_id UUID REFERENCES menu_items(id),
  reward_value INTEGER,  -- % ou centimes selon reward_type
  stackable BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  times_used INTEGER DEFAULT 0,
  total_discount_given INTEGER DEFAULT 0
)

-- Utilisation formules
deal_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  order_id UUID REFERENCES orders(id),
  customer_email TEXT,
  discount_applied INTEGER NOT NULL,
  free_item_name TEXT
)

-- Transactions fidélité
loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  type TEXT CHECK (type IN ('earn', 'redeem')),
  points INTEGER NOT NULL,  -- positif pour earn, négatif pour redeem
  balance_after INTEGER NOT NULL,
  description TEXT
)

-- ============================================
-- SYSTEME UNIFIE D'OFFRES
-- ============================================

-- Type enum pour les templates d'offre
CREATE TYPE offer_type AS ENUM (
  'bundle',           -- Menu/Formule: plusieurs items à prix fixe
  'buy_x_get_y',      -- X achetés = Y offert
  'promo_code',       -- Code promo classique
  'threshold_discount' -- Remise au palier (dès X euros)
);

-- Table principale des offres
offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID REFERENCES foodtrucks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  offer_type offer_type NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',  -- Configuration flexible selon le type
  is_active BOOLEAN DEFAULT TRUE,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  time_start TIME,
  time_end TIME,
  days_of_week INTEGER[],              -- 0=dimanche, 6=samedi
  max_uses INTEGER,
  max_uses_per_customer INTEGER,
  current_uses INTEGER DEFAULT 0,
  total_discount_given INTEGER DEFAULT 0,
  stackable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Items liés à une offre (pour bundles, buy_x_get_y)
offer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('trigger', 'reward', 'bundle_item')),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Suivi des utilisations
offer_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  customer_email TEXT,
  discount_amount INTEGER NOT NULL,
  free_item_name TEXT,
  used_at TIMESTAMPTZ DEFAULT NOW()
)
```

### Structure config JSONB par type d'offre

| Type | Configuration JSONB |
|------|---------------------|
| `bundle` | `{ fixed_price: 1200 }` |
| `buy_x_get_y` | `{ trigger_quantity: 3, reward_quantity: 1, reward_type: 'free'|'discount', reward_value?: 500 }` |
| `promo_code` | `{ code: 'BIENVENUE', discount_type: 'percentage'|'fixed', discount_value: 10, min_order_amount?: 1500, max_discount?: 1000 }` |
| `threshold_discount` | `{ min_amount: 2500, discount_type: 'percentage'|'fixed', discount_value: 10 }` |

### Row Level Security (RLS)

- `foodtrucks` : lecture publique, écriture par owner
- `menu_items` : lecture publique, écriture par owner du foodtruck
- `orders` : lecture/écriture par customer OU owner du foodtruck
- `schedules` : lecture publique, écriture par owner

---

## 🚀 Fonctionnalités V2 (Post-MVP)

- [x] Programme de fidélité (points par euro, seuil et récompense)
- [ ] Notifications push quand le foodtruck arrive à proximité
- [ ] Intégration météo (suggestions d'annulation)
- [ ] Avis et commentaires clients
- [ ] Export comptable (PDF, intégration compta)
- [ ] Mode hors ligne (PWA)
- [ ] Foodtrucks favoris côté client
- [ ] Filtres avancés (type cuisine, distance, prix, note)
- [ ] Multi-langue

---

## 🔧 Commandes utiles

```bash
# Installation
pnpm install

# Développement
pnpm dev              # Lance client + dashboard
pnpm dev:client       # Lance client seul
pnpm dev:dashboard    # Lance dashboard seul

# Build
pnpm build

# Supabase local
supabase start
supabase db reset     # Reset + migrations
supabase functions serve

# Déploiement
vercel --prod
```

---

## 📝 Conventions de code

- **Composants React** : PascalCase, fichiers `.tsx`
- **Hooks** : préfixe `use`, fichiers dans `hooks/`
- **Types** : dans `packages/shared/src/types/`
- **Styles** : TailwindCSS uniquement, pas de CSS custom
- **State** : React Query pour le server state, Zustand si besoin de client state
- **Formulaires** : React Hook Form + Zod pour validation

---

## ⚠️ Points d'attention

1. **Pas de GPS temps réel en V1** : planning récurrent uniquement
2. **Pas d'app native** : PWA uniquement, accès par lien/QR
3. **NF525** : MonTruck ne gère PAS les paiements (conformité norme caisse enregistreuse). Tous les paiements sont effectués directement sur place auprès du commerçant.
4. **Terminologie** : utiliser "Bon de commande" (pas "Facture"), "Montant à régler" (pas "Total à payer"), "Retirée" (pas "Payé")
5. **RGPD** : opt-in explicite pour emails/SMS marketing
6. **Créneaux retrait** : par tranches de 15 minutes

---

## 📞 Parcours utilisateur

### Gestionnaire (Foodtruck)
1. S'inscrit, choisit son plan (30j gratuits)
2. Configure menu + photos
3. Définit planning hebdomadaire récurrent
4. Partage son lien/QR code (flyer, Instagram)
5. Reçoit commandes en temps réel
6. Valide et prépare selon planning vertical

### Client
1. Scanne QR code ou clique sur lien
2. Voit menu + planning du foodtruck
3. Compose commande + choisit créneau retrait
4. Confirme la pré-commande (montant à régler sur place affiché)
5. Reçoit confirmation email
6. Retire commande à l'heure et paie directement au foodtruck

---

---

## 🔄 Workflows de modification

### Règle d'or
**Après CHAQUE modification, mets à jour ce fichier CLAUDE.md** pour refléter les changements (fonctionnalités cochées, nouvelles tables, etc.)

---

### 1. Ajouter une nouvelle table en base

**Fichiers à modifier :**
1. `supabase/migrations/xxx_nouvelle_table.sql` → créer la migration
2. `packages/shared/src/types/database.ts` → ajouter les types TypeScript
3. `packages/shared/src/types/index.ts` → exporter les nouveaux types
4. `CLAUDE.md` → documenter la table dans la section BDD

**Commandes :**
```bash
supabase migration new nom_de_la_migration
supabase db reset  # Applique toutes les migrations
```

---

### 2. Ajouter un nouveau champ à une table existante

**Fichiers à modifier :**
1. `supabase/migrations/xxx_add_field.sql` → ALTER TABLE
2. `packages/shared/src/types/database.ts` → mettre à jour le type
3. Composants qui utilisent cette table → ajouter le champ
4. `CLAUDE.md` → documenter le changement

---

### 3. Créer une nouvelle page/route

**Dashboard (gestionnaire) :**
1. `packages/dashboard/src/pages/NouvelePage.tsx` → créer la page
2. `packages/dashboard/src/router.tsx` → ajouter la route
3. `packages/dashboard/src/components/Sidebar.tsx` → ajouter le lien navigation
4. `CLAUDE.md` → documenter la fonctionnalité

**Client (PWA) :**
1. `packages/client/src/pages/NouvelePage.tsx` → créer la page
2. `packages/client/src/router.tsx` → ajouter la route
3. `packages/client/src/components/Navigation.tsx` → si besoin, ajouter lien
4. `CLAUDE.md` → documenter la fonctionnalité

---

### 4. Ajouter une nouvelle fonctionnalité complète

**Ordre des modifications :**
1. **BDD** : migration SQL + types TypeScript
2. **Shared** : types, interfaces, helpers partagés
3. **Backend** : Edge Function Supabase si logique serveur nécessaire
4. **Dashboard** : composants + pages gestionnaire
5. **Client** : composants + pages client
6. **CLAUDE.md** : documenter et cocher la fonctionnalité

---

### 5. Modifier le planning/horaires

**Fichiers concernés :**
1. `supabase/migrations/` → si changement structure
2. `packages/shared/src/types/schedules.ts` → types planning
3. `packages/dashboard/src/pages/Schedule.tsx` → édition planning
4. `packages/dashboard/src/components/ScheduleForm.tsx` → formulaire
5. `packages/client/src/components/WeeklySchedule.tsx` → affichage client
6. `packages/client/src/components/Map.tsx` → si impact sur la carte

---

### 6. Ajouter une Edge Function Supabase

**Fichiers à créer/modifier :**
1. `supabase/functions/nom-fonction/index.ts` → créer la fonction
2. `.env` → ajouter les variables nécessaires
3. `packages/shared/src/api/` → helper pour appeler la fonction
4. `CLAUDE.md` → documenter la fonction

**Commandes :**
```bash
supabase functions new nom-fonction
supabase functions serve  # Test local
supabase functions deploy nom-fonction  # Déploiement
```

---

## 🔗 Dépendances entre modules

```
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE                             │
│  (migrations SQL → source de vérité pour la BDD)        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                 PACKAGES/SHARED                          │
│  (types TypeScript → doivent matcher les tables SQL)     │
└─────────────┬───────────────────────────┬───────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   PACKAGES/DASHBOARD    │   │    PACKAGES/CLIENT      │
│   (importe shared)      │   │    (importe shared)     │
└─────────────────────────┘   └─────────────────────────┘
```

**Règle : Toute modification en amont impacte l'aval**
- Modifier SQL → mettre à jour types shared → vérifier dashboard + client
- Modifier shared → vérifier dashboard + client
- Modifier dashboard → aucun impact sur client (et vice-versa)

---

## ✅ Checklist avant commit

- [ ] Les migrations SQL sont créées pour tout changement BDD
- [ ] Les types TypeScript matchent la structure SQL
- [ ] Les composants utilisent les bons types (pas de `any`)
- [ ] Le build passe sans erreur (`pnpm build`)
- [ ] Les nouvelles routes sont protégées si nécessaire (auth)
- [ ] Les RLS Supabase sont configurées pour les nouvelles tables
- [ ] **CLAUDE.md est mis à jour**

---

## 🔒 Backups Base de Données

### Configuration actuelle (Supabase)

**Backups automatiques inclus :**
- **Plan Free** : 0 jours (pas de backup)
- **Plan Pro** : 7 jours de backups quotidiens
- **Plan Team** : 14 jours de backups quotidiens
- **Plan Enterprise** : 30+ jours

### Point-in-Time Recovery (PITR)

Le PITR permet de restaurer la base à n'importe quel instant précis (granularité seconde).

**Activation :**
1. Dashboard Supabase → Project Settings → Add-ons
2. Activer "Point-in-Time Recovery"
3. Coût : ~$100/mois selon volume de WAL

**Recommandé pour production** si le coût est acceptable.

### Backup manuel

```bash
# Via Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d).sql

# Via pg_dump direct (requiert connection string)
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  --clean --if-exists --no-owner --no-acl \
  -f backup_$(date +%Y%m%d).sql

# Backup avec compression
pg_dump "postgresql://..." | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restauration

```bash
# Depuis backup SQL
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  -f backup_XXXXXXXX.sql

# Via Dashboard
# Project Settings → Database → Download backup (derniers 7 jours)
```

### Bonnes pratiques production

1. **Activer PITR** si budget le permet (~$100/mois)
2. **Backup hebdomadaire manuel** stocké en externe (S3, local)
3. **Tester la restauration** sur un projet de test trimestriellement
4. **Sauvegarder les secrets** séparément (variables d'environnement)
5. **Documenter les Edge Functions** (elles ne sont pas dans le backup SQL)

### Script de backup automatisé (optionnel)

Créer un cron job ou GitHub Action pour backup hebdomadaire :

```yaml
# .github/workflows/backup.yml
name: Weekly DB Backup
on:
  schedule:
    - cron: '0 3 * * 0'  # Dimanche 3h du matin
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Install Supabase CLI
        run: npm install -g supabase
      - name: Create backup
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase db dump -f backup_$(date +%Y%m%d).sql
      - name: Upload to S3
        uses: jakejarvis/s3-sync-action@master
        with:
          args: --acl private
        env:
          AWS_S3_BUCKET: ${{ secrets.BACKUP_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          SOURCE_DIR: '.'
```

---

## 📊 Suivi d'avancement

Quand une fonctionnalité est terminée, coche-la dans la section "Fonctionnalités V1" ci-dessus.

Format : `- [ ]` → `- [x]`

---

*Dernière mise à jour : 23 Janvier 2026*

---

## 📈 État actuel du projet

**V1 MVP : 98% complété**

### Fonctionnalités restantes à implémenter :
- [x] Vue planning vertical (créneaux de retrait par tranches de 15min) - Dashboard ✅
- [ ] Confirmation par email (nécessite configuration SMTP)

### Fichiers implémentés :

**Dashboard (packages/dashboard/src/pages/):**
- `Login.tsx`, `Register.tsx` - Authentification
- `Onboarding.tsx` - Création foodtruck
- `Dashboard.tsx` - Stats temps réel
- `Menu.tsx` - CRUD plats + gestion catégories + options/variantes
- `Orders.tsx` - Commandes realtime + prise de commande manuelle
- `Schedule.tsx` - Planning + emplacements
- `Analytics.tsx` - Statistiques avancées avec périodes personnalisables
- `Customers.tsx` - Liste clients, segments, export CSV
- `Campaigns.tsx` - Création et gestion campagnes marketing
- `Settings.tsx` - Profil foodtruck

**Dashboard (packages/dashboard/src/components/):**
- `QuickOrderModal.tsx` - Interface POS pour commandes sur place

**Client PWA (packages/client/src/pages/):**
- `Home.tsx` - Liste foodtrucks
- `Foodtruck.tsx` - Menu + infos + carte
- `Checkout.tsx` - Panier + confirmation pré-commande + opt-in RGPD
- `OrderStatus.tsx` - Suivi commande
- `OrderHistory.tsx` - Historique

**Supabase Edge Functions:**
- `create-order` - Création de pré-commande
- `send-order-confirmation` - Envoi email de confirmation
- `send-campaign` - Envoi campagnes email (Resend) et SMS (Twilio)
- `send-push-notification` - Notifications push au commerçant
- `unsubscribe` - Page de désabonnement RGPD
- `stripe-connect` - Onboarding Stripe (legacy, non utilisé)
