# Tests d'Intégration

Ces tests s'exécutent contre la **vraie base de données Supabase**. Ils créent de vraies données et les suppriment après.

## Configuration

### 1. Récupérer la clé service_role

1. Aller sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionner le projet `ueprfvraqcpqdljkhdji`
3. Aller dans **Settings > API**
4. Copier la clé `service_role` (⚠️ Ne jamais exposer cette clé publiquement !)

### 2. Configurer les variables d'environnement

Créer un fichier `.env.local` à la racine du projet :

```bash
# Ajouter cette ligne à .env.local
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Ou exporter la variable avant d'exécuter les tests :

```bash
export SUPABASE_SERVICE_ROLE_KEY="votre_clé_ici"
```

## Exécution

```bash
# Exécuter tous les tests d'intégration
pnpm test:integration

# Mode watch (relance les tests quand un fichier change)
pnpm test:integration:watch

# Exécuter un seul fichier
pnpm test:integration -- delete-account.test.ts
```

## Tests disponibles

| Fichier                  | Description                                                 |
| ------------------------ | ----------------------------------------------------------- |
| `delete-account.test.ts` | Test de suppression de compte avec toutes les données liées |
| `create-order.test.ts`   | Test de création de commande                                |

## Que testent-ils ?

### delete-account.test.ts

- ✅ Suppression d'un utilisateur sans foodtruck
- ✅ Suppression d'un utilisateur avec foodtruck complet (categories, options, menu items, etc.)
- ✅ Vérification que TOUTES les données liées sont supprimées
- ✅ Rejet des requêtes sans authentification
- ✅ Validation du schéma de base de données (noms de colonnes corrects)

### create-order.test.ts

- ✅ Création d'une commande valide
- ✅ Rejet des commandes sans champs requis
- ✅ Rejet des commandes avec foodtruck_id invalide

## Ajouter de nouveaux tests

1. Créer un fichier `*.test.ts` dans ce dossier
2. Utiliser les helpers de `setup.ts` pour créer/supprimer des données
3. Toujours nettoyer les données dans `afterAll`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser, deleteTestUser, createTestFoodtruck } from './setup';

describe('Ma fonctionnalité', () => {
  let testUser;

  beforeAll(async () => {
    testUser = await createTestUser();
  });

  afterAll(async () => {
    if (testUser?.user?.id) {
      await deleteTestUser(testUser.user.id);
    }
  });

  it('should work', async () => {
    // ...
  });
});
```

## ⚠️ Avertissements

- **Ne jamais exécuter en production** - Ces tests créent et suppriment des données réelles
- **Ne jamais committer la clé service_role** - Elle a des privilèges admin
- Les tests sont lents (~30s) car ils font de vraies requêtes réseau
