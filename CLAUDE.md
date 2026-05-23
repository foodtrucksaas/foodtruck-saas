# CLAUDE.md — Brief opérationnel OnMange.app

> Doc de référence pour les sessions Claude Code et l'onboarding de tout collaborateur sur le code.
> **Dernière mise à jour : 23 mai 2026**

---

## 1. Produit

**OnMange.app** est un SaaS de pré-commande pour food trucks indépendants en France. Les clients accèdent à la page du food truck via lien direct ou QR code (pas d'app store côté client), consultent le menu, passent commande pour un créneau de retrait, et règlent sur place auprès du commerçant.

- **Cible** : food trucks indépendants français
- **Modèle économique** : abonnement mensuel `29 € Basic / 49 € Pro / 79 € Premium`
- **Production** : https://onmange.app

### ⚠️ Contrainte structurante : aucun paiement client en ligne

OnMange.app **ne touche jamais à un paiement client**. La transaction monétaire se fait entièrement sur place entre le client et le food truck. Conséquences techniques :

- Aucune intégration Stripe Connect / Checkout côté client final
- Aucun calcul fiscal, aucune émission de ticket de caisse
- Le SaaS n'est **pas concerné par la NF525** (norme française des logiciels de caisse) — c'est un outil de pré-commande, pas un encaisseur
- Le `total_amount` sur les commandes est indicatif

**Pour les futurs développeurs et pour Claude Code :** ne JAMAIS proposer une intégration de paiement client sans remettre en question ce choix avec le mainteneur — c'est un choix de modèle, pas un oubli.

**À distinguer** : l'abonnement _du food truck à OnMange_ (29/49/79 €/mois) passera par Stripe Billing classique. Ça **ne relève pas de la NF525** (vente d'un logiciel, pas vente pour le compte d'un tiers). Cette infra n'existe pas encore — voir `BACKLOG.md` → Milestone "Premier client payant".

---

## 2. Architecture

```
SUPABASE (Postgres + Auth + Realtime + Storage + Edge Functions)
         │
         ▼
@foodtruck/shared (sources directes, pas de build)
   │           │           │
   ▼           ▼           ▼
dashboard    client      landing
(pro.       (*.         (onmange.app)
 onmange.    onmange.
 app)        app)
```

### Subdomain-based routing client

Le client PWA détermine le food truck via le hostname : `pizza-bob.onmange.app` → slug `pizza-bob`. Fallback path-based en local : `/pizza-bob/menu`. Sous-domaines réservés : `www`, `app`, `dashboard`, `pro`.

### Notifications commandes — 4 couches

Sur le dashboard, robustesse > élégance : Realtime Supabase + polling 30 s + `VisibilityChange` + `WindowFocus`. Les food truckers laissent souvent l'onglet en arrière-plan.

---

## 3. Stack

| Couche     | Tech                                                              |
| ---------- | ----------------------------------------------------------------- |
| Monorepo   | pnpm 8.12 workspaces                                              |
| Frontend   | React 18 + TypeScript strict + Vite 5 + TailwindCSS 3             |
| Backend    | Supabase (Auth, Postgres, Realtime, Storage, Edge Functions Deno) |
| Mobile     | Capacitor (dashboard uniquement, iOS + Android)                   |
| Email      | Resend                                                            |
| SMS        | Twilio (code-complete, pas actif en prod)                         |
| Push       | APNs (code-complete, pas actif en prod)                           |
| Maps       | Leaflet (client) + Google Places API (geocoding dashboard)        |
| Monitoring | Sentry (conditionnel via `VITE_SENTRY_DSN`)                       |
| Tests      | Vitest + @testing-library/react + Playwright                      |
| Hosting    | Vercel (Build Output API v3)                                      |

### Variables d'environnement

**Frontend** (`import.meta.env`) : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN` (optionnel), `VITE_APP_URL` (dashboard), `VITE_CLIENT_URL` (dashboard), `VITE_GOOGLE_MAPS_API_KEY` (dashboard).

**Edge Functions** (`Deno.env`) : `RESEND_API_KEY`, `RESEND_DOMAIN`, `GOOGLE_MAPS_API_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_BASE64`, `APNS_PRODUCTION`, `DASHBOARD_URL`, `ALLOWED_ORIGINS` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` sont auto-injectés).

---

## 4. Structure

```
foodtruck-saas/
├── packages/
│   ├── shared/      Types, API factory, utils, composants UI
│   ├── dashboard/   App gestionnaire (web + Capacitor)
│   ├── client/      PWA commande client
│   └── landing/     Landing marketing (standalone, pas de Supabase)
├── supabase/
│   ├── migrations/  ~110 fichiers SQL (source de vérité BDD)
│   └── functions/   10 Edge Functions Deno + _shared
├── scripts/         combine-dist, validate-vercel-config, og-render
├── e2e/             Specs Playwright (client + dashboard)
└── tests/integration/  Tests d'intégration DB réelle
```

