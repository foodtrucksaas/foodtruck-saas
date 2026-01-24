import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const FoodtruckPage = lazy(() => import('./pages/Foodtruck'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderStatus = lazy(() => import('./pages/OrderStatus'));
const OrderHistory = lazy(() => import('./pages/OrderHistory'));
const Unsubscribe = lazy(() => import('./pages/Unsubscribe'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" role="status" aria-label="Chargement en cours">
      <Loader2 className="w-8 h-8 text-primary-500 animate-spin" aria-hidden="true" />
      <span className="sr-only">Chargement de la page</span>
    </div>
  );
}

// Skip link component for accessibility
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
    >
      Aller au contenu principal
    </a>
  );
}

export default function App() {
  return (
    <>
      <SkipLink />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:foodtruckId" element={<FoodtruckPage />} />
          <Route path="/:foodtruckId/checkout" element={<Checkout />} />
          <Route path="/order/:orderId" element={<OrderStatus />} />
          <Route path="/orders" element={<OrderHistory />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
        </Routes>
      </Suspense>
    </>
  );
}
