# Dashboard UX -- Cartographie exhaustive

> Analyse factuelle de l'architecture UX du dashboard food trucker (packages/dashboard/).
> Destinee a un designer externe qui n'a pas acces au code.
>
> **Date** : 28 mai 2026
> **Perimetre** : packages/dashboard/ uniquement (pas client, pas landing, pas admin)

---

## 1. Architecture de l'information

### Sidebar

La sidebar est fixe a gauche sur desktop (w-72, fond gray-900), slide-out sur mobile (hamburger). Elle contient 13 liens organises en 3 groupes visuels separes par des labels de section.

```
OPERATIONS
  Tableau de bord    LayoutDashboard    /              pages/Dashboard/index.tsx
  Commandes          ClipboardList      /orders        pages/Orders/index.tsx
  Carte              UtensilsCrossed    /menu          pages/Menu.tsx
  Planning           Calendar           /schedule      pages/Schedule/index.tsx
  Menus & Offres     Sparkles           /offers        pages/Offers/index.tsx

PERFORMANCE
  Analyses           BarChart3          /analytics     pages/Analytics/index.tsx
  Clients            Users              /customers     pages/Customers/index.tsx
  Fidelite           Gift               /loyalty       pages/Loyalty/index.tsx
  Campagnes          Send               /campaigns     pages/Campaigns/index.tsx

(pas de label de section)
  Facturation        CreditCard         /billing       pages/Billing.tsx
  Parametres         Settings           /settings      pages/Settings/index.tsx
```

Toutes les icones sont Lucide React.

Le pied de sidebar contient un bouton "Deconnexion" (icone LogOut).

### Header (sticky, desktop + mobile)

- Titre de page dynamique (derive de la route courante)
- Cloche de notifications (Badge rouge si commandes en attente)
- Bouton "+" pour creer une commande rapide (QuickOrderModal)

### Bannieres conditionnelles (entre header et contenu)

Trois bannieres mutuellement exclusives, par ordre de priorite :

1. **OnboardingBanner** : si `foodtruck.onboarding_completed_at` est NULL. Texte "Terminer la configuration", lien vers `/onboarding-assistant`.
2. **DegradedModeBanner** : si `accessState === 'degraded'`. Banniere rouge persistante, CTA vers `/billing`.
3. **TrialBanner** : si en mode trial et pas sur `/billing`. Compteur de jours restants, CTA "Ajouter ma CB".

### Protection des routes

| Route                   | PrivateRoute | SubscriptionGuard | Lecture seule en degrade                     |
| ----------------------- | ------------ | ----------------- | -------------------------------------------- |
| `/` (Tableau de bord)   | Oui          | Oui               | Oui (boutons desactives)                     |
| `/orders`               | Oui          | Oui               | Oui (accept/cancel/ready desactives)         |
| `/menu`                 | Oui          | Oui               | Oui (ajout/modif/suppression desactives)     |
| `/schedule`             | Oui          | Oui               | Oui (ajout/modif/suppression desactives)     |
| `/offers`               | Oui          | Oui               | Oui (creation/toggle/suppression desactives) |
| `/analytics`            | Oui          | Oui               | Non (lecture seule par nature)               |
| `/customers`            | Oui          | Oui               | Oui (export desactive)                       |
| `/loyalty`              | Oui          | Oui               | Oui (toggles/save desactives)                |
| `/campaigns`            | Oui          | Oui               | Oui (creation/envoi desactives)              |
| `/billing`              | Oui          | **Non**           | N/A (toujours accessible)                    |
| `/settings`             | Oui          | **Non**           | Oui (edition desactivee, sauf navigation)    |
| `/onboarding`           | Conditionnel | Non               | N/A                                          |
| `/onboarding-assistant` | Conditionnel | Non               | N/A                                          |

En mode degrade, toute tentative d'acceder a une route protegee par SubscriptionGuard redirige vers `/billing` avec un flag `{ degraded: true }`.

Les boutons d'ecriture desactives affichent un tooltip : "Reactivez votre abonnement pour utiliser cette fonctionnalite."

### Routes legacy (redirections)

- `/promo-codes` --> `/offers`
- `/deals` --> `/offers`

### Sous-routes

Aucune page n'a de sous-routes URL. La navigation interne se fait par onglets ou modales dans la meme page.

---

## 2. Onboarding et assistants

### Phase 1 : Creation du food truck (`/onboarding`)

**Declencheur** : l'utilisateur est authentifie mais n'a pas encore de food truck en BDD.
**PrivateRoute** detecte `foodtruck === null` et redirige vers `/onboarding`.

**Ecran unique** :

- Fond degrade orange/blanc
- Emoji camion
- Question : "Comment s'appelle votre food truck ?"
- Champ texte pour le nom
- Preview du slug auto-genere : `{slug}.onmange.app`
- Validation : nom non vide, slug unique (suffixe timestamp si doublon)
- Bouton "Continuer"

**A la soumission** : insertion dans `foodtrucks` (name, slug, email = email du user). Redirection automatique vers `/onboarding-assistant`.

### Phase 2 : Assistant de configuration (`/onboarding-assistant`)

**Declencheur** : food truck existe mais `onboarding_completed_at` est NULL.
**PrivateRoute** detecte cette condition et redirige vers `/onboarding-assistant`.

**Wizard en 3 etapes** avec barre de progression (cliquable pour revenir en arriere) et bouton "Terminer plus tard" (quitte sans perdre les donnees).

