import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { CartProvider } from './contexts/CartContext';
import { initSentry } from './lib/sentry';
import './index.css';

// Initialize error tracking
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CartProvider>
        <App />
        <Toaster position="top-center" />
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>
);
// trigger 1768873025
// rebuild 1768873191
// public 1768873412
// trigger 1768873625
