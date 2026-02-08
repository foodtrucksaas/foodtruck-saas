import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests d'intégration sont plus lents
    testTimeout: 30000,
    hookTimeout: 30000,

    // Exécuter les tests séquentiellement (pas en parallèle)
    // car ils partagent la même base de données
    sequence: {
      concurrent: false,
    },

    // Fichiers de test
    include: ['**/*.test.ts'],

    // Ne pas utiliser jsdom, on n'en a pas besoin
    environment: 'node',

    // Variables d'environnement
    env: {
      // Les variables seront chargées depuis .env.local ou .env
    },

    // Charger les variables d'environnement
    setupFiles: ['dotenv/config'],
  },
});
