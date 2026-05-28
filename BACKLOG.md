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
- [ ] **Intégration Stripe Billing** (subscriptions pour _le SaaS_, rien à voir avec NF525)
  - [x] Migration `subscriptions` + `admins` + `admin_actions` + `stripe_webhook_events` (migration `20260524000005`)
  - [x] Edge Functions `create-checkout-session`, `create-portal-session`, `stripe-webhook`
  - [x] `_shared/stripe.ts` (SDK init, getOrCreateCustomer, verifyWebhookSignature)
  - [x] Couche `shared/api/billing.ts` + `shared/types/billing.ts`
  - [x] Page `/billing` côté dashboard (Phase 1.2) — trialing/active/past_due/degraded states + post-checkout toasts
  - [ ] Gate des features selon plan
- [x] **Trial / freemium clarifié** : 14 j d'essai sans CB, trigger auto sur création foodtruck, `get_access_state()` pour dériver l'accès
- [x] **Phase 2 — Trial flow** : `SubscriptionContext` (fetch + polling 60s + focus/visibility), `TrialBanner` (4 urgency levels, dismissible sauf J-1/J-0, CTA carte bancaire), email reminders J-7/J-3/J-1 (Edge Function `send-trial-reminders` + Resend), trial expiration cron (`expire-trials`, toutes les heures), migrations `20260526000003` (reminder columns) + `20260526000004` (pg_cron jobs). 20 tests.
- [x] **Phase 3 — Degraded mode** : `useCanWrite` hook disable tous les boutons d'écriture dashboard (8 pages), `DegradedModeBanner`, `SubscriptionGuard`. Fix post-deploy : la page client publique ignorait le mode dégradé (RLS bloquait les anon) → RPC SECURITY DEFINER `get_foodtruck_access_state` (migration `20260528000001`), 7 tests d'intégration.
- [x] **Phase 4 — Landing pricing** : aligné landing sur décisions billing — trial 14j (was 30j), prix 29€ HT/mois + TTC en sous-texte, suppression promo lancement / "membre fondateur", FAQ enrichie (fin de trial, annulation, données, TVA/micro-entrepreneur, commission), CTAs → `pro.onmange.app/register`, suppression waitlist form Hero.
- [x] **Cleanup Stripe Connect legacy** — supprimé : `stripe-connect/`, `_shared/stripe.ts`, `requireStripe` dans `orders.ts`, `StripeConnectResponse` dans `api.ts`, vars `.env.example`, type `vite-env.d.ts`, migration `20260524000004` pour DROP colonnes DB
- [ ] **Admin panel minimal** : liste des food trucks, plan actif, statut abonnement, capacité d'override manuel (geste commercial, debug)

Effort estimé : 1 à 2 semaines de Claude Code après spécification détaillée dans une session de chat dédiée.

---

## 📦 Système d'offres

