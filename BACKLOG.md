# BACKLOG.md — OnMange.app

> Liste vivante des chantiers identifiés. Mise à jour : 23 mai 2026.
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

- [ ] **`orders` INSERT `WITH CHECK (true)`** — n'importe qui peut créer une commande avec un `total_amount` arbitraire. Valider le total côté serveur dans l'Edge Function `create-order` (recalcul depuis les `order_items`)
- [ ] **`increment_offer_uses` SECURITY DEFINER accessible anon** — DoS possible sur les compteurs. Retirer le `GRANT EXECUTE TO anon`
- [ ] **`get_dashboard_stats` / `get_analytics` SECURITY DEFINER sans ownership check** — fuite cross-tenant via UUID deviné. Ajouter un guard `WHERE foodtruck_id = ...` croisé avec `auth.uid()`
- [ ] **`offer_uses` INSERT `WITH CHECK (true)`** — tout user authentifié peut inscrire un usage sur n'importe quelle offre. Restreindre au `service_role`
- [ ] **Source maps en production** — vérifier `vite.config.ts` des 3 packages et passer `sourcemap: 'hidden'` si encore exposé
- [ ] **CSP hardening** — retirer `unsafe-inline` et `unsafe-eval` de `script-src` en build prod (nonces ou hashes)
- [ ] **Validation password harmonisée** — 8 chars + complexité sur tous les entry points (Register, ResetPassword, mobile)

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
