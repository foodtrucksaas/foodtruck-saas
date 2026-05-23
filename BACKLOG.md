# BACKLOG.md — OnMange.app

> Liste vivante des chantiers identifiés. Mise à jour : 24 mai 2026.
>
> Remplace l'ancien `AUDIT.md` (audit du 2 mars 2026), dont les items non encore traités sont repris ici, enrichis des nouveaux constats post-pivot Stripe.
>
> Codes : 🚨 bloquant business · 🔒 sécurité · 🧹 cleanup · 🎨 UX · ⚡ perf · 🛠️ qualité · 📊 tests · ✨ polish

---

## 🚨 Milestone "Premier client payant"

**C'est le seul bloc qui empêche aujourd'hui d'avoir des revenus.** Tout le reste est secondaire tant que ce bloc n'est pas livré.

- [ ] **Page pricing publique** sur la landing avec les 3 plans (Basic 29 / Pro 49 / Premium 79 €/mois) + call-to-action
- [ ] **Intégration Stripe Billing** (subscriptions pour _le SaaS_, rien à voir avec NF525) — webhooks `customer.subscription.*`, page `/billing` côté dashboard, gate des features Pro/Premium selon plan
- [ ] **Trial / freemium clarifié** : 14 j d'essai sans CB ? Plan gratuit limité ? À trancher avant d'écrire la première ligne de billing
- [ ] **Cleanup Stripe Connect legacy** (voir 🧹) — à faire AVANT d'introduire Stripe Billing pour pas confondre les deux SDK Stripe
- [ ] **Admin panel minimal** : liste des food trucks, plan actif, statut abonnement, capacité d'override manuel (geste commercial, debug)

Effort estimé : 1 à 2 semaines de Claude Code après spécification détaillée dans une session de chat dédiée.

---

## 🔒 Sécurité — priorité 1

Tirés de l'audit de mars, statuts à vérifier dans le code actuel avant d'attaquer.

- [x] **`orders` INSERT `WITH CHECK (true)`** — corrigé : policy restreinte à `service_role` (migration `20260523000001`), total recalculé server-side dans `create-order`
- [x] **`increment_offer_uses` SECURITY DEFINER accessible anon** — corrigé : `REVOKE EXECUTE FROM anon` (migration `20260523000001`)
- [x] **`get_dashboard_stats` / `get_analytics` SECURITY DEFINER sans ownership check** — corrigé : guard `auth.uid()` ajouté dans le corps des fonctions + `REVOKE` anon/public (migrations `20260523000001` + `20260524000001`)
- [x] **`offer_uses` INSERT `WITH CHECK (true)`** — corrigé : toutes les policies INSERT supprimées, seul `service_role` (Edge Function) peut insérer (migration `20260524000002`)
- [x] **Source maps en production** — corrigé : `sourcemap: 'hidden'` dans les 2 vite.config.ts (client + dashboard)
- [ ] **CSP hardening** — retirer `unsafe-inline` et `unsafe-eval` de `script-src` en build prod (nonces ou hashes)
  > _Chantier à part : vérifier d'abord que le build Vite prod n'a pas besoin de unsafe-eval, sinon basculer sur des nonces ou hashes._
- [x] **Validation password harmonisée** — corrigé : validateur `isValidPassword()` dans `shared/utils/validators.ts`, appliqué sur Register, ResetPassword et Settings/AccountSection (8 chars + lettre + chiffre)
- [x] **DELETE policy trompeuse sur `orders`** — corrigé : policy supprimée, le trigger `prevent_order_deletion` reste la seule garde (migration `20260524000003`)
- [x] **Module-level audio state leak** — corrigé : `sharedAudioContext` et `audioUnlocked` sont reset au changement de foodtruck dans `OrderNotificationContext`

---

## 🧹 Cleanup

- [ ] **Stripe Connect legacy** — supprimer :
  - `supabase/functions/stripe-connect/`
  - `supabase/functions/_shared/stripe.ts`
  - les refs Stripe dans `_shared/orders.ts`
  - les types Stripe dans `shared/src/types/api.ts`
  - la mention dans l'ancien README (déjà fait dans le nouveau)
  - la var `VITE_STRIPE_PUBLISHABLE_KEY` dans `.env.example`
