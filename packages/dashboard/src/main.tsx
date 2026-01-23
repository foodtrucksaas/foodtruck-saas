import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { FoodtruckProvider } from './contexts/FoodtruckContext';
import { initSentry } from './lib/sentry';
import './index.css';

// Initialize error tracking
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <FoodtruckProvider>
          <App />
        </FoodtruckProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
