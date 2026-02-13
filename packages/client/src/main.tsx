import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './contexts/CartContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initSentry } from './lib/sentry';
import './index.css';

// Initialize error tracking
initSentry();

// On foodtruck subdomains (*.onmange.app except pro/www), no basename needed
// On other domains (e.g., localhost, onmange.app/client), use /client basename
const hostname = window.location.hostname;
const isClientSubdomain =
  hostname.endsWith('.onmange.app') && !hostname.startsWith('pro.') && !hostname.startsWith('www.');
const basename = isClientSubdomain ? '/' : '/client';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter
        basename={basename}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <CartProvider>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{ duration: 2000, style: { fontSize: '14px' } }}
          />
        </CartProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