L'etape courante est persistee en BDD (`foodtruck.onboarding_step`). L'utilisateur peut quitter et reprendre plus tard exactement ou il en etait.

#### Etape 1 : Emplacements

- Titre : "Ou etes-vous installe ?"
- Formulaire : nom de l'emplacement + adresse (autocomplete Google Places)
- Suggestions rapides : "Marche", "Centre-ville", "Zone commerciale", "Parking"
- Feedback de geocodage : "Position detectee" quand lat/long obtenues
- Liste des emplacements ajoutes (supprimables)
- **Prerequis pour continuer** : au moins 1 emplacement

#### Etape 2 : Planning

- Titre : "Quels sont vos horaires ?"
- Accordeon 7 jours (Lundi-Dimanche)
- Chaque jour : ajout de creneaux (location + heure debut + heure fin)
- Jours avec creneaux : badge bleu "X creneau(x)"
- Jours sans creneaux : label "Repos"
- Info : "Vous pourrez gerer les exceptions (vacances, jours feries) depuis la page Planning"
- **Prerequis pour continuer** : au moins 1 creneau sur au moins 1 jour

#### Etape 3 : Menu

- Vue liste des categories avec nombre d'articles
- Ajout de categorie par nom + suggestions rapides (Entrees, Plats, Desserts, Boissons, Pizzas, Burgers, Salades, Wraps)
- Edition d'une categorie : ajout/modif d'articles (nom, description, prix, options de taille, supplements)
- Reordonnement des categories (fleches haut/bas)
- **Prerequis pour continuer** : au moins 1 categorie avec au moins 1 article

#### Ecran de completion

- Animation confettis (3 secondes)
- Resume : nombre d'emplacements, jours/semaine, articles au menu
- Lien de partage (`{slug}.onmange.app`) avec bouton copier
- QR code telechargeable (PNG)
- Checklist "Prochaines etapes" :
  - Ajouter une description du food truck --> `/settings`
  - Ajouter des descriptions aux plats --> `/menu`
  - Configurer le programme de fidelite --> `/loyalty`
  - Telecharger le QR code --> `/settings`
- Bouton "Acceder au tableau de bord"

**A la completion** : `onboarding_completed_at` est renseigne en BDD. La banniere OnboardingBanner disparait.

### Relancement de l'assistant

Depuis la page Parametres, une section "Assistant" permet de relancer le wizard. Si `onboarding_completed_at` est deja renseigne, le wizard redemarre a l'etape 1.

### Etats vides contextuels (hors onboarding)

| Page                 | Message d'etat vide                                                                     |
| -------------------- | --------------------------------------------------------------------------------------- |
| Tableau de bord      | "Aucune commande a venir" (section commandes a venir)                                   |
| Commandes (Timeline) | "Aucune commande pour le moment" + "Partagez votre lien..."                             |
| Commandes (Liste)    | "Aucune commande avec ces filtres"                                                      |
| Carte                | Pas de categories : card "Creez votre premiere categorie" (CTA pointille)               |
| Carte                | Categorie vide : lien "+ Ajouter un article"                                            |
| Offres               | "Aucune offre creee" + CTA "Creez votre premiere offre promotionnelle"                  |
| Clients              | "Aucun client pour le moment" + "Les clients apparaissent apres leur premiere commande" |
| Fidelite             | "Aucun client inscrit au programme de fidelite"                                         |
| Campagnes            | "Aucune campagne" + "Envoyez des emails et SMS..."                                      |
| Analyses             | "Aucune vente sur cette periode"                                                        |

---

## 3. Pour chaque page principale du dashboard

### Tableau de bord

- **Route** : `/`
- **Composant** : `pages/Dashboard/index.tsx` + `useDashboard.ts`
- **Objet metier principal** : vue synthetique de l'activite du jour
- **Tables BDD touchees** : `orders` (lecture), `schedules` + `schedule_exceptions` (lecture), `offers` (lecture, comptage actifs), `menu_items` (lecture, comptage ruptures)
- **RPC** : `get_dashboard_stats()` (compteurs commandes + CA du jour)
- **Sous-onglets** : aucun
- **Sections internes** :
  - TodayBanner : statut du jour (ouvert/ferme/pas de service, avec emplacement et horaires)
  - Grille de stats : commandes en attente, confirmees, retirees, CA du jour (les cards affichees varient selon `auto_accept_orders`)
  - Prochaines commandes : les 5 prochaines du jour
  - Cards rapides (scroll horizontal mobile) : articles en rupture, offres actives, stats de la semaine
- **Actions utilisateur** :
  - Accepter / refuser / marquer pret / marquer retire une commande (via OrderDetailModal)
  - Modifier l'heure de retrait
- **Etat vide** : "Aucune commande a venir" si pas de commandes aujourd'hui
- **Liens vers d'autres pages** :
  - TodayBanner --> `/schedule`
  - "Voir toutes les commandes" --> `/orders`
  - Ruptures de stock "Gerer" --> `/menu`
  - Offres actives "Gerer" --> `/offers`
- **Donnees prerequises** : schedule + location pour que TodayBanner soit informatif. Sinon la page fonctionne mais est vide.

---

### Commandes

