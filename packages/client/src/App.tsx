import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import FoodtruckPage from './pages/Foodtruck';
import Checkout from './pages/Checkout';
import OrderStatus from './pages/OrderStatus';
import OrderHistory from './pages/OrderHistory';
import Unsubscribe from './pages/Unsubscribe';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:foodtruckId" element={<FoodtruckPage />} />
      <Route path="/:foodtruckId/checkout" element={<Checkout />} />
      <Route path="/order/:orderId" element={<OrderStatus />} />
      <Route path="/orders" element={<OrderHistory />} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />
    </Routes>
  );
}
