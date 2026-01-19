# FoodTruck SaaS

Plateforme SaaS complète pour la gestion de food trucks avec commande en ligne.

## Architecture

```
foodtruck-saas/
├── packages/
│   ├── client/          # PWA client (React + Vite + TailwindCSS)
│   ├── dashboard/       # Dashboard gestionnaire (React + Vite + TailwindCSS)
│   └── shared/          # Types TypeScript et utilitaires partagés
├── supabase/
│   ├── migrations/      # Migrations SQL
│   └── functions/       # Edge Functions (Stripe, etc.)
├── package.json         # Configuration workspace pnpm
└── pnpm-workspace.yaml
```

## Stack Technique

- **Monorepo** : pnpm workspaces
- **Frontend** : React 18 + TypeScript + Vite + TailwindCSS
- **Backend** : Supabase (Auth, PostgreSQL, Storage, Realtime, Edge Functions)
- **Paiements** : Stripe Connect
- **Hébergement** : Vercel (recommandé)

## Fonctionnalités

### Dashboard Gestionnaire
- Authentification (email/password + magic link)
- Gestion du profil food truck
- CRUD menu (plats, catégories, allergènes)
- Planning récurrent avec emplacements
- Exceptions (vacances, jours fériés)
- Commandes en temps réel avec notifications
- Analytics (CA, commandes, plats populaires)
- Intégration Stripe Connect

### Application Client (PWA)
- Navigation par food truck
- Consultation menu avec photos
- Planning de la semaine
- Carte avec position du jour
- Panier persistant
- Commande avec choix de créneau
- Paiement CB (Stripe) ou sur place
- Suivi commande en temps réel
- Historique commandes

## Installation

### Prérequis

- Node.js >= 18
- pnpm >= 8
- Supabase CLI
- Compte Stripe

### 1. Cloner et installer

```bash
git clone <repo-url>
cd foodtruck-saas
pnpm install
```

### 2. Configuration Supabase

```bash
# Démarrer Supabase local
supabase start

# Appliquer les migrations
supabase db reset

# Générer les types TypeScript
pnpm supabase:gen-types
```

### 3. Configuration des variables d'environnement

Créer les fichiers `.env` dans chaque package :

**packages/client/.env**
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<votre-anon-key>
```

**packages/dashboard/.env**
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<votre-anon-key>
VITE_APP_URL=http://localhost:5173
```

**supabase/.env** (pour les Edge Functions)
```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
CLIENT_URL=http://localhost:5173
DASHBOARD_URL=http://localhost:5174
```

### 4. Lancer en développement

```bash
# Tous les packages en parallèle
pnpm dev

# Ou séparément
pnpm dev:client      # Port 5173
pnpm dev:dashboard   # Port 5174
```

## Configuration Stripe

### 1. Créer un compte Stripe

1. Aller sur [Stripe Dashboard](https://dashboard.stripe.com)
2. Activer Stripe Connect
3. Récupérer les clés API (test mode)

### 2. Configurer le webhook

```bash
# Local avec Stripe CLI
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

### 3. Variables d'environnement Supabase

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Déploiement

### Vercel

1. Connecter le repo GitHub
2. Configurer deux projets :
   - Client : `packages/client`
   - Dashboard : `packages/dashboard`
3. Ajouter les variables d'environnement

### Supabase Production

1. Créer un projet sur [Supabase](https://supabase.com)
2. Lier le projet local :
   ```bash
   supabase link --project-ref <project-id>
   ```
3. Déployer les migrations :
   ```bash
   supabase db push
   ```
4. Déployer les Edge Functions :
   ```bash
   supabase functions deploy
   ```

## Scripts disponibles

```bash
pnpm dev              # Lancer tous les packages en dev
pnpm build            # Build tous les packages
pnpm lint             # Linter tous les packages
pnpm typecheck        # Vérifier les types
pnpm format           # Formater le code

pnpm supabase:start   # Démarrer Supabase local
pnpm supabase:stop    # Arrêter Supabase local
pnpm supabase:reset   # Reset la base de données
pnpm supabase:gen-types # Générer les types TypeScript
```

## Structure de la base de données

### Tables principales

- **foodtrucks** : Profils des food trucks
- **categories** : Catégories du menu
- **menu_items** : Plats du menu
- **locations** : Emplacements
- **schedules** : Planning récurrent
- **schedule_exceptions** : Exceptions au planning
- **orders** : Commandes
- **order_items** : Articles des commandes

### Row Level Security (RLS)

Toutes les tables ont des politiques RLS :
- Les food trucks publics sont visibles par tous
- Les propriétaires peuvent gérer leurs propres données
- Les clients peuvent voir leurs commandes

## API Edge Functions

### POST /functions/v1/stripe-connect
Crée ou récupère un lien d'onboarding Stripe Connect.

### POST /functions/v1/create-checkout
Crée une session Stripe Checkout pour une commande.

### POST /functions/v1/create-cash-order
Crée une commande avec paiement sur place.

### POST /functions/v1/stripe-webhook
Gère les webhooks Stripe (paiement réussi, échoué, etc.)

## Licence

MIT