- **Route** : `/orders`
- **Composant** : `pages/Orders/index.tsx` + `useOrders.ts`
- **Objet metier principal** : gestion des commandes du jour
- **Tables BDD touchees** : `orders` (lecture + update status), `order_items` + `order_item_options` (lecture), `schedules` (lecture, pour calculer les heures du service)
- **Sous-onglets** : aucun, mais deux modes d'affichage
- **Sections internes** :
  - Navigation par date (precedent / suivant / datepicker)
  - Toggle vue Timeline / Liste (persiste en localStorage)
  - Toggle son (notifications sonores)
  - Filtres par statut : En attente, Confirmees, Pretes (si `use_ready_status`), Retirees
  - **Vue Timeline** : commandes groupees par creneaux de 15min, heure courante surlignee
  - **Vue Liste** : commandes en grille (1 col mobile, 3 cols desktop)
  - OrderDetailModal : detail d'une commande avec actions
- **Actions utilisateur** :
  - Accepter une commande (pending --> confirmed)
  - Refuser avec motif (pending --> cancelled)
  - Marquer prete (confirmed --> ready, si `use_ready_status`)
  - Marquer retiree (confirmed/ready --> picked_up)
  - Modifier l'heure de retrait
- **Logique metier** :
  - Jour "business" : avant 2h du matin = affiche la veille
  - Polling toutes les 30s + refresh sur focus/visibilite
  - `order_slot_interval` du foodtruck determine l'intervalle des creneaux (defaut 15min)
- **Etat vide** : "Aucune commande pour le moment" + incitation a partager le lien
- **Liens vers d'autres pages** : aucun
- **Donnees prerequises** : aucune (la page est utile des la premiere commande)

---

### Carte

