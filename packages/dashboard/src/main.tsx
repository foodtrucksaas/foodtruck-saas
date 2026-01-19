import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { FoodtruckProvider } from './contexts/FoodtruckContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <FoodtruckProvider>
          <App />
          <Toaster position="top-right" />
        </FoodtruckProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
