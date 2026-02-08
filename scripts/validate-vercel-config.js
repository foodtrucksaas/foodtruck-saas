#!/usr/bin/env node
/**
 * Validates Vercel routing configuration to prevent common deployment issues.
 * This script is run automatically before builds to catch routing bugs early.
 *
 * Common issues this prevents:
 * - Double-prefixing of paths (e.g., /dashboard/dashboard/assets)
 * - Incorrect regex patterns
 */

const fs = require('fs');
const path = require('path');

function getVercelConfig() {
  const combineDistPath = path.join(__dirname, 'combine-dist.js');
  const content = fs.readFileSync(combineDistPath, 'utf8');

  const configMatch = content.match(/const config = (\{[\s\S]*?\n\});/);
  if (!configMatch) {
    throw new Error('Could not find config in combine-dist.js');
  }

  const configStr = configMatch[1];
  const config = eval(`(${configStr})`);
  return config;
}

function validateRoutes(routes) {
  const errors = [];
  const warnings = [];

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];

    if (route.handle) continue;

    const routeDesc = `Route ${i + 1} (src: "${route.src}")`;

    // Check 1: Rewrite rules with continue:true that add a prefix
    // MUST have negative lookahead to avoid double-prefixing
    if (route.dest && route.continue === true) {
      const srcPattern = route.src;
      const destPattern = route.dest;

      const prefixMatch = destPattern.match(/^\/([^/$]+)\//);
      if (prefixMatch) {
        const prefix = prefixMatch[1];

        // Check if src is a catch-all that would match paths starting with the prefix
        const isCatchAll = srcPattern === '/(.*)'  ||
                           srcPattern === '/(.*)$' ||
                           srcPattern === '/(.+)' ||
                           srcPattern === '/(.+)$';

        if (isCatchAll) {
          errors.push(
            `${routeDesc}: CRITICAL - Catch-all pattern "${srcPattern}" with dest "${destPattern}" ` +
            `and "continue: true" WILL cause double-prefixing! ` +
            `Paths like "/${prefix}/assets/x.js" will become "/${prefix}/${prefix}/assets/x.js". ` +
            `FIX: Use "/(?!${prefix}/)(.*)$" to exclude paths already starting with "/${prefix}/".`
          );
        }
      }
    }

    // Check 2: Validate regex patterns
    if (route.src) {
      try {
        new RegExp(route.src);
      } catch (e) {
        errors.push(`${routeDesc}: Invalid regex pattern: ${e.message}`);
      }
    }

    // Check 3: Validate host patterns
    if (route.has) {
      for (const condition of route.has) {
        if (condition.type === 'host' && condition.value) {
          try {
            new RegExp(condition.value);
          } catch (e) {
            errors.push(`${routeDesc}: Invalid host regex "${condition.value}": ${e.message}`);
          }
        }
      }
    }
  }

  return { errors, warnings };
}

// Test specific routing scenarios
function testRoutingScenarios(routes) {
  const tests = [];

  // Find the dashboard rewrite rule
  const dashboardRewrite = routes.find(r =>
    r.dest && r.dest.includes('/dashboard/') &&
    r.has && r.has.some(h => h.value && h.value.includes('pro'))
  );

  // Find the client rewrite rule
  const clientRewrite = routes.find(r =>
    r.dest && r.dest.includes('/client/') &&
    r.has && r.has.some(h => h.value && h.value.includes('onmange'))
  );

  // Test 1: Dashboard rewrite should NOT match paths already starting with /dashboard/
  if (dashboardRewrite) {
    const srcRegex = new RegExp(`^${dashboardRewrite.src}$`);
    const testPath = '/dashboard/assets/index.js';

    tests.push({
      name: 'Dashboard rewrite excludes /dashboard/ paths',
      passed: !srcRegex.test(testPath),
      details: srcRegex.test(testPath)
        ? `FAIL: Pattern "${dashboardRewrite.src}" matches "${testPath}" - will cause double-prefixing!`
        : `OK: Pattern "${dashboardRewrite.src}" correctly excludes "${testPath}"`
    });

    // Also test that it DOES match root and other paths
    tests.push({
      name: 'Dashboard rewrite matches root path',
      passed: srcRegex.test('/'),
      details: srcRegex.test('/')
        ? `OK: Pattern "${dashboardRewrite.src}" correctly matches "/"`
        : `FAIL: Pattern "${dashboardRewrite.src}" should match "/"`
    });

    tests.push({
      name: 'Dashboard rewrite matches /login',
      passed: srcRegex.test('/login'),
      details: srcRegex.test('/login')
        ? `OK: Pattern "${dashboardRewrite.src}" correctly matches "/login"`
        : `FAIL: Pattern "${dashboardRewrite.src}" should match "/login"`
    });
  }

  // Test 2: Client rewrite should NOT match paths already starting with /client/
  if (clientRewrite) {
    const srcRegex = new RegExp(`^${clientRewrite.src}$`);
    const testPath = '/client/assets/index.js';

    tests.push({
      name: 'Client rewrite excludes /client/ paths',
      passed: !srcRegex.test(testPath),
      details: srcRegex.test(testPath)
        ? `FAIL: Pattern "${clientRewrite.src}" matches "${testPath}" - will cause double-prefixing!`
        : `OK: Pattern "${clientRewrite.src}" correctly excludes "${testPath}"`
    });
  }

  return tests;
}

// Main
console.log('Validating Vercel routing configuration...\n');

let config;
try {
  config = getVercelConfig();
} catch (e) {
  console.error('Failed to parse config:', e.message);
  process.exit(1);
}

console.log(`Found ${config.routes.length} routes\n`);

// Validate routes
const { errors, warnings } = validateRoutes(config.routes);

// Run scenario tests
const scenarioTests = testRoutingScenarios(config.routes);

// Output
if (errors.length > 0) {
  console.error('❌ ERRORS:\n');
  errors.forEach(e => console.error(`  ${e}\n`));
}

if (warnings.length > 0) {
  console.warn('⚠️  WARNINGS:\n');
  warnings.forEach(w => console.warn(`  ${w}\n`));
}

console.log('ROUTING TESTS:\n');
let allPassed = true;
for (const test of scenarioTests) {
  const icon = test.passed ? '✅' : '❌';
  console.log(`${icon} ${test.name}`);
  console.log(`   ${test.details}\n`);
  if (!test.passed) allPassed = false;
}

// Summary
console.log('─'.repeat(50));
if (errors.length > 0 || !allPassed) {
  console.error('\n❌ VALIDATION FAILED\n');
  console.error('Fix the routing configuration in scripts/combine-dist.js before deploying.');
  process.exit(1);
} else {
  console.log('\n✅ VALIDATION PASSED - No double-prefixing issues detected\n');
  process.exit(0);
}
