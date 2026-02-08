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

// Create .vercel/output structure for Build Output API v3
const vercelOutputDir = path.join(rootDir, '.vercel/output');
fs.rmSync(path.join(rootDir, '.vercel'), { recursive: true, force: true });
fs.mkdirSync(path.join(vercelOutputDir, 'static'), { recursive: true });

// Copy dist to static
copyDir(distDir, path.join(vercelOutputDir, 'static'));

// Create config.json with routing rules
const config = {
  version: 3,
  routes: [
    // Security headers for all routes
    {
      src: "/(.*)",
      headers: {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload"
      },
      continue: true
    },
    // Dashboard subdomain (pro.onmange.app) - rewrite to /dashboard path
    // Only rewrite paths that DON'T already start with /dashboard/ to avoid double-prefixing
    {
      src: "/(?!dashboard/)(.*)$",
      dest: "/dashboard/$1",
      has: [{ type: "host", value: "pro\\.onmange\\.app" }],
      continue: true
    },
    // Client subdomains - rewrite NON-client paths to /client (avoid double /client/client)
    {
      src: "/(?!client/)(.+)",
      dest: "/client/$1",
      has: [{ type: "host", value: "(?!pro\\.|www\\.)([^.]+)\\.onmange\\.app" }],
      continue: true
    },
    // Handle filesystem (static files) first
    { handle: "filesystem" },
    // Dashboard SPA fallback for pro.onmange.app
    {
      src: "/(.*)",
      dest: "/dashboard/index.html",
      has: [{ type: "host", value: "pro\\.onmange\\.app" }]
    },
    // Client subdomain SPA fallback for foodtruck slugs
    {
      src: "/(.*)",
      dest: "/client/index.html",
      has: [{ type: "host", value: "(?!pro\\.|www\\.)([^.]+)\\.onmange\\.app" }]
    },
    // Client SPA fallback for paths that don't match static files
    {
      src: "/client/(.*)",
      dest: "/client/index.html"
    },
    // Dashboard SPA fallback for paths that don't match static files
    {
      src: "/dashboard/(.*)",
      dest: "/dashboard/index.html"
    }
  ]
};

fs.writeFileSync(
  path.join(vercelOutputDir, 'config.json'),
  JSON.stringify(config, null, 2)
);
console.log('✓ Vercel Build Output API config created');

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
