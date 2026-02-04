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
  // Copy index.html to 200.html for SPA fallback on Vercel
  const clientIndex = path.join(distDir, 'client', 'index.html');
  if (fs.existsSync(clientIndex)) {
    fs.copyFileSync(clientIndex, path.join(distDir, 'client', '200.html'));
  }
  console.log('✓ Client copied to dist/client');
}

// Copy dashboard build to dist/dashboard
const dashboardDist = path.join(rootDir, 'packages/dashboard/dist');
if (fs.existsSync(dashboardDist)) {
  copyDir(dashboardDist, path.join(distDir, 'dashboard'));
  // Copy index.html to 200.html for SPA fallback on Vercel
  const dashboardIndex = path.join(distDir, 'dashboard', 'index.html');
  if (fs.existsSync(dashboardIndex)) {
    fs.copyFileSync(dashboardIndex, path.join(distDir, 'dashboard', '200.html'));
  }
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
