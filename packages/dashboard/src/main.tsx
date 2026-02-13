import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { FoodtruckProvider } from './contexts/FoodtruckContext';
import { initSentry } from './lib/sentry';
import './index.css';

// Initialize error tracking
initSentry();

// On pro.onmange.app subdomain, no basename needed (Vercel handles rewrite)
// On other domains (e.g., localhost, onmange.app/dashboard), use /dashboard basename
const isProSubdomain = window.location.hostname === 'pro.onmange.app';
const basename = isProSubdomain ? '/' : '/dashboard';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter
      basename={basename}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <FoodtruckProvider>
          <App />
          <Toaster position="top-right" />
        </FoodtruckProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
