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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
    </div>
  );
}

export default function App() {
  return (
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
  );
}