> _Audit complet : voir `docs/analysis/offers-system.md` (26 mai 2026)._
>
> _Verdict : design correct, exigences métier respectées, mais grosse fragilité implémentation (20 migrations, 12 bugs patchés, 0 test SQL d'intégration). Plan d'action priorisé ci-dessous, dans l'ordre. Ne PAS réécrire le système, juste mettre le filet de sécurité et itérer._

- [x] **Étape 1 (priorité 1) — Suite de tests d'intégration SQL.** Fixtures sur `get_optimized_offers`, `calculate_fair_buy_x_get_y_discount`, `calculate_fair_bundle_discount`. Couverture : panier vide, un seul bundle, bundles concurrents (force la dual-strategy à départager), buy_x_get_y avec reste à skipper, combinaison mixte bundle+BxGy, promo_code + offre auto cumulés, edge case discount négatif, expire_date passée, day_of_week non match, max_uses atteint, etc. Vise 30+ cas. **Prérequis bloquant à TOUS les autres items ci-dessous.**

  > ✅ Fait le 26 mai 2026 : 36 tests, 36 passing, 1 bug découvert (voir ci-dessous). Fichiers : `tests/integration/offers/setup.ts` + `tests/integration/offers/get-optimized-offers.test.ts`.

- [x] **Étape 2 — Cap de sécurité métier.** Ajouter colonne `max_discount_percent_per_order` sur `foodtrucks` (défaut 50%), la respecter dans `get_optimized_offers`. Petite migration, gros gain de sécurité contre accidents de config (foodtruck qui empile par erreur 5 offres concurrentes et donne 90% de remise).

  > ✅ Fait le 26 mai 2026 : migration `20260526000002`, cap enforced dans SQL (scaling proportionnel) + `validateAppliedOffers` (Edge Function). 5 tests de non-régression ajoutés (43 tests total).

- [x] **Étape 3 — Migrer le dual code path.** `packages/dashboard/src/pages/Offers/useOffers.ts` (633 lignes) doit passer par `shared/api/offers.ts` au lieu d'appels Supabase directs. **Prérequis : Étape 1 (tests SQL) en place pour détecter les régressions.** (Cet item était déjà listé dans 🧹 Cleanup, gardé là-bas aussi, mais référencé ici.)

  > ✅ Fait le 26 mai 2026 : 10 appels Supabase directs migrés vers `api.offers.*` et `api.menu.*`. 11 `as any` supprimés (1 reste : `config as unknown as Record<string, unknown>` pour le parsing JSONB). 3 méthodes ajoutées au shared API (`reorder`, `getCategoriesWithOptionGroups`, `getAvailableItems`). Tests adaptés aux mocks API (454 dashboard tests passent).

- [ ] **Étape 4 — Tuer les 18 `as any`.** Régénérer `database.types.ts`, fixer les 11 `as any` dans `dashboard/Offers/useOffers.ts` + 7 dans `shared/api/offers.ts`. **Prérequis : Étape 1.** (Idem, déjà listé dans 🧹 Cleanup, gardé là-bas aussi.)

- [ ] **Étape 5 — Failles sécurité identifiées lors de l'audit** :
  - Pas de rate-limiting sur `create-order` → un attaquant peut brute-forcer un code promo (essayer `WELCOME2026`, `OUVERTURE`, etc. en boucle). Ajouter un rate limit par IP, ou au minimum sur les requêtes contenant un promo_code.
  - `customer_email` non vérifié pour `max_uses_per_customer` → contournable via changement d'email. Pour les offres avec `max_uses_per_customer > 0`, exiger un compte authentifié ou vérifier l'email par lien magique avant application.
  - Ces 2 sous-items sont aussi listés dans 🔒 Sécurité ci-dessous.

- [x] **Bug découvert #1 — `days_of_week` jamais filtré nulle part.** Fixé le 26 mai 2026 : migration `20260526000001_filter_offers_by_day_of_week.sql` + check dans `validateAppliedOffers`. Utilise `Europe/Paris` timezone. Nouveau paramètre `p_check_date` pour testabilité. 3 tests de non-régression ajoutés.

---

## 🔒 Sécurité — priorité 1

Tirés de l'audit de mars, statuts à vérifier dans le code actuel avant d'attaquer.

- [x] **`orders` INSERT `WITH CHECK (true)`** — corrigé : policy restreinte à `service_role` (migration `20260523000001`), total recalculé server-side dans `create-order`
- [x] **`increment_offer_uses` SECURITY DEFINER accessible anon** — corrigé : `REVOKE EXECUTE FROM anon` (migration `20260523000001`)
- [x] **`get_dashboard_stats` / `get_analytics` SECURITY DEFINER sans ownership check** — corrigé : guard `auth.uid()` ajouté dans le corps des fonctions + `REVOKE` anon/public (migrations `20260523000001` + `20260524000001`)
- [x] **`offer_uses` INSERT `WITH CHECK (true)`** — corrigé : toutes les policies INSERT supprimées, seul `service_role` (Edge Function) peut insérer (migration `20260524000002`)
- [x] **Source maps en production** — corrigé : `sourcemap: 'hidden'` dans les 2 vite.config.ts (client + dashboard)
- [ ] **[Offres] Rate-limiting sur `create-order`** — anti brute-force de promo_codes. Voir 📦 Système d'offres étape 5.
- [ ] **[Offres] Vérification email pour `max_uses_per_customer`** — empêcher le contournement par changement d'email. Voir 📦 Système d'offres étape 5.
- [ ] **CSP hardening** — retirer `unsafe-inline` et `unsafe-eval` de `script-src` en build prod (nonces ou hashes)
  > _Chantier à part : vérifier d'abord que le build Vite prod n'a pas besoin de unsafe-eval, sinon basculer sur des nonces ou hashes._
- [x] **Validation password harmonisée** — corrigé : validateur `isValidPassword()` dans `shared/utils/validators.ts`, appliqué sur Register, ResetPassword et Settings/AccountSection (8 chars + lettre + chiffre)
- [x] **DELETE policy trompeuse sur `orders`** — corrigé : policy supprimée, le trigger `prevent_order_deletion` reste la seule garde (migration `20260524000003`)
- [x] **Module-level audio state leak** — corrigé : `sharedAudioContext` et `audioUnlocked` sont reset au changement de foodtruck dans `OrderNotificationContext`

---

## 🧹 Cleanup

- [x] **Stripe Connect legacy** — supprimé (migration `20260524000004` + code cleanup)
- [ ] **`as any` dans `offers.ts` API (7)** — typer correctement, en parallèle de la régénération des types DB. Les 11 `as any` de `useOffers.ts` ont été supprimés (1 `as unknown as` reste pour parsing config JSONB).
- [x] **Duplication offers** — `useOffers.ts` (dashboard) tape directement Supabase au lieu de passer par `shared/api/offers.ts`. Migré le 26 mai 2026.
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

## 🎨 UX redesign dashboard

> _Analyse complète : voir `docs/analysis/dashboard-ux.md` (28 mai 2026)._

### Chantier 1 — Quick wins naming & IA (fait le 28 mai 2026)

- [x] **Sidebar "Menus & Offres" → "Offres"** — le mot "Menus" était un faux ami avec la page Carte
- [x] **Son global dans le header Layout** — le toggle son était enterré dans la page Commandes, maintenant visible partout (mobile + desktop), persisté en localStorage
- [x] **Paramètres commandes → modale dans la page Commandes** — bouton ⚙️ dans le toolbar, ouvre une modale avec les réglages (mode acceptation, popup, créneaux, etc.)
- [x] **Paramètres offres → modale dans la page Offres** — idem, bouton ⚙️ dans le header
- [x] **Allégement page Paramètres** — sections Commandes et Offres retirées (déplacées vers leurs pages respectives), reste 10 sections

### Chantier 2 — Refonte options article-level

- [x] **Sous-étape 2.1 — Backend BDD** : nouvelles tables `menu_item_option_groups`, `menu_item_options`, `option_templates` + migration des données depuis category-level (overrides prix + désactivations préservés). 61 groups, 157 options migrés. RLS conforme. 6 tests d'intégration.
- [x] **Sous-étape 2.2 — Refonte UI Menu options article-level (dashboard).** Migration `price_mode` (absolute/modifier) sur `menu_item_option_groups` avec recalcul depuis sources. InlineOptionsEditor avec 3 presets (taille/choix obligatoire/suppléments), max 1 groupe absolu par plat, import/save templates. MenuItemForm simplifié (668→145 lignes), useMenuPage nettoyé (702→320 lignes). OptionsWizard et CategoryOptionsModal dépréciés. 487 tests dashboard, 5 tests intégration price-mode. Commit `82793fa` (migration) + à committer (UI).
- [x] **Sous-étape 2.3 — Bascule client + create-order** : client public et Edge Function `create-order` lisent `menu_item_option_groups`/`menu_item_options` avec `price_mode` au lieu de `category_option_groups`. Pricing partagé via `computeMenuItemPrice` / `computeCartItemUnitPrice`. "À partir de X€" affiche le cheapest absolute. `isSizeOption` remplacé par `priceMode` (backward-compat localStorage). Dead components supprimés (OptionsWizard, CategoryOptionsModal). 1050 tests passent.
- [x] **Garde-fou anti-drift pricing** : commentaires de liaison croisée entre `packages/shared/src/utils/pricing.ts` et `supabase/functions/_shared/orders.ts`. Test d'intégration `tests/integration/pricing-coherence.test.ts` (13 tests, 7 combos) valide que `computeMenuItemPrice`, `computeCartItemUnitPrice` (client) et `computeUnitPrice` (serveur) produisent exactement le même prix. Teste aussi le rejet par create-order en cas de drift (5 cas de prix faux).
- [ ] **Sous-étape 2.4 — Nettoyage** : supprimer les anciennes tables `category_option_groups`/`category_options`, les champs legacy `option_prices`/`disabled_options` sur `menu_items`, et le fallback `isSizeOption` côté client. Retirer les méthodes `@deprecated` de shared/api/menu.ts.

### Refonte wizard offres (fait le 28 mai 2026)

- [x] **Skeleton commun step 2** : nom → notes internes repliables → config → info block → recap → options avancées → erreurs → boutons
- [x] **Bandeau recap dynamique** : `OfferRecapBanner` vert avec texte contextuel par type (bundle, buy_x_get_y, promo_code, threshold_discount)
- [x] **Liste d'erreurs de validation** : `OfferValidationErrors` en rouge, séparée du recap
- [x] **Bloc "Comment ça marche"** : `OfferInfoBlock` gris avec explication par type
- [x] **Vocabulaire unifié** : "€ offerts" → "€ de réduction", "Description" → "Notes internes (vous seul les voyez)", tooltips sur Minimum commande / Réduction max / Suppléments gratuits
- [x] **Suppression des mini-recaps inline** des 4 composants de config (BundleConfig, BuyXGetYConfig, PromoCodeConfig, ThresholdDiscountConfig)
- [x] **Options avancées** : label enrichi "(dates, jours, limites)", prop `defaultOpen` pour mode édition
- [x] **17 tests** pour `getRecapText` et `getValidationErrors` (OfferRecap.test.ts)

### Chantier 3 — À faire

- [ ] **Renommer "Carte" → "Menu"** — aligner sur le vocabulaire food truck
- [ ] **Empty states enrichis** — illustrations + CTA contextuel sur chaque page vide
- [ ] **Onboarding progress bar** — indicateur visuel de progression dans le header
- [ ] **Preview côté client** depuis la page Offres — lien "Voir côté client" comme sur la page Carte

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
