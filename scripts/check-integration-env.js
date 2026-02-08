#!/usr/bin/env node

/**
 * Vérifie que les variables d'environnement nécessaires aux tests d'intégration sont configurées
 */

require('dotenv').config({ path: '.env.local' });

const requiredVars = [
  {
    name: 'SUPABASE_URL',
    fallback: 'VITE_SUPABASE_URL',
    description: 'URL du projet Supabase',
  },
  {
    name: 'SUPABASE_ANON_KEY',
    fallback: 'VITE_SUPABASE_ANON_KEY',
    description: 'Clé anonyme Supabase',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    fallback: null,
    description: 'Clé service_role Supabase (Dashboard > Settings > API)',
  },
];

console.log('\n🔍 Vérification des variables d\'environnement pour les tests d\'intégration\n');

let hasErrors = false;

for (const { name, fallback, description } of requiredVars) {
  const value = process.env[name] || (fallback ? process.env[fallback] : null);

  if (value) {
    const maskedValue = value.substring(0, 20) + '...' + value.substring(value.length - 10);
    console.log(`✅ ${name}: ${maskedValue}`);
  } else {
    console.log(`❌ ${name}: MANQUANT`);
    console.log(`   → ${description}`);
    if (name === 'SUPABASE_SERVICE_ROLE_KEY') {
      console.log(`   → Aller sur: https://supabase.com/dashboard/project/ueprfvraqcpqdljkhdji/settings/api`);
      console.log(`   → Copier la clé "service_role" et l'ajouter dans .env.local:`);
      console.log(`   → SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`);
    }
    hasErrors = true;
  }
}

console.log('');

if (hasErrors) {
  console.log('❌ Configuration incomplète. Corrigez les erreurs ci-dessus avant d\'exécuter les tests.\n');
  process.exit(1);
} else {
  console.log('✅ Configuration OK ! Vous pouvez exécuter: pnpm test:integration\n');
  process.exit(0);
}
