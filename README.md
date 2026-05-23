# OnMange.app

Plateforme SaaS de pré-commande pour food trucks indépendants en France. Les clients consultent le menu via lien direct ou QR code, passent commande pour un créneau de retrait, et règlent directement sur place auprès du commerçant.

**Production** : https://onmange.app

> 💡 OnMange.app ne traite aucun paiement client. Voir `CLAUDE.md` pour le contexte (NF525) et les conséquences techniques.

---

## Stack

React 18 + TypeScript strict + Vite + TailwindCSS · Supabase (Auth / Postgres / Realtime / Storage / Edge Functions) · pnpm workspaces · Vercel · Sentry · Resend · Capacitor (wrapper mobile dashboard) · Vitest + Playwright

## Prérequis

- Node.js ≥ 18
- pnpm ≥ 8
- Supabase CLI

## Quick start

```bash
git clone <repo>
cd foodtruck-saas
pnpm install
supabase start
supabase db reset
pnpm supabase:gen-types
cp .env.example .env  # remplir les variables (voir CLAUDE.md §3)
pnpm dev
```

Le client tourne sur `:5173`, le dashboard sur `:5174`, la landing sur `:5175`.

## Scripts utiles

```bash
pnpm dev              # tous les packages en parallèle
pnpm dev:client       # client uniquement
pnpm dev:dashboard    # dashboard uniquement
pnpm build            # build complet
pnpm lint             # ESLint
pnpm typecheck        # TS
pnpm test             # Vitest (~950 tests)
pnpm test:e2e         # Playwright
```

## Déploiement

Vercel auto-deploy sur push `main`. Migrations Supabase via `supabase db push`. Edge Functions via `supabase functions deploy`.

## Pour aller plus loin

- **`CLAUDE.md`** — contexte produit, conventions internes, workflow Claude Code
- **`BACKLOG.md`** — chantiers en cours et dette tech connue
- `supabase/migrations/` — source de vérité du schéma BDD
