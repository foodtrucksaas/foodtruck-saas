# Design system OnMange.app

> Charte graphique et système de design unifié pour onmange.app.
> Source de vérité pour les 3 packages (landing, dashboard, client).
> Document vivant — à éditer au fil des décisions.
>
> Dernière mise à jour : 29 mai 2026

---

## Table des matières

1. [Brand foundation](#1-brand-foundation)
2. [Logo](#2-logo)
3. [Palette](#3-palette)
4. [Typographie](#4-typographie)
5. [Iconographie](#5-iconographie)
6. [Illustrations](#6-illustrations)
7. [Spacing, radius, shadows](#7-spacing-radius-shadows)
8. [Composants atomiques](#8-composants-atomiques)
9. [Voice & tone](#9-voice--tone)
10. [Application par surface](#10-application-par-surface)
11. [Personnalisation foodtrucker](#11-personnalisation-foodtrucker)
12. [Migration & dette technique](#12-migration--dette-technique)
13. [Annexes](#13-annexes)

---

## 1. Brand foundation

### 1.1 Pourquoi OnMange existe

Les food trucks et petits restos indépendants en France perdent un temps fou à gérer des commandes par SMS, Instagram DM, téléphone. Personne ne fait du SaaS pour eux : les solutions existantes (TheFork, Zenchef, Sunday) ciblent les restos établis avec couverts. OnMange est un outil de **pré-commande** pour ces commerçants ambulants.

Pas de paiement client en ligne (hors NF525). 29€ HT/mois flat. Simple, accessible, posé.

### 1.2 Mission

Donner aux food truckers indépendants un outil **aussi pro** que les grandes chaînes, **aussi simple** qu'un cahier.

### 1.3 Valeurs

- **Sobriété** — on fait l'essentiel bien, pas le superflu mal
- **Proximité** — on parle comme un coéquipier, pas comme un commercial
- **Artisanat** — la qualité du détail, sans la prétention
- **Accessibilité** — 29€ flat, pas de commission, pas de paliers premium piège

### 1.4 Personnalité de marque

| Trait         | Définition                                                   |
| ------------- | ------------------------------------------------------------ |
| Chaleureux    | On a la chaleur d'un marché, pas le froid d'un open space    |
| Posé          | On ne survend pas, on ne stresse pas                         |
| Précis        | Quand on dit 14 jours d'essai, on dit pas "jusqu'à 14 jours" |
| Méditerranéen | Inspiration de palette et de rythme, sans cliché touristique |
| Outillé       | On vend un outil de travail, pas un mode de vie              |

### 1.5 Positionnement vs concurrents

|                   | OnMange                  | TheFork / Zenchef            | Sunday                       | Uber Eats          |
| ----------------- | ------------------------ | ---------------------------- | ---------------------------- | ------------------ |
| Cible             | Food trucks indépendants | Restos établis avec couverts | Restos modernes avec QR code | Tout resto         |
| Modèle éco        | 29€/mois flat            | Abonnement + commission      | Commission                   | Commission élevée  |
| Paiement client   | Non, sur place           | Optionnel                    | Oui (QR)                     | Oui                |
| Ton de marque     | Chaleureux artisanal     | Pro corporate                | Tech moderne                 | Plateforme massive |
| Identité visuelle | Méditerranéen éditorial  | SaaS tiède                   | Tech minimal                 | Brand massive      |

L'angle différenciant n'est pas la techno (tous ont Postgres et Stripe). C'est la **proximité avec le food trucker** + **l'identité chaleureuse**.

---

## 2. Logo

### 2.1 Principes

- Wordmark **OnMange** en **Fraunces** (variable font, opsz pour optical sizing, wght entre 500 et 700 selon contexte)
- Couleur principale : **corail #F97066** sur fond clair, **blanc** sur fond foncé
- Variante monogramme `M` ou `Om` pour favicon et apparition compacte
- Aplat propre — pas de shadow, gradient, blur
- Pas d'iconographie collée au wordmark (pas de "burger à côté du mot") — le wordmark est suffisant

### 2.2 Variantes recommandées

| Variante     | Usage                              | Specs                                                       |
| ------------ | ---------------------------------- | ----------------------------------------------------------- |
| Logo full    | Landing, headers, signatures email | Wordmark "OnMange" en Fraunces 600, opsz adapté à la taille |
| Logo compact | Dashboard sidebar                  | Wordmark seul, taille réduite                               |
| Monogramme M | Favicon, app icon, social avatar   | Lettre M en Fraunces 700, fond rond corail ou anthracite    |
| Logo inverse | Sur fond corail/marine/anthracite  | Wordmark blanc                                              |

### 2.3 Zones de respiration

Minimum **1 hauteur de M** de marge autour du logo dans tous les contextes.

### 2.4 Tailles minimales

- Logo full : **24px** de hauteur minimum (en dessous, illisible)
- Monogramme M : **16px** minimum

### 2.5 Do / Don't

✅ **Do**

- Aplat corail sur fond clair
- Aplat blanc sur fond foncé
- Préserver les zones de respiration
- Utiliser Fraunces (jamais un autre rendu)

❌ **Don't**

- Ajouter une icône à côté (pas de "OnMange 🍔")
- Étirer ou déformer
- Effets : shadow, gradient, outline, glow
- Couleurs autres que corail, blanc, anthracite

### 2.6 Direction logo à explorer

Voici des directions à tester. **Note honnête** : les mocks ci-dessous sont des starting points. Pour la version finale (kerning précis, vectorisation propre, tests à toutes les tailles), confie ça à un designer freelance via Dribbble ou Comet (~300-800€).

**Direction A — Wordmark pur Fraunces 600**

```
OnMange
```

Simple, lisible, joue à fond la carte de Fraunces. Le caractère vient de la font, rien d'autre.

**Direction B — Wordmark avec point sur le M**

```
On·Mange  (point coloré entre les deux mots, à hauteur du x-height)
```

Petit signe d'arrêt qui crée une signature. Le point peut prendre l'accent couleur du contexte.

**Direction C — Monogramme circulaire**

```
( Om )    avec fond rond corail, lettres Om en Fraunces 700 blanc
```

Pour favicon et social. Très compact.

**Direction D — Wordmark avec accent souligné**

```
OnMange
   ‾‾    (trait corail sous "Mange")
```

Met l'accent sur la partie "Mange" (verbe d'action). Souligné mince corail.

Recommandation pour démarrer : **Direction A** + **Direction C** (wordmark + monogramme). C'est ce qui demande le moins de travail et garde toutes les options ouvertes pour évoluer.

---

## 3. Palette

### 3.1 Vue d'ensemble

OnMange utilise une palette **méditerranéenne chaleureuse** : un corail signature, un marine ancrant, des neutres sables, et une famille sémantique terreuse cohérente. Tout vit dans le même univers chromatique.

### 3.2 Couleurs primaires

#### Corail — couleur signature

Base : `#F97066` — conservée depuis l'identité actuelle.

| Token        | Hex       | RGB           | Usage                                                                          |
| ------------ | --------- | ------------- | ------------------------------------------------------------------------------ |
| `corail-50`  | `#FFF1E8` | 255, 241, 232 | **Modifié** — sable très clair (vs `#FFF5F4` actuel rose froid)                |
| `corail-100` | `#FFE4E1` | 255, 228, 225 | Badges, hovers                                                                 |
| `corail-200` | `#FFCCC7` | 255, 204, 199 | Borders légers                                                                 |
| `corail-300` | `#FFA69E` | 255, 166, 158 | Disabled states                                                                |
| `corail-400` | `#FF8075` | 255, 128, 117 | Hover light                                                                    |
| `corail-500` | `#F97066` | 249, 112, 102 | **Couleur principale** — boutons, CTA                                          |
| `corail-600` | `#E65A50` | 230, 90, 80   | Hover des boutons primary, à utiliser pour CTA avec texte blanc (contraste AA) |
| `corail-700` | `#C44038` | 196, 64, 56   | Active state, texte sur fond clair                                             |
| `corail-800` | `#A33530` | 163, 53, 48   | Texte sur badge clair                                                          |
| `corail-900` | `#862D2B` | 134, 45, 43   | Headlines colorées                                                             |
| `corail-950` | `#491413` | 73, 20, 19    | Texte foncé                                                                    |

#### Marine — 2e accent

Base : `#1E3A5F` — nouveau.

| Token        | Hex       | RGB           | Usage                                                   |
| ------------ | --------- | ------------- | ------------------------------------------------------- |
| `marine-50`  | `#EEF2F7` | 238, 242, 247 | Fonds légers info                                       |
| `marine-100` | `#C7D0DD` | 199, 208, 221 | Borders info                                            |
| `marine-200` | `#93A4BC` | 147, 164, 188 | -                                                       |
| `marine-300` | `#5F779A` | 95, 119, 154  | -                                                       |
| `marine-400` | `#3D5879` | 61, 88, 121   | Liens hover                                             |
| `marine-500` | `#1E3A5F` | 30, 58, 95    | **Couleur principale** — buttons secondary, liens, info |
| `marine-600` | `#182F4D` | 24, 47, 77    | Hover                                                   |
| `marine-700` | `#11243B` | 17, 36, 59    | Active                                                  |
| `marine-800` | `#0B1A29` | 11, 26, 41    | Texte sur fond clair                                    |
| `marine-900` | `#060D17` | 6, 13, 23     | Texte foncé                                             |

#### Anthracite — texte par défaut

Base : `#2D2D2D` — conservée.

Usage : couleur de texte principale pour body et headlines neutres. Aussi utilisée pour la sidebar dashboard (signature visuelle conservée).

### 3.3 Couleurs neutres — sable et gris

| Token            | Hex       | Usage                                                                             |
| ---------------- | --------- | --------------------------------------------------------------------------------- |
| `canvas`         | `#FFFBF5` | **Fond principal** des pages dashboard et landing (réchauffe le `#FAFAFA` actuel) |
| `surface`        | `#FFFFFF` | Cards, modales (contraste avec canvas)                                            |
| `sand-100`       | `#FFF1E8` | Surface alternative pour bannières chaleureuses (= corail-50)                     |
| `sand-200`       | `#F5EDE2` | Borders chaleureuses                                                              |
| `text-primary`   | `#2D2D2D` | Texte par défaut (= anthracite)                                                   |
| `text-secondary` | `#5F5E5A` | Labels, captions, hints                                                           |
| `text-tertiary`  | `#888780` | Placeholders, disabled                                                            |
| `border-default` | `#E5E2DA` | Borders 1px de cards et inputs (sable très subtil)                                |
| `border-strong`  | `#B4B2A9` | Borders sur hover                                                                 |

**Changement vs l'existant** : `#FAFAFA` (gris froid) → `#FFFBF5` (crème très clair). La chaleur sans casser la lisibilité.

### 3.4 Couleurs sémantiques avec saveur

Remplacement des couleurs Tailwind génériques par des nuances cohérentes avec l'univers méditerranéen :

| Rôle    | Token         | Hex       | Évocation      | Usage                                             |
| ------- | ------------- | --------- | -------------- | ------------------------------------------------- |
| Success | `success-500` | `#7A9460` | Olive sauge    | Confirmation commande, "Ouvert", statuts positifs |
| Warning | `warning-500` | `#D4A04E` | Safran         | Attention douce, modification en attente          |
| Error   | `error-500`   | `#C2553D` | Terra cuite    | Erreurs, suppressions, rouge moins agressif       |
| Info    | `info-500`    | `#1E3A5F` | Marine profond | Bannières info, tooltips (= marine-500)           |
| Pending | `pending-500` | `#D9A45B` | Ocre doré      | Réservations en attente, "en cours"               |

Chaque sémantique a sa ramp 50-900. Voir annexe 13.1 pour le détail.

### 3.5 Palette curatée — personnalisation foodtrucker

8 couleurs sélectionnables par le foodtrucker pour habiller sa page client publique :

| Nom             | Hex       | Vibe                   |
| --------------- | --------- | ---------------------- |
| Corail (défaut) | `#F97066` | Chaleureux universel   |
| Marine          | `#1E3A5F` | Sobre, élégant         |
| Olive           | `#6B7A3F` | Naturel, terroir       |
| Terra cuite     | `#B84A36` | Rustique, chaleureux   |
| Safran          | `#D4A04E` | Solaire, méditerranéen |
| Anthracite      | `#2D2D2D` | Minimal, premium       |
| Aubergine       | `#5A3D4F` | Sophistiqué            |
| Vert sapin      | `#2D5944` | Forestier, brasserie   |

Toutes testées pour fonctionner sur fond clair, avec contraste WCAG AA pour texte blanc dessus (sauf Safran — voir section 11.2).

### 3.6 Couleurs à supprimer — oranges parasites

Trois couleurs hardcodées qui ne correspondent à aucun token doivent être nettoyées :

| Hex       | Localisation actuelle                                                              | Action                                                      |
| --------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `#ed7b20` | `client/index.html:8`, `client/vite.config.ts:17`, favicons SVG client + dashboard | Remplacer par `#F97066` partout                             |
| `#e55a2b` | `dashboard/src/index.css:246`, `client/src/index.css:124` (.badge-primary)         | Remplacer par `corail-700 #C44038` puis supprimer la classe |
| `#e85d4a` | `dashboard/src/pages/Settings/EmbedButtonSection.tsx:22-24`                        | Remplacer par `#F97066`                                     |
| `#fff7ed` | `dashboard/src/index.css:245`, `client/src/index.css:123` (.badge-primary bg)      | Remplacer par `corail-50 #FFF1E8`                           |
| `#1e293b` | `dashboard/src/pages/Analytics/index.tsx:223,306` (Recharts slate-800)             | Remplacer par `marine-500 #1E3A5F`                          |

### 3.7 Ratios de contraste WCAG

Tous les contrastes texte/fond critiques en mode clair :

| Texte                          | Fond                  | Ratio  | WCAG                |
| ------------------------------ | --------------------- | ------ | ------------------- |
| anthracite `#2D2D2D`           | canvas `#FFFBF5`      | 13.8:1 | AAA                 |
| anthracite `#2D2D2D`           | surface `#FFFFFF`     | 14.4:1 | AAA                 |
| text-secondary `#5F5E5A`       | canvas `#FFFBF5`      | 6.8:1  | AAA                 |
| corail-500 `#F97066` sur blanc | surface               | 3.1:1  | AA Large uniquement |
| Texte blanc                    | corail-500 `#F97066`  | 3.1:1  | AA Large uniquement |
| Texte blanc                    | corail-600 `#E65A50`  | 3.8:1  | AA Large            |
| Texte blanc                    | marine-500 `#1E3A5F`  | 11.2:1 | AAA                 |
| Texte blanc                    | success-500 `#7A9460` | 3.4:1  | AA Large            |
| Texte blanc                    | error-500 `#C2553D`   | 4.5:1  | AA                  |

⚠️ **Note critique** : le corail-500 sur fond blanc passe AA Large (texte ≥ 18px / 14px bold) mais **pas** AA normal. Pour les CTAs avec texte blanc en taille standard, utiliser **corail-600 `#E65A50`** minimum, ou augmenter la taille à 18px+.

---

## 4. Typographie

### 4.1 Familles

#### Fraunces — display et headlines

- **Source** : Google Fonts (gratuite)
- **Type** : Variable font (axes : `opsz`, `wght`, `SOFT`, `WONK`)
- **Caractère** : moderne expressive, courbes douces, traits chaleureux
- **Usage** : headlines de la landing, titre du foodtruck sur la page client publique
- **Weights chargés** : 500 (medium), 600 (semibold), 700 (bold)
- **CDN** :
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap"
    rel="stylesheet"
  />
  ```

#### Inter — UI et body

- **Source** : Google Fonts (déjà chargée sur landing)
- **Type** : Sans-serif variable
- **Caractère** : neutre, lisible, optimisée pour les écrans
- **Usage** : tout le corps de texte, tous les composants UI (boutons, inputs, labels), tout le dashboard, toute la page client sauf le titre du foodtruck
- **Weights chargés** : 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### 4.2 Échelle typographique

| Token       | Taille | Line-height | Weights     | Usage                                      |
| ----------- | ------ | ----------- | ----------- | ------------------------------------------ |
| `text-xs`   | 12px   | 1.4         | 400-500     | Captions, hints, labels secondaires        |
| `text-sm`   | 14px   | 1.5         | 400-500-600 | Labels, body secondaire, inputs            |
| `text-base` | 16px   | 1.6         | 400         | Body principal                             |
| `text-lg`   | 18px   | 1.5         | 600         | Titres de section dans dashboard           |
| `text-xl`   | 20px   | 1.4         | 600         | Sous-titres                                |
| `text-2xl`  | 24px   | 1.3         | 600         | Titres modaux, titres de cards importantes |
| `text-3xl`  | 30px   | 1.25        | 700         | H2 landing mobile, titre foodtruck         |
| `text-4xl`  | 36px   | 1.2         | 700         | H2 landing desktop                         |
| `text-5xl`  | 48px   | 1.15        | 700         | H1 landing                                 |
| `text-6xl`  | 60px   | 1.1         | 700         | H1 landing large screens                   |

### 4.3 Hierarchy par composant

| Élément                       | Font     | Taille  | Weight  | Couleur            |
| ----------------------------- | -------- | ------- | ------- | ------------------ |
| H1 landing                    | Fraunces | 5xl-6xl | 700     | anthracite         |
| H2 landing                    | Fraunces | 3xl-4xl | 700     | anthracite         |
| H3 landing                    | Inter    | 2xl     | 600     | anthracite         |
| Titre foodtruck (page client) | Fraunces | 3xl     | 600     | accent foodtrucker |
| Body landing                  | Inter    | base    | 400     | text-primary       |
| H1 dashboard (titre page)     | Inter    | 2xl     | 600     | anthracite         |
| H2 dashboard (section)        | Inter    | lg      | 600     | anthracite         |
| H3 card title                 | Inter    | base    | 600     | anthracite         |
| Body dashboard                | Inter    | sm-base | 400     | text-primary       |
| Label form                    | Inter    | sm      | 500     | text-secondary     |
| Caption / hint                | Inter    | xs      | 400-500 | text-tertiary      |
| Button                        | Inter    | sm-base | 600     | (selon variant)    |

### 4.4 Règles de pairing

- **Fraunces pour le mémorable**, **Inter pour le fonctionnel**
- Jamais Fraunces dans un formulaire ou un tableau de données (fatigue de lecture)
- Jamais Inter pour le H1 de la landing (manque de personnalité)
- En cas de doute, **Inter par défaut**

### 4.5 Loading optimization

- `font-display: swap` pour éviter le FOIT (invisible text flash)
- Preconnect aux deux domaines Google Fonts dans `<head>`
- Charger uniquement les weights utilisés (4 Inter + 3 Fraunces)
- Auto-hosting via fontsource → Phase C optionnel

---

## 5. Iconographie

### 5.1 Bibliothèque

**lucide-react** conservé. Source unique. ~106 fichiers l'importent déjà.

### 5.2 Style

- **Line icons exclusivement** (pas de filled, sauf cas exceptionnel comme `Star fill-amber-400` pour ratings)
- **Stroke width 2** par défaut (= défaut lucide)
- Couleur : `inherit` du parent, ou explicite via classe Tailwind (`text-corail-500`, `text-text-secondary`)

### 5.3 Tailles standardisées

| Taille | Classe        | Usage                                      |
| ------ | ------------- | ------------------------------------------ |
| 12px   | `w-3 h-3`     | Inline dans badges, indicateurs petits     |
| 14px   | `w-3.5 h-3.5` | Petites icônes dans texte sm               |
| 16px   | `w-4 h-4`     | **Standard** — icônes dans boutons, labels |
| 20px   | `w-5 h-5`     | Icônes dans toolbars, inputs, modales      |
| 24px   | `w-6 h-6`     | Icônes de navigation, header               |
| 32px   | `w-8 h-8`     | Empty states, sections de mise en avant    |

### 5.4 Règles d'usage

✅ **Do**

- Icône + texte côte à côte (icône `w-4 h-4` + label) pour clarifier le contexte
- Icône seule SI le sens est sans ambiguïté (X pour fermer, loupe pour rechercher)

❌ **Don't**

- Mixer lucide et heroicons (déjà respecté)
- Surcharger une icône avec `strokeWidth={3}` ou plus (casse la cohérence)
- Utiliser des emojis comme icônes UI

### 5.5 Icônes signatures

Quelques icônes lucide reviennent souvent dans OnMange et méritent d'être référencées :

| Icône         | Usage                      |
| ------------- | -------------------------- |
| `Truck`       | Brand fallback, food truck |
| `ShoppingBag` | Commandes                  |
| `Calendar`    | Planning, dates            |
| `MapPin`      | Emplacement                |
| `Clock`       | Horaires                   |
| `Users`       | Clients                    |
| `Tag`         | Offres, promotions         |
| `Receipt`     | Factures                   |
| `Settings`    | Réglages                   |
| `LogOut`      | Déconnexion                |

---

## 6. Illustrations

### 6.1 Principe — line art monochrome

Style éditorial sobre, courbes douces, **pas de fill, pas de gradient**. Trait corail ou marine selon le contexte. Stroke width fin (1.5-2px). Présence visuelle dans les empty states, hero landing, page client, sans surcharger l'interface.

Ce n'est **pas du Notion-style coloré spot**. C'est plus proche d'une **illustration éditoriale de magazine** — line art épuré, parfois avec un petit accent de couleur.

### 6.2 Specs techniques

- **Format** : SVG vectoriel, accessible (rôle img + title)
- **Couleur** : `currentColor` pour hériter du contexte, ou couleurs explicites parmi corail / marine / anthracite
- **Stroke width** : 1.5-2px
- **Stroke linecap** : `round`
- **Stroke linejoin** : `round`
- **Pas de fill** sauf masque blanc sur certaines surfaces pour profondeur
- **Pas de gradient, pas de shadow, pas de blur**

### 6.3 Où les utiliser

| Surface                | Illustrations                                         |
| ---------------------- | ----------------------------------------------------- |
| Landing hero           | 1 illustration large (food truck stylisé, ~400x300px) |
| Landing sections       | 2-3 illustrations spot (~120x120px)                   |
| Empty states dashboard | 1 illustration par empty state principal (~80x80px)   |
| Page client publique   | 1 illustration de couverture optionnelle              |
| Page 404 / erreur      | 1 illustration humaine ("ça arrive...")               |

### 6.4 Exemples concrets

**Empty state — aucune commande** (~80x80px) :

```html
<svg
  width="80"
  height="80"
  viewBox="0 0 80 80"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  class="text-corail-500"
>
  <path d="M10 50 L10 35 L28 35 L33 25 L55 25 L55 50 Z" />
  <circle cx="22" cy="55" r="5" />
  <circle cx="48" cy="55" r="5" />
  <path d="M55 50 L70 50 L70 40 L60 40 L55 40" />
  <path d="M37 18 Q35 14 37 10" />
  <path d="M44 18 Q46 14 44 10" />
  <path d="M5 50 L65 50" />
</svg>
```

**Empty state — aucun client** (~80x80px) :

```html
<svg
  width="80"
  height="80"
  viewBox="0 0 80 80"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  class="text-marine-500"
>
  <circle cx="40" cy="30" r="10" />
  <path d="M20 60 Q20 45 40 45 Q60 45 60 60" />
  <path d="M15 45 Q15 38 22 38" />
  <path d="M65 45 Q65 38 58 38" />
</svg>
```

### 6.5 Production

**Note honnête** : un set cohérent de 8-10 illustrations OnMange demande soit :

- Un illustrateur freelance (300-1000€ pour un set complet sur Dribbble/Behance)
- Toi sur Figma ou Illustrator
- Un mix : 2-3 illustrations "phares" commandées à un pro, le reste fait maison

Pour démarrer Phase B, on implémente le système avec **3 illustrations SVG placeholders** que je crée en simple, à remplacer progressivement.

---

## 7. Spacing, radius, shadows

### 7.1 Échelle spacing

Tailwind defaults conservés. Base **4px**. À utiliser systématiquement via classes Tailwind.

| Token      | px  | Usage typique               |
| ---------- | --- | --------------------------- |
| `space-1`  | 4   | Gaps minimal, padding micro |
| `space-2`  | 8   | Gaps entre icône et texte   |
| `space-3`  | 12  | Padding interne petit       |
| `space-4`  | 16  | Padding interne standard    |
| `space-6`  | 24  | Padding cards               |
| `space-8`  | 32  | Sections internes           |
| `space-12` | 48  | Sections importantes        |
| `space-16` | 64  | Sections landing            |
| `space-24` | 96  | Hero / footer landing       |

### 7.2 Border radius

| Token          | Valeur        | Usage                                    |
| -------------- | ------------- | ---------------------------------------- |
| `rounded-none` | 0             | Tableaux denses                          |
| `rounded-sm`   | 4px           | Tags, micro-badges                       |
| `rounded-md`   | 8px           | Boutons sm, badges, inputs petits        |
| `rounded-lg`   | 12px (custom) | Boutons standard, inputs, cards internes |
| `rounded-xl`   | 16px (custom) | Cards principales, modales               |
| `rounded-2xl`  | 24px (custom) | Cards hero                               |
| `rounded-full` | 9999px        | Avatars, dots, pills                     |

**Cohérence** : la radius augmente avec l'importance de l'élément. Tag = `rounded-md`, card hero = `rounded-2xl`.

### 7.3 Shadows

| Token               | Valeur CSS                             | Usage                |
| ------------------- | -------------------------------------- | -------------------- |
| `shadow-card`       | `0 4px 12px rgba(45, 45, 45, 0.06)`    | Cards au repos       |
| `shadow-card-hover` | `0 8px 24px rgba(45, 45, 45, 0.10)`    | Cards au hover       |
| `shadow-cta`        | `0 4px 16px rgba(249, 112, 102, 0.25)` | Boutons CTA corail   |
| `shadow-cta-hover`  | `0 6px 24px rgba(249, 112, 102, 0.35)` | Boutons CTA hover    |
| `shadow-modal`      | `0 24px 48px rgba(45, 45, 45, 0.18)`   | Modales (drop élevé) |

**Changement vs l'existant** : remplacer `rgba(0,0,0,...)` par `rgba(45,45,45,...)` pour des ombres plus chaudes, cohérentes avec le canvas crème.

### 7.4 Transitions

| Cas                              | Durée | Easing                         |
| -------------------------------- | ----- | ------------------------------ |
| Hover (couleur, opacity)         | 150ms | `ease-out`                     |
| State change (toggle, accordion) | 200ms | `ease-in-out`                  |
| Modal open / close               | 250ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Page transition                  | 300ms | `ease-out`                     |

Pas de transition sur transformations 3D, pas de bounce.

---

## 8. Composants atomiques

Tous les composants vivent dans `packages/shared/src/components/` et sont importés par dashboard et client. La landing peut les utiliser ou rester sur ses composants custom (à harmoniser en Phase C).

### 8.1 Button

```ts
type ButtonProps = {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children: ReactNode;
};
```

| Variant     | Background  | Text         | Border           | Hover        |
| ----------- | ----------- | ------------ | ---------------- | ------------ |
| `primary`   | corail-600  | white        | none             | corail-700   |
| `secondary` | marine-500  | white        | none             | marine-600   |
| `outline`   | transparent | corail-700   | corail-500 1.5px | corail-50 bg |
| `ghost`     | transparent | text-primary | none             | sand-200 bg  |
| `danger`    | error-500   | white        | none             | error-600    |

⚠️ Note : `primary` utilise `corail-600` au lieu de `corail-500` pour garantir le contraste AA avec texte blanc. `corail-500` reste utilisable en grand format (CTA hero) où le AA Large s'applique.

| Size | Padding     | Font size        | Radius            | Height |
| ---- | ----------- | ---------------- | ----------------- | ------ |
| `sm` | px-3 py-1.5 | text-sm (14px)   | rounded-md (8px)  | 32px   |
| `md` | px-4 py-2   | text-sm (14px)   | rounded-lg (12px) | 40px   |
| `lg` | px-6 py-3   | text-base (16px) | rounded-lg (12px) | 48px   |

**Loading state** : remplace le contenu par un spinner, conserve la largeur (no layout shift).

### 8.2 Badge

```ts
type BadgeProps = {
  variant: 'default' | 'corail' | 'marine' | 'success' | 'warning' | 'error' | 'info' | 'pending';
  size: 'sm' | 'md';
  children: ReactNode;
};
```

| Variant   | Background           | Text                  |
| --------- | -------------------- | --------------------- |
| `default` | sand-200             | text-primary          |
| `corail`  | corail-50            | corail-800            |
| `marine`  | marine-50            | marine-800            |
| `success` | success-50 (#EEF3E6) | success-800 (#465A37) |
| `warning` | warning-50 (#FBF3E2) | warning-800 (#7A5A24) |
| `error`   | error-50 (#F8E7E3)   | error-800 (#6F2E1F)   |
| `info`    | marine-50            | marine-800            |
| `pending` | pending-50 (#FBF1DD) | pending-800 (#7A5828) |

⚠️ **Important** : supprimer définitivement les CSS classes `.badge-primary` dans les `index.css` des deux packages. Utiliser uniquement le composant React.

### 8.3 Card

```ts
type CardProps = {
  variant: 'default' | 'hover' | 'outlined';
  padding: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
};
```

| Variant    | Background      | Border               | Shadow                                   |
| ---------- | --------------- | -------------------- | ---------------------------------------- |
| `default`  | surface (white) | border-default 0.5px | shadow-card                              |
| `hover`    | surface         | border-default 0.5px | shadow-card → shadow-card-hover on hover |
| `outlined` | transparent     | border-default 1px   | none                                     |

Radius par défaut : `rounded-xl` (16px).

### 8.4 Input / Textarea / Select

Specs communes :

- Hauteur input/select : **40px** (h-10)
- Hauteur textarea min : **80px**
- Background : `surface` (white)
- Border : `border-default` 1px
- Border focus : `corail-500` 1.5px + shadow `0 0 0 3px corail-100`
- Border error : `error-500` 1.5px + shadow `0 0 0 3px error-50`
- Padding : `px-3 py-2`
- Font : Inter, text-sm
- Radius : `rounded-lg` (12px)
- Placeholder : `text-tertiary`
- Disabled : `bg-sand-200`, `text-tertiary`, cursor-not-allowed

### 8.5 Modal

```ts
type ModalProps = {
  open: boolean;
  onClose: () => void;
  size: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  title?: string;
  footer?: ReactNode;
  closeOnEscape?: boolean;
  closeOnOverlay?: boolean;
  children: ReactNode;
};
```

Sizes :

- `sm` : max-w-md (28rem)
- `md` : max-w-lg (32rem)
- `lg` : max-w-2xl (42rem)
- `xl` : max-w-4xl (56rem)
- `full` : max-w-7xl

Specs :

- Overlay : `bg-anthracite/45 backdrop-blur-sm`
- Container : `bg-surface rounded-2xl shadow-modal`
- Header : padding `px-6 py-4`, border-bottom `border-default 0.5px`
- Body : padding `px-6 py-4`
- Footer : padding `px-6 py-4`, border-top `border-default 0.5px`

### 8.6 EmptyState (nouveau pattern)

Remplace les empty states secs par un pattern chaleureux :

```tsx
<EmptyState
  illustration="no-orders"
  title="Pas encore de commande aujourd'hui"
  description="Elles vont arriver. En attendant, profite-en pour vérifier ton menu ou tes horaires."
  action={{ label: 'Voir mon menu', onClick: () => navigate('/menu') }}
/>
```

Specs visuelles :

- Illustration line art (corail ou marine) **80x80px** centrée
- Title : text-lg, weight 600, text-primary
- Description : text-sm, weight 400, text-secondary, max-width 320px
- Action optionnel : button variant=outline size=md
- Padding vertical : py-12

Voir section 9.3 pour les wordings concrets.

### 8.7 Toast (à créer)

Manquant aujourd'hui. À implémenter en Phase B :

```ts
type ToastProps = {
  variant: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
  duration?: number; // ms, default 4000
  action?: { label: string; onClick: () => void };
};
```

Position : bottom-right desktop, bottom-full-width mobile.
Animation : slide-up + fade-in (200ms).
Auto-dismiss après `duration`, ou manuel via croix.

---

## 9. Voice & tone

### 9.1 Principes éditoriaux

1. **Court vaut mieux que long**. Si on peut couper la moitié, on coupe.
2. **Concret vaut mieux qu'abstrait**. "37 commandes aujourd'hui" > "Une activité dynamique".
3. **Humain vaut mieux que corporate**. "Tes commandes" > "Vos transactions".
4. **Honnête vaut mieux que flatteur**. On ne dit pas "Génial !", on dit ce qu'il faut.
5. **Pas de jargon**. "Annuler" > "Effectuer le processus d'annulation".
6. **Pas d'emoji** dans l'UI (sauf cas humain rare). On compte sur la typo et les illustrations.

### 9.2 Tutoiement / vouvoiement par surface

| Surface                      | Forme  | Justification                                |
| ---------------------------- | ------ | -------------------------------------------- |
| Landing onmange.app          | Vous   | Public découverte, visiteur externe          |
| Dashboard pro.onmange.app    | **Tu** | Outil intime du foodtrucker, usage quotidien |
| Page client publique         | Vous   | Visiteur qui découvre le foodtruck           |
| Emails au foodtrucker        | Tu     | Cohérent avec dashboard                      |
| Emails au client final       | Vous   | Cohérent avec page client                    |
| Pages 404/erreur (dashboard) | Tu     | Cohérent                                     |
| Pages 404/erreur (client)    | Vous   | Cohérent                                     |

**Transition landing → dashboard** : la landing parle en vous jusqu'au signup. L'email de bienvenue marque le passage : _"Bienvenue dans OnMange. À partir d'ici, on se tutoie."_

### 9.3 Réécriture des empty states

| Contexte                    | Actuel                           | Proposé                                                                             |
| --------------------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| Aucune commande aujourd'hui | "Aucune commande pour le moment" | "Pas encore de commande aujourd'hui. Elles vont arriver."                           |
| Aucun horaire               | "Aucun horaire configuré"        | "Tu n'as pas encore configuré tes horaires. Dis aux clients quand tu es ouvert."    |
| Aucun emplacement           | "Aucun emplacement configuré"    | "Aucun emplacement renseigné. Ajoute le lieu où tu seras pour qu'on te trouve."     |
| Aucune offre                | "Aucune offre"                   | "Aucune offre active. Une offre bien pensée peut booster tes commandes."            |
| Aucun article supprimé      | "Aucun article supprimé"         | "La corbeille est vide."                                                            |
| Aucune donnée analytics     | "Aucune donnée"                  | "Pas encore assez de données pour afficher des stats. Reviens dans quelques jours." |
| Filtre client vide          | "Aucun client trouvé"            | "Aucun client ne correspond à ta recherche."                                        |
| Aucune réservation          | "Aucune réservation"             | "Aucune réservation sur cette date. Change de date ou ajoute-en une."               |

### 9.4 Réécriture des messages d'erreur

| Actuel                                         | Proposé                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| "Erreur de chargement des commandes"           | "Impossible de charger les commandes. Réessaie dans un instant."              |
| "Erreur lors de l'annulation"                  | "L'annulation n'a pas pu être enregistrée. Vérifie ta connexion et réessaie." |
| "Erreur de mise à jour du statut"              | "Le statut n'a pas pu être mis à jour. Réessaie."                             |
| "Erreur lors de la sauvegarde de l'offre"      | "L'offre n'a pas pu être sauvegardée. Vérifie les champs en rouge."           |
| "Sélectionnez au moins un article déclencheur" | "Choisis au moins un article qui déclenche l'offre."                          |
| "Aucun compte trouvé avec cet email"           | "Aucun compte associé à cet email."                                           |

**Pattern** : dire ce qui n'a pas marché + proposer la suite. Pas de "Une erreur est survenue" générique.

### 9.5 Réécriture des CTAs

| Contexte               | Actuel                          | Proposé                                                   |
| ---------------------- | ------------------------------- | --------------------------------------------------------- |
| Landing hero           | "Essayer gratuitement 14 jours" | (conserver)                                               |
| Sauvegarder en général | "Sauvegarder"                   | "Enregistrer"                                             |
| Confirmer suppression  | "Confirmer"                     | "Supprimer"                                               |
| Confirmer cancel       | "Confirmer"                     | "Annuler la commande"                                     |
| Empty state action     | "Ajouter"                       | "Créer ma première offre" / "Ajouter mon premier article" |
| Onboarding next        | "Suivant"                       | "Continuer"                                               |

**Règle** : les boutons d'action **disent ce qu'ils font**. "Confirmer" est paresseux. "Supprimer définitivement" est précis.

### 9.6 Messages de succès / toasts

Pattern : 1 ligne, factuel, jamais d'exclamation gratuite.

| Contexte           | Proposé                                  |
| ------------------ | ---------------------------------------- |
| Offre créée        | "Offre créée et active."                 |
| Article ajouté     | "Article ajouté à ton menu."             |
| Horaire enregistré | "Horaires enregistrés."                  |
| Compte créé        | "Bienvenue dans OnMange."                |
| Connexion réussie  | (pas de toast — redirection silencieuse) |
| Email envoyé       | "Email envoyé à {email}."                |

**Anti-pattern à éviter** : "Super !", "Génial !", "Action effectuée avec succès !"

### 9.7 Glossaire OnMange — vocabulaire à utiliser

| Terme préféré   | À éviter                      | Pourquoi                       |
| --------------- | ----------------------------- | ------------------------------ |
| Pré-commande    | Réservation, ticket           | Mot signature OnMange          |
| Créneau         | Slot, horaire de retrait      | Plus clair en français         |
| Offre           | Promotion, code promo, remise | Couvre tous les types d'offres |
| Foodtruck       | Food truck                    | Un seul mot, plus moderne      |
| Emplacement     | Lieu, location                | Précis (= où le truck se gare) |
| Tableau de bord | Dashboard                     | Français                       |
| Menu            | Carte                         | Plus reconnu en food truck     |
| Article         | Produit, item                 | Notre terme système            |
| Catégorie       | Section, rayon                | Aligne avec BDD                |
| Client          | Acheteur, consommateur        | Le plus naturel                |

### 9.8 Tonalité par contexte émotionnel

| Situation                    | Tonalité                                      | Exemple                                                                                             |
| ---------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Première commande reçue      | Chaleureux, célébratoire (sans en faire trop) | "Première commande reçue. C'est parti."                                                             |
| Erreur récurrente            | Calme, factuel, solution-oriented             | "Plusieurs tentatives ont échoué. Vérifie ta connexion ou contacte le support."                     |
| Compte bientôt facturé (J-3) | Informatif, sans pression                     | "Ton essai gratuit se termine dans 3 jours. Tu seras facturé 29€ HT le 12 juin si tu ne fais rien." |
| Suspension compte            | Direct, options claires                       | "Ton paiement de mai n'a pas pu être prélevé. Tu as 7 jours pour régulariser avant suspension."     |
| Onboarding                   | Encourageant, court                           | "Trois étapes et tu commences à recevoir des commandes."                                            |

---

## 10. Application par surface

L'identité OnMange n'a pas la même intensité partout.

### 10.1 Landing (onmange.app) — intensité MAX 🔥🔥🔥

C'est la vitrine, c'est là qu'on convertit. Tous les marqueurs identitaires sont déployés.

| Élément             | Application                                                     |
| ------------------- | --------------------------------------------------------------- |
| Headlines           | **Fraunces** 5xl-6xl 700                                        |
| Body                | Inter base-lg 400                                               |
| Background sections | Alternance `canvas` (#FFFBF5) et `sand-100` (#FFF1E8)           |
| Couleur dominante   | Corail (CTA, accents)                                           |
| Couleur secondaire  | Marine (icônes, sous-titres, illustrations détail)              |
| Illustrations       | Hero illustration 400x300, spots 120x120 dans chaque section    |
| Photos              | Photo lifestyle réelle (food trucks IRL) pour le mockup central |
| Forme               | Vouvoiement                                                     |
| Animations          | Riches (fade-in, slide-up, parallax léger sur scroll)           |

### 10.2 Dashboard (pro.onmange.app) — intensité MESURÉE 🔥

Outil de travail utilisé quotidiennement. Lisibilité > expression.

| Élément              | Application                                                       |
| -------------------- | ----------------------------------------------------------------- |
| Headlines            | **Inter** 2xl 600 (pas de Fraunces — fatigue de lecture)          |
| Body                 | Inter sm-base 400                                                 |
| Background pages     | `canvas` (#FFFBF5) — réchauffé vs #FAFAFA actuel                  |
| Background cards     | `surface` (#FFFFFF)                                               |
| Sidebar              | `anthracite` (#2D2D2D) conservé — signature                       |
| Accent sidebar actif | Corail (item actif)                                               |
| Couleur dominante UI | Neutres + corail pour les CTAs                                    |
| Marine               | Liens, boutons secondary, badges info                             |
| Illustrations        | Empty states (80x80) uniquement                                   |
| Photos               | Pas de photo stock — uniquement photos clients dans contexte data |
| Forme                | Tutoiement                                                        |
| Animations           | Mesurées (transitions 150-200ms, pas de scroll effects)           |

### 10.3 Page client publique (onmange.app/`slug`) — intensité NEUTRE + ACCENT FOODTRUCKER

Vitrine du foodtrucker, pas d'OnMange. La plateforme s'efface.

| Élément            | Application                                                              |
| ------------------ | ------------------------------------------------------------------------ |
| Titre du foodtruck | **Fraunces** 3xl 600 — couleur = **accent foodtrucker**                  |
| Body               | Inter sm-base 400                                                        |
| Background         | `surface` (#FFFFFF) ou `canvas` (#FFFBF5) selon densité                  |
| Couleur dominante  | **Accent foodtrucker** (corail par défaut, 8 couleurs au choix)          |
| Marine             | Réservé aux états système (info, liens techniques)                       |
| Sémantiques        | Standard (olive success, terra cuite error, etc.)                        |
| Footer OnMange     | Discret — "Powered by OnMange" en text-xs text-tertiary                  |
| Forme              | Vouvoiement                                                              |
| Photos             | Photos produits du foodtrucker                                           |
| Illustrations      | Une illustration de couverture optionnelle (uploadée par le foodtrucker) |

**Le bouton "Ajouter au panier" prend la couleur d'accent du foodtrucker.** L'expérience d'achat est cohérente avec leur marque.

### 10.4 Emails transactionnels — intensité MOYENNE 🔥🔥

| Élément            | Application                                               |
| ------------------ | --------------------------------------------------------- |
| Header email       | Logo OnMange (corail) + nom du foodtrucker                |
| Headlines          | **Inter** (pas de Fraunces — compatibilité email clients) |
| Couleur principale | Corail (CTA) ou marine (info) selon contexte              |
| Background         | `canvas` (#FFFBF5) ou `surface` (#FFFFFF)                 |
| Footer             | OnMange brand discret                                     |
| Forme              | Au foodtrucker = tu / Au client = vous                    |

### 10.5 Pages erreur (404, 500, maintenance) — intensité HUMAINE

Ces pages sont des moments inattendus. On évite la sécheresse "Error 404".

| Élément      | Application                                                                          |
| ------------ | ------------------------------------------------------------------------------------ |
| Illustration | Line art humain (un food trucker qui regarde au loin, etc.)                          |
| Headline     | Fraunces 3xl-4xl, ton humain : "On s'est perdu en route", "Quelque chose a déraillé" |
| Body         | Inter, explication courte + action proposée                                          |
| Action       | Bouton "Retour à l'accueil" + lien support                                           |

---

## 11. Personnalisation foodtrucker

### 11.1 Vue d'ensemble

Chaque foodtrucker choisit **une couleur d'accent** parmi la palette curatée OnMange. Cette couleur habille sa page client publique sans changer la structure ou la typo. Le foodtrucker peut aussi uploader son **logo** et sa **photo de couverture**.

L'objectif : permettre une vraie identité visuelle sans color picker libre qui produirait du moche.

### 11.2 Palette curatée — détail

| Nom             | Hex       | Ratio texte blanc | Vibe                         |
| --------------- | --------- | ----------------- | ---------------------------- |
| Corail (défaut) | `#F97066` | 3.1:1 AA Large    | Chaleureux universel         |
| Marine          | `#1E3A5F` | 11.2:1 AAA        | Sobre, élégant               |
| Olive           | `#6B7A3F` | 5.3:1 AA          | Naturel, terroir             |
| Terra cuite     | `#B84A36` | 5.1:1 AA          | Rustique, chaleureux         |
| Safran          | `#D4A04E` | 2.4:1 ❌          | Solaire (texte foncé requis) |
| Anthracite      | `#2D2D2D` | 14.4:1 AAA        | Minimal, premium             |
| Aubergine       | `#5A3D4F` | 9.4:1 AAA         | Sophistiqué                  |
| Vert sapin      | `#2D5944` | 9.2:1 AAA         | Forestier, brasserie         |

⚠️ Pour **Safran** (contraste insuffisant texte blanc), le composant doit basculer automatiquement le texte sur l'accent en **anthracite #2D2D2D**. Logique à implémenter dans le composant button/badge :

```tsx
function getTextColorOnAccent(accentHex: string): string {
  const LIGHT_ACCENTS = ['#D4A04E']; // Safran
  return LIGHT_ACCENTS.includes(accentHex) ? '#2D2D2D' : '#FFFFFF';
}
```

### 11.3 Surfaces affectées par l'accent

Quand le foodtrucker pick une couleur, elle s'applique aux :

- **Titre du foodtruck** en haut de la page client (Fraunces 3xl 600)
- **Bouton "Ajouter au panier"** (background = accent, text = white ou anthracite selon)
- **Bouton "Choisir" / "Voir options"** (background = accent)
- **Badges "Disponible" / "Indisponible"** (light variant : accent-50 bg / accent-800 text)
- **Icône de section** dans le menu (couleur = accent)
- **Indicateur "Foodtruck ouvert"** (dot ou bordure)

### 11.4 Surfaces NON affectées

- Background page (reste `canvas` / `surface`)
- Typo (reste Fraunces titre + Inter body)
- Bordures, séparateurs
- Texte body, sous-titres
- Sémantiques système (success, warning, error, info)
- Footer OnMange

### 11.5 Implémentation technique

**BDD** : vérifier si `foodtrucks.brand_accent_color` existe. Si oui, mettre à jour la contrainte CHECK. Si non, créer :

```sql
ALTER TABLE foodtrucks
  ADD COLUMN brand_accent_color TEXT DEFAULT '#F97066'
    CHECK (brand_accent_color IN (
      '#F97066', '#1E3A5F', '#6B7A3F', '#B84A36',
      '#D4A04E', '#2D2D2D', '#5A3D4F', '#2D5944'
    ));
```

**Frontend page client** : injecter via variable CSS au root :

```tsx
<div style={{ '--accent': foodtruck.brand_accent_color } as CSSProperties}>
  {/* contenu page client */}
</div>
```

Composants concernés :

```css
.add-to-cart-button {
  background: var(--accent, var(--color-corail-500));
  color: var(--accent-on, white);
}
```

**UI Settings** : section "Apparence" :

```tsx
<RadioGroup value={accentColor} onValueChange={setAccentColor}>
  {PALETTE.map((color) => (
    <Radio key={color.hex} value={color.hex}>
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full" style={{ background: color.hex }} />
        <span>{color.name}</span>
      </div>
    </Radio>
  ))}
</RadioGroup>
```

Avec **preview en temps réel** d'un mock de la page client à droite.

### 11.6 Évolution future (Phase B+)

- **Plan Premium** : color picker libre (avec validation contraste auto)
- **Custom logo upload** : déjà supporté ? Vérifier
- **Photo de couverture** : déjà supportée ? Vérifier
- **Custom domain** : foodtruck.com → onmange.app/foodtruck — chantier mois 6+

---

## 12. Migration & dette technique

Tout ce qu'il faut nettoyer pour passer de l'état actuel à la nouvelle identité.

### 12.1 Oranges parasites

| Hex parasite | Fichier                                                     | Action                         |
| ------------ | ----------------------------------------------------------- | ------------------------------ |
| `#ed7b20`    | `client/index.html:8` (theme-color meta)                    | → `#F97066`                    |
| `#ed7b20`    | `client/vite.config.ts:17`                                  | → `#F97066`                    |
| `#ed7b20`    | Favicons SVG client + dashboard                             | Re-générer en corail `#F97066` |
| `#e55a2b`    | `dashboard/src/index.css:246` (.badge-primary color)        | Supprimer classe               |
| `#e55a2b`    | `client/src/index.css:124` (.badge-primary color)           | Supprimer classe               |
| `#fff7ed`    | `dashboard/src/index.css:245` (.badge-primary bg)           | Supprimer                      |
| `#fff7ed`    | `client/src/index.css:123` (.badge-primary bg)              | Supprimer                      |
| `#e85d4a`    | `dashboard/src/pages/Settings/EmbedButtonSection.tsx:22-24` | → `#F97066`                    |
| `#1e293b`    | `dashboard/src/pages/Analytics/index.tsx:223,306`           | → marine-500 `#1E3A5F`         |

### 12.2 Duplication CSS / React

Les classes `.btn-*`, `.badge-*`, `.card-*` dans les `index.css` doublonnent les composants React de `shared/`. Plan :

1. **Phase B** : créer `packages/shared/src/styles/tokens.css`, importé par tous les `index.css`
2. **Phase B+** : déprécier les classes CSS legacy (commentaire `@deprecated`)
3. **Phase C** : remplacer `<button className="btn-primary">` par `<Button variant="primary">` partout
4. **Phase C+** : supprimer définitivement les classes CSS legacy

### 12.3 Typographie scindée

État actuel :

- Landing : Inter (Google Fonts)
- Dashboard : system stack
- Client : system stack

Phase B :

1. Ajouter Inter dans `dashboard/index.html` et `client/index.html` (preconnect + link)
2. Mettre à jour `tailwind.config.js` des 3 packages : `fontFamily.sans = ['Inter', '-apple-system', ...]`
3. Ajouter Fraunces dans `landing/index.html` uniquement (Phase B5)
4. Ajouter Fraunces dans `client/index.html` pour le titre du foodtruck (chargement scoped)
5. Tester FOIT / FOUT sur les 3 packages

### 12.4 Tokens centralisés

Structure proposée :

```
packages/shared/src/styles/
├── tokens.css       # Variables CSS (sections 3, 7 du doc)
├── reset.css        # Reset CSS minimal
└── index.css        # @import tokens + reset
```

Import depuis chaque package :

```css
/* packages/dashboard/src/index.css */
@import '@onmange/shared/styles/index.css';
/* ... styles spécifiques dashboard ... */
```

### 12.5 Tailwind configs synchronisées

Aujourd'hui : 3 `tailwind.config.js` indépendants synchronisés à la main.

Phase B : créer `packages/shared/tailwind.preset.js` qui contient toute la palette + typo + radius + shadows :

```js
// packages/dashboard/tailwind.config.js
module.exports = {
  presets: [require('@onmange/shared/tailwind.preset.js')],
  content: ['./src/**/*.{ts,tsx}'],
  // overrides spécifiques dashboard si nécessaire
};
```

### 12.6 Empty states et messages à réécrire

Tous les wordings de la section 9 doivent être appliqués dans le code. Fichiers prioritaires :

- `dashboard/src/pages/Orders/components/EmptyState.tsx`
- `dashboard/src/pages/Menu/components/EmptyState.tsx`
- `dashboard/src/pages/Offers/components/EmptyState.tsx`
- `dashboard/src/pages/Schedule/components/EmptyState.tsx`
- `dashboard/src/pages/Analytics/...`
- Tous les fichiers contenant "Erreur lors de" ou "Erreur de"

### 12.7 Plan d'implémentation Phase B — ordre proposé

**Sprint B1 — Fondations tokens** (1 session Claude Code)

1. Créer `packages/shared/src/styles/tokens.css` avec toutes les variables CSS
2. Créer `packages/shared/tailwind.preset.js` qui consomme ces variables
3. Mettre à jour les 3 `tailwind.config.js` pour utiliser le preset
4. Mettre à jour les 3 `index.css` pour import tokens.css
5. Ajouter Inter dans dashboard/client `index.html`
6. Régression visuelle : rien ne doit casser
7. Commit "feat(brand): centralized design tokens"

**Sprint B2 — Nettoyage oranges parasites** (1 session)

1. Re-générer les favicons SVG en corail #F97066
2. Mettre à jour `theme-color` meta sur client en #F97066
3. Remplacer #e55a2b, #e85d4a, #fff7ed dans les fichiers concernés
4. Supprimer les classes CSS `.badge-primary`
5. Commit "fix(brand): clean parasitic orange colors"

**Sprint B3 — Palette enrichie + sémantiques avec saveur** (1 session)

1. Ajouter Marine (ramp complète) au tokens.css
2. Remplacer les sémantiques Tailwind par les nouvelles (olive, safran, terra cuite)
3. Mettre à jour les composants Badge avec les nouveaux variants
4. Régression visuelle ciblée sur badges et statuts
5. Commit "feat(brand): warm semantic palette"

**Sprint B4 — Background canvas + sand** (1 session)

1. Passer le body de #FAFAFA à #FFFBF5
2. Mettre à jour les shadows (rgba 0,0,0 → rgba 45,45,45)
3. Vérifier le rendu sur les 3 packages
4. Commit "feat(brand): warmer canvas background"

**Sprint B5 — Typographie Fraunces + échelle** (1 session)

1. Charger Fraunces sur landing
2. Refonte des H1-H2 landing avec Fraunces
3. Charger Fraunces sur client (titre foodtruck uniquement)
4. Refonte du titre foodtruck en Fraunces sur page client
5. Vérifier performance (preconnect, font-display)
6. Commit "feat(brand): Fraunces serif headlines"

**Sprint B6 — Personnalisation foodtrucker** (1 session)

1. Ajouter / mettre à jour `foodtrucks.brand_accent_color`
2. Créer la section "Apparence" dans Settings
3. Implémenter le RadioGroup avec preview en temps réel
4. Appliquer l'accent dans les composants page client
5. Tester avec les 8 couleurs (notamment Safran + fallback texte)
6. Commit "feat(client): foodtrucker brand accent customization"

**Sprint B7 — Voice & tone** (1 session ou étalé)

1. Réécrire tous les empty states selon section 9
2. Réécrire tous les messages d'erreur
3. Réécrire les CTAs critiques
4. Passer le dashboard au tutoiement (vérification exhaustive)
5. Garder vouvoiement sur landing et page client
6. Commit "feat(brand): voice and tone overhaul"

**Sprint B8 — EmptyState illustrations** (1 session)

1. Implémenter le composant EmptyState v2 avec slot illustration
2. Créer 3-5 illustrations SVG placeholders (food truck, commande, calendrier, etc.)
3. Remplacer les empty states existants par le nouveau composant
4. Commit "feat(brand): illustrated empty states"

**Sprint B9 — Refonte logo** (chantier externe ou maison)

1. Décision : freelance designer OU mock soi-même
2. Production des variantes (full, compact, monogramme)
3. Mise à jour des références logo dans le code
4. Régénération favicons à partir du monogramme final
5. Commit "feat(brand): new logo"

**Sprint B10 — Landing refonte UI** (plusieurs sessions)

1. Refonte du hero avec illustration custom
2. Refonte des sections benefit / how-it-works avec illustrations spot
3. Ajout du fond canvas/sand alterné
4. Optimisation typographie Fraunces dans toutes les sections
5. Commit "feat(landing): brand refresh"

**Estimation globale Phase B** : 8-12 sessions Claude Code (~30-50h dev cumulé).

---

## 13. Annexes

### 13.1 Tailwind preset complet

À créer dans `packages/shared/tailwind.preset.js` :

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        corail: {
          50: '#FFF1E8',
          100: '#FFE4E1',
          200: '#FFCCC7',
          300: '#FFA69E',
          400: '#FF8075',
          500: '#F97066',
          600: '#E65A50',
          700: '#C44038',
          800: '#A33530',
          900: '#862D2B',
          950: '#491413',
        },
        marine: {
          50: '#EEF2F7',
          100: '#C7D0DD',
          200: '#93A4BC',
          300: '#5F779A',
          400: '#3D5879',
          500: '#1E3A5F',
          600: '#182F4D',
          700: '#11243B',
          800: '#0B1A29',
          900: '#060D17',
        },
        canvas: '#FFFBF5',
        surface: '#FFFFFF',
        sand: {
          100: '#FFF1E8',
          200: '#F5EDE2',
        },
        anthracite: '#2D2D2D',
        success: {
          50: '#EEF3E6',
          500: '#7A9460',
          600: '#5B7546',
          700: '#445A37',
          800: '#465A37',
        },
        warning: {
          50: '#FBF3E2',
          500: '#D4A04E',
          600: '#B0843A',
          700: '#8A6829',
          800: '#7A5A24',
        },
        error: {
          50: '#F8E7E3',
          500: '#C2553D',
          600: '#A33F2A',
          700: '#7D2F1F',
          800: '#6F2E1F',
        },
        pending: {
          50: '#FBF1DD',
          500: '#D9A45B',
          600: '#B5853E',
          700: '#8C6529',
          800: '#7A5828',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
      boxShadow: {
        card: '0 4px 12px rgba(45, 45, 45, 0.06)',
        'card-hover': '0 8px 24px rgba(45, 45, 45, 0.10)',
        cta: '0 4px 16px rgba(249, 112, 102, 0.25)',
        'cta-hover': '0 6px 24px rgba(249, 112, 102, 0.35)',
        modal: '0 24px 48px rgba(45, 45, 45, 0.18)',
      },
    },
  },
};
```

### 13.2 Tokens CSS complets

À créer dans `packages/shared/src/styles/tokens.css` :

```css
:root {
  /* Primary — Corail */
  --color-corail-50: #fff1e8;
  --color-corail-100: #ffe4e1;
  --color-corail-200: #ffccc7;
  --color-corail-300: #ffa69e;
  --color-corail-400: #ff8075;
  --color-corail-500: #f97066;
  --color-corail-600: #e65a50;
  --color-corail-700: #c44038;
  --color-corail-800: #a33530;
  --color-corail-900: #862d2b;

  /* Secondary — Marine */
  --color-marine-50: #eef2f7;
  --color-marine-100: #c7d0dd;
  --color-marine-200: #93a4bc;
  --color-marine-500: #1e3a5f;
  --color-marine-600: #182f4d;
  --color-marine-700: #11243b;
  --color-marine-800: #0b1a29;

  /* Neutrals */
  --color-canvas: #fffbf5;
  --color-surface: #ffffff;
  --color-sand-100: #fff1e8;
  --color-sand-200: #f5ede2;
  --color-text-primary: #2d2d2d;
  --color-text-secondary: #5f5e5a;
  --color-text-tertiary: #888780;
  --color-border-default: #e5e2da;
  --color-border-strong: #b4b2a9;

  /* Semantic */
  --color-success-50: #eef3e6;
  --color-success-500: #7a9460;
  --color-success-800: #465a37;

  --color-warning-50: #fbf3e2;
  --color-warning-500: #d4a04e;
  --color-warning-800: #7a5a24;

  --color-error-50: #f8e7e3;
  --color-error-500: #c2553d;
  --color-error-800: #6f2e1f;

  --color-info-50: #eef2f7;
  --color-info-500: #1e3a5f;
  --color-info-800: #0b1a29;

  --color-pending-50: #fbf1dd;
  --color-pending-500: #d9a45b;
  --color-pending-800: #7a5828;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-card: 0 4px 12px rgba(45, 45, 45, 0.06);
  --shadow-card-hover: 0 8px 24px rgba(45, 45, 45, 0.1);
  --shadow-cta: 0 4px 16px rgba(249, 112, 102, 0.25);
  --shadow-cta-hover: 0 6px 24px rgba(249, 112, 102, 0.35);
  --shadow-modal: 0 24px 48px rgba(45, 45, 45, 0.18);

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-serif: 'Fraunces', Georgia, serif;
}

body {
  background-color: var(--color-canvas);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
}
```

### 13.3 Inspirations et références

Marques qui ont nourri cette charte :

- **Too Good To Go** — la vibe convivial/artisanal de référence
- **Doctolib Pro** — le tutoiement professionnel maîtrisé
- **Sklum, Kave Home** — palette terreuse méditerranéenne, photographie lifestyle
- **Bleu mon Jules** — esthétique méditerranéenne rétro, bleu signature
- **The Bradery** — éditorial jeune, typo expressive
- **Apartamento, The Gentlewoman** — éditorial print, serif chaleureuses

### 13.4 Outils recommandés

| Besoin                 | Outil / Plateforme                                   | Budget indicatif                  |
| ---------------------- | ---------------------------------------------------- | --------------------------------- |
| Refonte logo           | Designer freelance via Comet / Dribbble              | 300-800€                          |
| Illustrations spot     | Illustrateur freelance via Behance / Dribbble        | 50-100€ par illustration          |
| Photographie lifestyle | Photographe local (food trucks IRL)                  | 400-800€ HT pour une demi-journée |
| Color contrast checker | webaim.org/resources/contrastchecker/                | Gratuit                           |
| Font self-hosting      | fontsource.org                                       | Gratuit                           |
| Brief logo type        | "wordmark sans-serif modern Mediterranean food tech" | -                                 |

### 13.5 Glossaire technique

- **FOIT** (Flash of Invisible Text) : texte invisible pendant le chargement de la font
- **FOUT** (Flash of Unstyled Text) : texte avec fallback puis swap à la font finale
- **WCAG** : Web Content Accessibility Guidelines (AA = 4.5:1 minimum texte normal, 3:1 texte large)
- **Brand accent** : couleur d'accent choisie par le foodtrucker pour personnaliser sa page client
- **Canvas** : fond principal des pages (#FFFBF5)
- **Sand** : famille de neutres chauds (sand-100, sand-200)

---

_Fin du document. Charte vivante — à éditer au fil des décisions._
_Pour toute évolution majeure, ouvrir une issue dans le repo OnMange._
