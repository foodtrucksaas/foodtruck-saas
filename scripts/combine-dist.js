#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// Clean and create dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy landing page
const publicDir = path.join(rootDir, 'public');
if (fs.existsSync(publicDir)) {
  copyDir(publicDir, distDir);
}

// Copy client build to dist/client
const clientDist = path.join(rootDir, 'packages/client/dist');
if (fs.existsSync(clientDist)) {
  copyDir(clientDist, path.join(distDir, 'client'));
  console.log('✓ Client copied to dist/client');
}

// Copy dashboard build to dist/dashboard
const dashboardDist = path.join(rootDir, 'packages/dashboard/dist');
if (fs.existsSync(dashboardDist)) {
  copyDir(dashboardDist, path.join(distDir, 'dashboard'));
  console.log('✓ Dashboard copied to dist/dashboard');
}

console.log('✓ Build combined successfully!');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
