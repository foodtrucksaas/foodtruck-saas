import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests d'intégration sont plus lents (vraies requêtes réseau)
    testTimeout: 60000,
    hookTimeout: 60000,

    // Exécuter les tests séquentiellement (pas en parallèle)
    // car ils partagent la même base de données
    sequence: {
      concurrent: false,
    },

    // Fichiers de test d'intégration uniquement
    include: ['tests/integration/**/*.test.ts'],

    // Ne pas utiliser jsdom, on n'en a pas besoin pour les tests d'intégration
    environment: 'node',

    // Désactiver les globals pour éviter les conflits
    globals: false,
  },
});