- **Route** : `/menu`
- **Composant** : `pages/Menu.tsx` + `hooks/useMenuPage.ts`
- **Objet metier principal** : categories, articles, groupes d'options (tailles/supplements)
- **Tables BDD touchees** : `categories` (CRUD), `menu_items` (CRUD), `category_option_groups` (CRUD), `category_options` (CRUD)
- **Sous-onglets** : aucun
- **Sections internes** :
  - Lien "Voir cote client" (ouvre `{slug}.onmange.app` dans un nouvel onglet)
  - Bouton "Gerer les categories" (toggle panneau CategoryManager)
  - Pour chaque categorie :
    - Header (nom, nombre d'articles, indicateur de ruptures)
    - Bouton "Options" (ouvre OptionsWizard ou CategoryOptionsModal)
    - Bouton "Ajouter un article"
    - Liste triable des articles (drag & drop via SortableMenuItemList)
  - Section "Articles sans categorie" (si applicable)
  - Bouton "Ajouter une categorie" (card pointillee)
  - Section "Articles archives" (depliable)
  - **Modales** :
    - MenuItemForm : creation/edition d'un article (nom, description, prix, photo, allergenes, plat du jour)
    - OptionsWizard : assistant de configuration des groupes d'options (tailles, supplements) au niveau de la categorie
    - CategoryOptionsModal : edition rapide des options d'une categorie
- **Actions utilisateur** :
  - Creer / renommer / supprimer une categorie
  - Reordonner les categories
  - Creer / modifier / archiver / restaurer un article
  - Basculer la disponibilite d'un article (en stock / en rupture)
  - Reordonner les articles dans une categorie (drag & drop)
  - Configurer les groupes d'options (tailles, supplements) au niveau categorie
- **Etat vide** : card "Creez votre premiere categorie" quand aucune categorie n'existe
- **Liens vers d'autres pages** : "Voir cote client" --> page publique du food truck
- **Donnees prerequises** : aucune (page autonome, mais les offres de type bundle referencent des articles de cette page)

---

### Planning

- **Route** : `/schedule`
- **Composant** : `pages/Schedule/index.tsx` + `useSchedule.ts`
- **Objet metier principal** : emplacements, horaires recurrents, exceptions
- **Tables BDD touchees** : `locations` (CRUD), `schedules` (CRUD), `schedule_exceptions` (CRUD)
- **Sous-onglets** : 3 onglets
  - **Calendrier** : vue mois, jours colores (normal/exception/ferme), clic sur un jour ouvre DayModal
  - **Horaires** (RecurringScheduleTab) : liste des creneaux recurrents (jour, heure debut/fin, emplacement), formulaire ajout/edition
  - **Emplacements** (LocationsTab) : liste des emplacements (nom, adresse), formulaire ajout/edition
- **Modales** :
  - DayModal : pour un jour specifique, choix entre "Horaire normal", "Horaire modifie" (heure + emplacement custom), ou "Ferme" (avec motif optionnel)
- **Actions utilisateur** :
  - Creer / modifier / supprimer un emplacement
  - Creer / modifier / supprimer un horaire recurrent
  - Definir une exception pour un jour (ouverture speciale, fermeture, ou retour au planning normal)
- **Etat vide** : le calendrier s'affiche toujours. Les onglets Horaires/Emplacements affichent "Aucun horaire configure" / liste vide. Un avertissement s'affiche si aucun emplacement n'existe ("Creez d'abord un emplacement").
- **Liens vers d'autres pages** : aucun
- **Donnees prerequises** : il faut creer au moins un emplacement avant de pouvoir creer un horaire recurrent

---

### Menus & Offres

- **Route** : `/offers`
- **Composant** : `pages/Offers/index.tsx` + `useOffers.ts`
- **Objet metier principal** : offres promotionnelles (4 types)
- **Tables BDD touchees** : `offers` (CRUD), `offer_items` (CRUD), `categories` + `category_option_groups` (lecture), `menu_items` (lecture)
- **Sous-onglets** : aucun
- **Sections internes** :
  - Stats : nombre d'offres actives + total d'utilisations
  - Liste triable d'offres (SortableOfferList) avec cards (OfferCard) : nom, type, toggle actif/inactif, nombre d'utilisations, boutons modifier/supprimer
  - **OfferWizard** (modale 4 etapes) :
    1. **Type** : choix entre Code promo, Formule (bundle), Achetez X obtenez Y, Remise au panier
    2. **Configuration** : parametres specifiques au type (code, reduction, articles, categories, prix fixe, etc.)
    3. **Ciblage** : dates de validite, horaires, jours de la semaine, limites d'utilisation
    4. **Recap** : resume avant validation
- **Types d'offres** :
  - `promo_code` : code a saisir, reduction % ou fixe, montant minimum optionnel
  - `bundle` : formule a prix fixe (articles specifiques ou choix par categorie)
  - `buy_x_get_y` : X achetes = Y offerts/remises (articles specifiques ou par categorie)
  - `threshold_discount` : remise automatique a partir d'un montant de commande
- **Actions utilisateur** :
  - Creer une offre (wizard 4 etapes)
  - Modifier une offre existante
  - Activer / desactiver une offre
  - Supprimer une offre
  - Reordonner les offres (drag & drop)
- **Etat vide** : "Aucune offre creee" + CTA "Creez votre premiere offre promotionnelle"
- **Liens vers d'autres pages** : aucun
- **Donnees prerequises** : pour un bundle ou buy_x_get_y, il faut que des articles et des categories existent deja dans la Carte. Le wizard affiche les articles/categories disponibles pour selection.

---

### Analyses

- **Route** : `/analytics`
- **Composant** : `pages/Analytics/index.tsx` + `useAnalytics.ts`
- **Objet metier principal** : statistiques de vente
- **Tables BDD touchees** : aucune directement -- tout passe par la RPC `get_analytics()`
- **Sous-onglets** : aucun
- **Sections internes** :
  - Selecteur de periode : Aujourd'hui, Hier, 7 derniers jours, 30 derniers jours, Ce mois, Mois dernier, Personnalise
  - Inputs date debut/fin (si periode personnalisee)
  - Bouton export CSV
  - KPIs (4 cards) : CA, nombre de commandes, panier moyen, clients uniques (+ returning)
  - Graphiques :
    - CA par jour (barres)
    - Commandes par jour de la semaine (barres)
    - Heures de pointe 10h-22h (barres)
    - Par emplacement (liste classee)
    - Offres utilisees (liste avec compteur + remise totale)
  - Top articles (liste classee avec barre de progression)
  - Stats par categorie (grille)
- **Actions utilisateur** : changer la periode, exporter en CSV
- **Etat vide** : "Aucune vente sur cette periode"
- **Liens vers d'autres pages** : aucun
- **Donnees prerequises** : des commandes doivent exister pour que la page soit utile

---

### Clients

- **Route** : `/customers`
- **Composant** : `pages/Customers/index.tsx` + `useCustomers.ts`
- **Objet metier principal** : base de donnees clients
- **Tables BDD touchees** : `customers` (lecture), `customer_locations` (lecture jointe), `locations` (lecture pour filtres)
- **Sous-onglets** : aucun
- **Sections internes** :
  - Stats (5 cards) : total, opt-in email, opt-in SMS, actifs (30j), fideles (5+ commandes)
  - Recherche (nom/email/telephone)
  - Filtres : segment (tous, opt-in, fideles, inactifs, nouveaux) + emplacement
  - Vue mobile : une card par client
  - Vue desktop : tableau avec colonnes (Nom, Contact, Commandes, Total, Points, Opt-in, Derniere commande, Emplacements)
  - Pagination (20 par page, server-side)
- **Actions utilisateur** : rechercher, filtrer, exporter en CSV
- **Etat vide** : "Aucun client pour le moment" + "Les clients apparaissent apres leur premiere commande"
- **Liens vers d'autres pages** : aucun (liens mailto: et tel: sur les contacts)
- **Donnees prerequises** : des commandes doivent exister pour que des clients apparaissent

---

### Fidelite

- **Route** : `/loyalty`
- **Composant** : `pages/Loyalty/index.tsx` + `useLoyalty.ts`
- **Objet metier principal** : programme de fidelite (points par euro, seuil, recompense)
- **Tables BDD touchees** : `foodtrucks` (lecture/ecriture des champs loyalty\_\*), `customers` (lecture des points)
- **Sous-onglets** : aucun
- **Sections internes** :
  - Badge actif/inactif
  - Stats (4 cards) : clients inscrits, points en circulation, recompenses echangees, clients proches du seuil
  - Configuration (depliable) :
    - Toggle programme actif/inactif
    - Points par euro
    - Seuil (nombre de points pour une recompense)
    - Montant de la recompense (en euros)
    - Toggle cumul autorise (plusieurs recompenses en une commande)
    - Preview client (barre de progression)
    - Resume textuel ("Les clients gagnent X points par euro...")
    - Bouton sauvegarder
  - Classement des clients (tableau desktop) : rang, nom, email, points, progression, commandes, CA total
- **Actions utilisateur** : activer/desactiver le programme, modifier les parametres, sauvegarder
- **Etat vide** : "Aucun client inscrit au programme de fidelite"
- **Liens vers d'autres pages** : aucun
- **Donnees prerequises** : des clients doivent exister et avoir des points. Les points s'accumulent automatiquement via les commandes.

---

### Campagnes

- **Route** : `/campaigns`
- **Composant** : `pages/Campaigns/index.tsx` + `useCampaigns.ts`
- **Objet metier principal** : campagnes email/SMS
- **Tables BDD touchees** : `campaigns` (CRUD), `locations` (lecture pour ciblage)
- **RPC** : `count_campaign_recipients` (preview du nombre de destinataires)
- **Sous-onglets** : aucun
- **Sections internes** :
  - Liste de CampaignCard : nom, canal (email/SMS/les deux), statut (brouillon/envoyee), nombre de destinataires, boutons envoyer/modifier/supprimer
  - CampaignModal (creation/edition) :
    - Nom
    - Canal : email, SMS, ou les deux
    - Segment : tous, par emplacement, inactifs, fideles, nouveaux
    - Emplacement (si segment = par emplacement)
    - Jours d'inactivite (si segment = inactifs)
    - Objet + corps email (si email ou les deux)
    - Corps SMS (si SMS ou les deux)
    - Preview du nombre de destinataires (mis a jour en temps reel)
- **Actions utilisateur** : creer, modifier, envoyer, supprimer une campagne
- **Etat vide** : "Aucune campagne" + "Envoyez des emails et SMS..."
- **Liens vers d'autres pages** : aucun
- **Donnees prerequises** : des clients avec opt-in email/SMS doivent exister

---

### Facturation

- **Route** : `/billing`
- **Composant** : `pages/Billing.tsx`
- **Objet metier principal** : abonnement Stripe
- **Tables BDD touchees** : `subscriptions` (lecture via `api.billing`)
- **Sous-onglets** : aucun
- **Sections internes** : affichage conditionnel selon le statut de l'abonnement :
  - **Trialing** : alerte "Votre essai se termine dans X jours", CTA "Ajouter ma CB" (Stripe Checkout) ou "Gerer" (Stripe Portal si deja une CB)
  - **Active** : alerte "Abonnement actif", date du prochain prelevement, bouton "Gerer mon abonnement" (Stripe Portal)
  - **Past due** : alerte "Paiement en cours de relance", bouton "Gerer" (Stripe Portal)
  - **Degrade** (canceled/unpaid/expired_trial/incomplete/paused) : alerte "Abonnement inactif", CTA "Reactiver pour 29EUR HT/mois" (Stripe Checkout)
- **Actions utilisateur** :
  - Demarrer le paiement (redirection Stripe Checkout)
  - Gerer l'abonnement (redirection Stripe Customer Portal)
- **Gestion post-checkout** : parametres URL `?success=1` / `?canceled=1` pour afficher des toasts
- **Etat vide** : "Aucun abonnement trouve"
- **Liens vers d'autres pages** : aucun (redirections externes vers Stripe)
- **Donnees prerequises** : aucune (la subscription est creee automatiquement avec le food truck)

---

### Parametres

- **Route** : `/settings`
- **Composant** : `pages/Settings/index.tsx` + `useSettings.ts`
- **Objet metier principal** : configuration globale du food truck
- **Tables BDD touchees** : `foodtrucks` (lecture/ecriture de tous les champs de config)
- **Sous-onglets** : pas d'onglets, mais 12 sections verticales avec navigation rapide (sticky sur mobile) :

| #   | Section             | Contenu                                                                                                                                                        |
| --- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Lien**            | Editeur de slug (`{slug}.onmange.app`) + bouton copier                                                                                                         |
| 2   | **Profil**          | Nom, description, types de cuisine, flag mobile, logo, photo de couverture                                                                                     |
| 3   | **Reseaux sociaux** | Liens Instagram, Facebook, TikTok, Twitter                                                                                                                     |
| 4   | **Entreprise**      | Raison sociale, SIRET, TVA, adresse                                                                                                                            |
| 5   | **Paiement**        | Modes acceptes (especes/CB/mobile), frais de livraison                                                                                                         |
| 6   | **QR Code**         | Affichage du QR code + bouton telecharger                                                                                                                      |
| 7   | **Integrer**        | Code HTML d'integration pour site web                                                                                                                          |
| 8   | **Commandes**       | auto_accept, popup, statut "pret", intervalle de creneaux, max par creneau, commandes a l'avance, delai ASAP, temps de preparation, emails confirmation/rappel |
| 9   | **Offres**          | Cumul d'offres autorise, cumul de codes promo autorise                                                                                                         |
| 10  | **Theme**           | Personnalisation des couleurs                                                                                                                                  |
| 11  | **Assistant**       | Lien pour relancer l'assistant d'onboarding                                                                                                                    |
| 12  | **Compte**          | Suppression de compte                                                                                                                                          |

- **Actions utilisateur** : modifier chaque champ individuellement (edition inline avec validation), telecharger le QR code, supprimer le compte
- **Etat vide** : aucun (les champs ont des valeurs par defaut ou sont optionnels)
- **Liens vers d'autres pages** : "Relancer l'assistant" --> `/onboarding-assistant`, "Voir cote client" --> page publique
- **Donnees prerequises** : aucune

---

## 4. Le modele de donnees cote configuration food truck

```
foodtruck
  |-- infos (nom, slug, description, cuisine_types, logo, cover, phone, email,
  |          is_mobile, theme, socials, show_menu_photos, show_promo_section)
  |
  |-- reglages commandes (auto_accept_orders, show_order_popup, use_ready_status,
  |          order_slot_interval, max_orders_per_slot, allow_advance_orders,
  |          advance_order_days, allow_asap_orders, min_preparation_time,
  |          send_confirmation_email, send_reminder_email)
  |
  |-- reglages fidelite (loyalty_enabled, loyalty_points_per_euro,
  |          loyalty_threshold, loyalty_reward, loyalty_allow_multiple)
  |
  |-- reglages offres (offers_stackable, promo_codes_stackable,
  |          max_discount_percent_per_order)
  |
  |-- onboarding (onboarding_step, onboarding_completed_at)
  |
  |-- locations (1:N)
  |     |-- id, name, address, latitude, longitude, google_place_id
  |     |
  |     |-- schedules (1:N) -- horaires recurrents
  |     |     |-- day_of_week (0-6), start_time, end_time, is_active
  |     |
  |     |-- schedule_exceptions (0:N) -- exceptions ponctuelles
  |           |-- date (unique par foodtruck), is_closed, start_time,
  |               end_time, reason, location_id (optionnel)
  |
  |-- categories (1:N)
  |     |-- name, display_order
  |     |
  |     |-- category_option_groups (0:N) -- ex: "Taille", "Supplements"
  |     |     |-- name, is_required, is_multiple, display_order
  |     |     |
  |     |     |-- category_options (1:N) -- ex: "S", "M", "L"
  |     |           |-- name, price_modifier (cents), is_available, is_default
  |     |
  |     |-- menu_items (0:N)
  |           |-- name, description, price (cents), image_url, allergens
  |           |-- is_available, is_archived, is_daily_special, display_order
  |
  |-- offers (0:N)
  |     |-- name, description, offer_type, config (JSONB), is_active
  |     |-- start_date, end_date, time_start, time_end, days_of_week
  |     |-- max_uses, max_uses_per_customer, current_uses
  |     |
  |     |-- offer_items (0:N) -- liens vers menu_items
  |           |-- menu_item_id, role (trigger/reward/bundle_item), quantity
  |
  |-- subscription (1:1, auto-creee)
        |-- status, stripe_customer_id, stripe_subscription_id
        |-- trial_started_at, trial_ends_at, current_period_start/end
```

### Ou chaque objet est manipule

| Objet                          | Page principale                        | Aussi manipule depuis                   |
| ------------------------------ | -------------------------------------- | --------------------------------------- |
| foodtruck (infos)              | Parametres                             | Onboarding (nom, slug)                  |
| foodtruck (reglages commandes) | Parametres                             | --                                      |
| foodtruck (reglages fidelite)  | Fidelite                               | Parametres (non, seulement Fidelite)    |
| foodtruck (reglages offres)    | Parametres                             | --                                      |
| locations                      | Planning (onglet Emplacements)         | Onboarding etape 1                      |
| schedules                      | Planning (onglet Horaires)             | Onboarding etape 2                      |
| schedule_exceptions            | Planning (onglet Calendrier, DayModal) | --                                      |
| categories                     | Carte                                  | Onboarding etape 3                      |
| category_option_groups         | Carte (OptionsWizard)                  | Onboarding etape 3                      |
| category_options               | Carte (OptionsWizard)                  | Onboarding etape 3                      |
| menu_items                     | Carte                                  | Onboarding etape 3                      |
| offers                         | Menus & Offres                         | --                                      |
| offer_items                    | Menus & Offres                         | --                                      |
| subscription                   | Facturation (lecture)                  | -- (ecriture via Edge Functions Stripe) |
| orders                         | Commandes, Tableau de bord             | --                                      |
| customers                      | Clients (lecture)                      | -- (ecriture via commandes)             |

---

## 5. Flows utilisateurs critiques

### Flow A : "Je m'inscris et je veux etre operationnel"

1. Inscription sur `/register` (email + mot de passe)
2. Redirection auto vers `/onboarding` : saisie du nom du food truck
3. Redirection auto vers `/onboarding-assistant` etape 1 : ajout d'au moins 1 emplacement
4. Etape 2 : ajout d'au moins 1 creneau horaire sur au moins 1 jour
5. Etape 3 : creation d'au moins 1 categorie + 1 article
6. Ecran de completion : lien de partage + QR code + checklist "prochaines etapes"
7. Acces au tableau de bord

**Nombre minimum de pages/ecrans** : 6 (register + onboarding + 3 etapes + completion)

**Le food truck est techniquement "operationnel" a la fin de l'etape 6** : il a un menu, des horaires, et un lien partageable. Un client peut passer commande.

**Mais pour une experience complete**, l'utilisateur devrait aussi :

- Ajouter une description et un logo (Parametres)
- Configurer le programme de fidelite (Fidelite)
- Imprimer et afficher le QR code

Ces elements sont sugges dans la checklist de completion mais ne sont pas obligatoires.

---

### Flow B : "J'ajoute un nouveau plat avec des options (taille, supplements)"

1. Page Carte (`/menu`)
2. Cliquer sur "Ajouter un article" sous la categorie souhaitee --> modale MenuItemForm
3. Remplir nom, description, prix de base --> sauvegarder
4. Pour les options (taille, supplements) : cliquer sur le bouton "Options" de la categorie --> modale OptionsWizard
5. Configurer les groupes (ex: "Taille" avec S/M/L et prix de chaque, "Supplements" avec choix multiples)
6. Sauvegarder --> les options s'appliquent a TOUS les articles de la categorie

**Nombre d'ecrans** : 1 page + 2 modales (MenuItemForm puis OptionsWizard)

**L'utilisateur ne sort jamais de la page Carte.** Tout se fait en modales.

**Point d'attention** : les options sont definies au niveau de la categorie, pas de l'article individuel. Si un utilisateur veut des options differentes pour deux plats de la meme categorie, il doit creer deux categories. Ce n'est pas guide dans l'interface.

---

### Flow C : "Je cree une formule (bundle) burger + boisson"

1. Page Menus & Offres (`/offers`)
2. Cliquer "Nouvelle offre" --> modale OfferWizard
3. Etape 1 : choisir le type "Formule"
4. Etape 2 : choisir entre "Articles specifiques" ou "Choix par categorie"
   - Articles specifiques : selectionner les articles un par un + definir le prix fixe
   - Choix par categorie : definir les categories (ex: 1 dans "Burgers" + 1 dans "Boissons") + definir le prix fixe + exclure des articles/tailles si besoin
5. Etape 3 : ciblage (dates, horaires, jours, limites d'utilisation)
6. Etape 4 : recap, confirmer

**Pre-requis** : les articles doivent exister dans la Carte. Pour le mode "choix par categorie", les categories doivent exister avec au moins 1 article chacune.

**Nombre d'ecrans** : 1 page + 1 modale (wizard 4 etapes)

**L'utilisateur ne quitte pas la page Offres.** Il selectionne les articles/categories existants dans le wizard.

---

### Flow D : "Je modifie mes horaires pour la semaine prochaine"

**Deux cas** :

**Changement permanent** (je change mes horaires recurrents) :

1. Page Planning (`/schedule`), onglet "Horaires"
2. Modifier ou supprimer un horaire existant, ou en ajouter un nouveau

**Exception ponctuelle** (je suis ferme mardi prochain / je change d'emplacement) :

1. Page Planning (`/schedule`), onglet "Calendrier"
2. Cliquer sur le jour concerne dans le calendrier
3. DayModal s'ouvre avec 3 choix :
   - "Horaire normal" : utiliser le planning recurrent (supprime l'exception si elle existait)
   - "Horaire modifie" : saisir un emplacement + horaires specifiques pour ce jour
   - "Ferme" : marquer le jour comme ferme, avec motif optionnel

---

### Flow E : "Je veux savoir ce qui marche / pas (best sellers, moments creux)"

1. Page Analyses (`/analytics`)
2. Selectionner la periode (les 30 derniers jours par exemple)
3. Consulter :
   - **Best sellers** : section "Top articles" (liste classee par CA avec barre de progression)
   - **Moments creux** : graphique "Heures de pointe" (barres par heure, 10h-22h)
   - **Jours faibles** : graphique "Commandes par jour de la semaine"
   - **Emplacements** : section "Par emplacement" (classement par CA)
   - **Offres** : section "Offres utilisees" (nombre d'utilisations + remise totale accordee)

**Metriques disponibles** : CA total, nombre de commandes, panier moyen, clients uniques, clients recurrents, comparaison avec la periode precedente (% de variation).

---

### Flow F : "Un client passe une commande, je la prepare"

**Notification** :

1. Le client passe commande via `{slug}.onmange.app`
2. La commande arrive en BDD (via Edge Function `create-order`)
3. Le dashboard detecte la nouvelle commande via :
   - Realtime Supabase (temps reel)
   - Polling toutes les 30 secondes (fallback)
   - Refresh au retour sur l'onglet (visibilitychange + focus)
4. Notification sonore (si activee) + badge rouge sur la cloche dans le header
5. Si `auto_accept_orders` est actif : popup NewOrderPopup automatique
6. Si `auto_accept_orders` est inactif : la commande apparait dans PendingOrdersModal

**Traitement** :

1. **Accepter** : page Commandes ou Tableau de bord --> OrderDetailModal --> bouton "Accepter" (status: pending --> confirmed)
2. **Preparer** : (pas de statut intermediaire sauf si `use_ready_status` est actif)
3. **Marquer pret** (optionnel) : bouton "Pret" (status: confirmed --> ready)
4. **Marquer retire** : bouton "Retire" (status: confirmed/ready --> picked_up)

**Alternative** : refuser la commande avec un motif (bouton "Refuser" dans le modal).

---

## 6. Inventaire des frictions et incoherences

### Naming sidebar vs contenu

1. **"Carte" dans la sidebar, mais la route est `/menu`**. Le fichier s'appelle `Menu.tsx`. Un food trucker pourrait chercher "Menu" et trouver "Carte" (ou l'inverse). Le breadcrumb titre affiche "Carte" (derive du label sidebar).

2. **"Menus & Offres" dans la sidebar, mais la route est `/offers`**. Le mot "Menus" dans "Menus & Offres" est trompeur : la page ne gere pas le menu (c'est la page "Carte" qui le fait). Elle gere les offres promotionnelles (formules, codes promo, remises). Le mot "Menus" fait ici reference aux "menus/formules" (bundles), mais c'est un faux ami avec la notion de "carte/menu" du restaurant.

3. **Routes legacy `/promo-codes` et `/deals`** redirigent vers `/offers`, ce qui confirme l'historique de renommages. Le vocabulaire a evolue sans que l'ensemble soit alignee.

### Vocabulaire incoherent dans le systeme d'offres

Les 4 types d'offres utilisent des termes mixtes :

- **"Formule"** dans l'UI = `bundle` dans le code = "Menu" pour le food trucker
- **"Achetez X obtenez Y"** dans l'UI = `buy_x_get_y` dans le code
- **"Code promo"** dans l'UI = `promo_code` dans le code
- **"Remise au panier"** dans l'UI = `threshold_discount` dans le code

Le label sidebar "Menus & Offres" ne mentionne ni "codes promo" ni "remises", ce qui peut creer de la confusion sur ou trouver ces fonctionnalites.

### Options au niveau categorie : implicite et contre-intuitif

Les groupes d'options (tailles, supplements) sont definis au niveau de la **categorie**, pas de l'article. Cela signifie :

- Tous les articles d'une categorie partagent les memes options
- Si un plat a des options differentes des autres plats de sa categorie, il faut creer une categorie separee
- Ce modele n'est explique nulle part dans l'UI. L'utilisateur decouvre le bouton "Options" sur la categorie, pas sur l'article.
- Un food trucker qui veut un burger avec choix de cuisson (saignant/a point/bien cuit) et un autre burger sans ce choix doit creer deux categories "Burgers".

### Dependances non guidees

1. **Emplacement requis avant horaire** : la page Planning affiche un avertissement si aucun emplacement n'existe, mais ne propose pas de CTA direct pour en creer un (il faut switcher d'onglet).

2. **Articles requis avant offres** : pour creer une formule bundle, il faut que des articles existent. Si la carte est vide, le wizard d'offre ne guide pas l'utilisateur vers la page Carte.

3. **Categories requises avant articles** : sur la page Carte, si aucune categorie n'existe, le formulaire d'ajout d'article n'est pas accessible. La creation de categorie est l'etape implicite prealable.

4. **Clients prerequis pour campagnes et fidelite** : les pages Campagnes et Fidelite sont accessibles mais vides tant qu'aucun client n'a passe de commande. Pas de message explicite guidant vers le partage du lien.

### Configuration eclatee

Les reglages du food truck sont repartis entre :

- **Page Parametres** : reglages generaux, commandes, offres, theme, slug, profil, reseaux sociaux, entreprise, paiement
- **Page Fidelite** : reglages de fidelite (points, seuil, recompense)
- **Page Planning** : emplacements et horaires

Un reglage comme `offers_stackable` est dans Parametres > section Offres, pas dans la page Menus & Offres. Un food trucker qui gere ses offres ne penserait pas a chercher ce reglage ailleurs.

### Duplication Dashboard / Commandes

Le Tableau de bord et la page Commandes permettent tous les deux de :

- Voir les commandes du jour
- Accepter / refuser / marquer pret / marquer retire

La difference : le Tableau de bord montre les 5 prochaines commandes + stats, tandis que Commandes montre toutes les commandes avec filtres et navigation par date. Mais les actions sont identiques via le meme OrderDetailModal. Un nouvel utilisateur pourrait ne pas comprendre quand utiliser l'un vs l'autre.

### Le "QuickOrderModal" (commande rapide)

Le bouton "+" dans le header ouvre un QuickOrderModal pour creer une commande manuellement. Cette fonctionnalite n'est pas documentee et son existence n'est pas evidente. Le food trucker decouvre le bouton "+" sans contexte sur son usage (commande sur place / POS).

### Le toggle son

Le toggle son (notifications sonores) est dans la page Commandes, dans le header de la page. Ce n'est pas un reglage persistant global (il est specifique a la page). Un food trucker qui veut activer le son depuis le Tableau de bord ne le trouvera pas.

### Page Analyses : pas d'export granulaire

L'export CSV exporte toutes les donnees de la periode selectionnee, mais il n'y a pas de moyen d'exporter uniquement les commandes, ou uniquement les clients, ou un rapport specifique. L'export est monolithique.

### Le simulateur de rentabilite absent du dashboard

Le ROI Calculator existe sur la landing mais pas dans le dashboard. Un food trucker en trial qui hesite a payer n'a pas acces a cet outil de conviction depuis son espace.

### Pas de preview des offres cote client

La page Menus & Offres ne propose pas de previsualiser comment une offre apparait cote client (contrairement a la page Carte qui a un lien "Voir cote client"). Le food trucker cree une offre "a l'aveugle" sans savoir comment elle sera presentee au client final.

---

## 7. Resume executif

- **Impression globale** : dashboard structure et fonctionnel, avec une architecture de l'information logique (Operations / Performance / Compte). L'onboarding en 3 etapes est bien concu et couvre l'essentiel. Cependant, le vocabulaire est inconsistant (Carte vs Menu, Menus & Offres vs la page qui gere le menu), et certains concepts sont implicites plutot qu'explicites (options au niveau categorie, pas au niveau article).

- **Plus gros point de friction de configuration initiale** : le modele d'options au niveau categorie. Un food trucker qui a des plats avec des options differentes dans la meme categorie devra creer des categories artificielles, sans que l'interface ne l'explique.

- **Plus gros point de friction de gestion quotidienne** : le naming "Menus & Offres" qui ne correspond pas au mental model. Un food trucker cherchera naturellement ses promotions/formules dans un endroit appele "Promotions" ou "Offres", pas dans "Menus & Offres". Et il cherchera son menu dans "Carte" alors que la route s'appelle `/menu`.

- **Concept du modele de donnees le moins evident** : la distinction entre `category_option_groups` (groupes d'options au niveau categorie, partages par tous les articles) et le fait que `offer.config` est un JSONB polymorphe dont la structure change selon le type d'offre. Pour le food trucker, la question est plus simple : "pourquoi je ne peux pas mettre des options differentes sur deux plats de la meme categorie ?"