### Le pattern `shared`

`@foodtruck/shared` est consommé en sources directes (pas de build intermédiaire). Il expose une factory `createApi(supabase)` qui rend des sous-APIs typées (`menu`, `orders`, `offers`, `schedules`, etc.). **Toujours passer par cette API depuis les hooks** plutôt que d'appeler Supabase directement. La duplication actuelle sur `useOffers.ts` (dashboard) est de la dette à corriger, pas un modèle à reproduire — voir `BACKLOG.md`.

---

## 5. Conventions critiques

1. **Argent en CENTIMES (INTEGER) par défaut**. Seul `orders.total_amount` est en DECIMAL pour raisons historiques. Voir `formatters.ts` pour l'affichage. `800` = 8 €. **Jamais de float pour de la monnaie.**

2. **Slugs pour les URLs publiques**, jamais d'UUID. Le slug du food truck est unique et sert au routing sous-domaine + aux liens partageables.

3. **RLS activée sur toutes les tables**, sans exception, dès la migration. `service_role` uniquement dans les Edge Functions, jamais dans les packages frontend.

4. **Immutabilité des commandes** : `orders` a `FORCE ROW LEVEL SECURITY` + triggers `prevent_order_deletion`. On ne modifie jamais une commande directement — on insère dans `order_modifications` pour tracer.

5. **TypeScript strict, zéro `any`**. Si exceptionnellement nécessaire, commenter pourquoi. Les `as any` actuels dans `useOffers.ts` et `offers.ts` sont de la dette à rembourser, pas un modèle.

6. **Tests colocated** (`*.test.ts(x)` à côté du fichier source). Vitest pour unit/hooks, Playwright pour les E2E.

7. **Toujours passer par la couche `shared/api`** depuis les hooks, pas d'appel Supabase direct depuis les pages.

8. **Ce fichier (`CLAUDE.md`) est mis à jour** quand une convention change ou qu'une décision de modèle est prise.

---

## 6. Workflow ajout de feature

Ordre fixe pour éviter les drift de types :

1. **BDD** — migration SQL dans `supabase/migrations/` avec RLS dès le départ
2. **Types** — `pnpm supabase:gen-types` puis vérifier `shared/src/types/`
3. **API shared** — étendre la factory dans `shared/src/api/<domaine>.ts`
4. **Edge Function** si logique serveur (validation, calculs sensibles, intégrations tierces)
5. **Dashboard** — page + hook qui consomme l'API shared
6. **Client** — page + hook qui consomme l'API shared
7. **Tests** colocated
8. **`CLAUDE.md` / `BACKLOG.md`** si nouvelle convention ou nouvelle dette identifiée

---

## 7. Checklist avant commit

- [ ] Migration créée pour tout changement BDD, **RLS incluse**
- [ ] Types regénérés (`pnpm supabase:gen-types`)
- [ ] Hooks passent par la couche `shared/api`, pas d'appel Supabase direct (sauf dans la couche API elle-même)
- [ ] Pas de `any`, pas de `console.log` dans le frontend
- [ ] Argent en centimes vérifié
- [ ] Build passe (`pnpm build`)
- [ ] Tests passent (`pnpm test`)
- [ ] Routes auth-protégées si applicable
- [ ] `CLAUDE.md` à jour si convention modifiée

---

## 8. Edge Functions

| Fonction                  | Rôle                                                 |
| ------------------------- | ---------------------------------------------------- |
| `create-order`            | Création pré-commande (validation, offres, fidélité) |
| `send-order-confirmation` | Email confirmation via Resend                        |
| `send-order-reminders`    | Rappels email avant retrait (cron)                   |
| `send-campaign`           | Campagnes email + SMS                                |
| `send-push-notification`  | Push commerçant via APNs                             |
| `unsubscribe`             | Désabonnement RGPD                                   |
| `google-places`           | Autocomplete adresses (proxy server-side)            |
| `delete-account`          | Suppression compte RGPD                              |
| `seed-demo`               | Données de démo                                      |
| `create-checkout-session` | Crée une Checkout Session Stripe Billing             |
| `create-portal-session`   | Crée une session Customer Portal Stripe              |
| `stripe-webhook`          | Reçoit les events Stripe (subscription lifecycle)    |

---

## 9. État actuel

- **MVP** considéré complet et en production sur https://onmange.app
- **950 tests unitaires** passent (shared 301, client 213, dashboard 436)
- **0 client payant** à ce jour — le blocker n'est pas le produit, c'est l'absence d'infra de billing pour l'abonnement food truck (voir `BACKLOG.md` → Milestone "Premier client payant")

---

## 10. Références

- `README.md` — installation et scripts
- `BACKLOG.md` — chantiers actifs et dette tech connue
- `supabase/migrations/` — schéma BDD source de vérité
- `e2e/` — tests E2E (et exemples de parcours utilisateur)
