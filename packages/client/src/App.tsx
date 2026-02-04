import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getSubdomain } from './lib/subdomain';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const FoodtruckPage = lazy(() => import('./pages/Foodtruck'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderStatus = lazy(() => import('./pages/OrderStatus'));
const OrderHistory = lazy(() => import('./pages/OrderHistory'));
const Unsubscribe = lazy(() => import('./pages/Unsubscribe'));

// Wrapper components to handle subdomain routing
function SubdomainFoodtruckPage() {
  const subdomain = getSubdomain();
  if (!subdomain) return null;

  // Pass the slug directly to FoodtruckPage
  return <FoodtruckPage slug={subdomain} />;
}

function SubdomainCheckout() {
  const subdomain = getSubdomain();
  // Checkout uses foodtruckId from cart context, which is set by FoodtruckPage
  return <Checkout slug={subdomain || undefined} />;
}

// Loading fallback component
function PageLoader() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50"
      role="status"
      aria-label="Chargement en cours"
    >
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
  const subdomain = getSubdomain();

  // If subdomain detected, render directly the foodtruck page
  // The subdomain (slug) will be used as the foodtruckId
  if (subdomain) {
    return (
      <>
        <SkipLink />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<SubdomainFoodtruckPage />} />
            <Route path="/checkout" element={<SubdomainCheckout />} />
            <Route path="/order/:orderId" element={<OrderStatus />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
          </Routes>
        </Suspense>
      </>
    );
  }

  // Otherwise, use classic routing with /:foodtruckId
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