- [ ] **`as any` dans `useOffers.ts` (10) et `offers.ts` API (7)** — typer correctement, en parallèle de la régénération des types DB
- [ ] **Duplication offers** — `useOffers.ts` (dashboard) tape directement Supabase au lieu de passer par `shared/api/offers.ts`. Migrer pour respecter la convention
- [ ] **Tables legacy `promo_codes`, `deals`, `promo_code_uses`, `deal_uses`** — dépréciées en migration mais existent encore. Vérifier qu'aucun code ne les lit, dumper les données, puis migration de DROP
- [ ] **Régénérer `database.types.ts`** — drift identifié en mars (`order_modifications` absent, `Constants` drift)
- [ ] **Fusionner les 3 `OptimizedImage`** dans `shared`
- [ ] **Fusionner les 2 `ErrorBoundary`** dans `shared`
- [ ] **Migrer hooks dashboard vers la couche `shared/api`** — supprimer tous les appels Supabase directs depuis les pages
- [ ] **Remplacer `console.error` silencieux** par `toast.error()` dans les hooks dashboard
- [ ] **Remplacer `window.confirm()`** par `useConfirmDialog` partout
- [ ] **Vérifier fichiers potentiellement inutilisés** : `client/components/ApiError.tsx`, `client/components/Skeleton.tsx`, `dashboard/components/Skeleton.tsx`
- [ ] **`import.meta.env` dans `shared/components/ErrorBoundary.tsx:114`** — couplage à Vite dans un package censé être runtime-agnostic. Risque : si la landing (config Vite différente) importe ce composant, ça pète. Refactor en injection (prop ou contexte) plutôt que lecture directe d'env. Détecté pendant le typecheck de la session sécurité du 23 mai 2026, pré-existant.

---

## 🎨 UX critique

- [ ] **Route 404 client** — page blanche actuellement
- [ ] **`Home.tsx`** — liens via slug, pas UUID
- [ ] **"Recommander"** dans l'historique commande — restaurer les options items
- [ ] **Liens légaux** dans Register — URLs absolues vers landing
- [ ] **Lien dashboard** sur la landing page
- [ ] **Bouton retour client** — pointer vers la page food truck, pas vers `/`

---

## ⚡ Performance

- [ ] **`get_available_slots`** — boucle N+1 SQL (jusqu'à 48 queries par checkout). Réécrire en CTE unique
- [ ] **`useCustomers`** — charge tous les clients en mémoire et pagine en JS. Crash potentiel >1000 clients. Pagination DB
- [ ] **`FoodtruckContext`** — re-fetch à chaque changement de l'objet `user` (token refresh ~5 min). Dépendre de `user?.id`
- [ ] **`reorderCategories`** — N requêtes `UPDATE` parallèles. Remplacer par un seul `upsert`
- [ ] **Index manquants** : `orders.customer_email`, composite `status + foodtruck_id`
- [ ] **`select('*')` partout (30+ endroits)** — passer aux colonnes explicites sur les requêtes hot

---

## 🛠️ Qualité code

- [ ] **God components** identifiés dans l'audit de mars — redécouper (cible : <300 lignes par composant)
- [ ] **Service layer** — finir la migration des hooks dashboard pour qu'aucun ne fasse d'appel Supabase direct

---

## 📊 Tests

- [ ] **`data-testid`** sur les éléments interactifs clés (fiabiliser les E2E)
- [ ] **Réécrire les E2E** pour supprimer les assertions conditionnelles
- [ ] **Tests manquants** : `Checkout.tsx`, `OnboardingAssistant`, `useDashboard`
- [ ] **Tests Edge Functions** — couverture minimale via `tests/integration/`

---

## ✨ Polish

- [ ] **`srcset` responsive** dans `OptimizedImage`
- [ ] **React Query** pour le cache côté dashboard (à évaluer — pas urgent, éviterait les re-fetch sur navigation)
- [ ] **OAuth Google / Apple** — qualité de vie inscription
- [ ] **Migrations consolidation** — 109 migrations dont plusieurs correctives en série (5x `fix_analytics_*`). Optionnel : squash en une migration baseline. Pas urgent
- [ ] **Twilio + APNs en prod** — le code est complet, manque juste l'activation et les secrets

---

## ✅ Items considérés faits depuis l'audit de mars

(À cocher / décocher après vérification rapide du code lors d'une prochaine session)

- [x] **CSP headers** présents dans `vercel.json` (hardening à finir — voir 🔒)
- [x] **Onboarding wizard** finalisé
- [x] **Système d'offres unifié** en production, remplace les 3 systèmes legacy
- [x] **Notifications 4 couches** (Realtime + polling + `VisibilityChange` + `WindowFocus`)
- [x] **Sentry configuré** avec `maskAllText`, `blockAllMedia`, nettoyage emails dans `beforeSend`

---

_Ce fichier est conçu pour être mis à jour à chaque session. Quand un item est traité, le cocher ; quand un nouveau bug ou chantier est identifié, l'ajouter dans la bonne section. Le coup d'œil sur la première section (🚨) doit toujours rappeler où va l'énergie en priorité._
