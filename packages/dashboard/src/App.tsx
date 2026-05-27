import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useFoodtruck } from './contexts/FoodtruckContext';
import { useSubscription } from './contexts/SubscriptionContext';
import Layout from './components/Layout';
import Loading from './components/Loading';
import { ErrorBoundary } from '@foodtruck/shared';

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Menu = lazy(() => import('./pages/Menu'));
const Orders = lazy(() => import('./pages/Orders'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Customers = lazy(() => import('./pages/Customers'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const Offers = lazy(() => import('./pages/Offers'));
const Loyalty = lazy(() => import('./pages/Loyalty'));
const Billing = lazy(() => import('./pages/Billing'));
const Settings = lazy(() => import('./pages/Settings'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const OnboardingAssistant = lazy(() => import('./pages/OnboardingAssistant'));

const DEGRADED_ALLOWED_ROUTES = ['/billing', '/settings'];

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { foodtruck, loading: foodtruckLoading } = useFoodtruck();
  const { isLoading: subLoading } = useSubscription();

  if (loading || foodtruckLoading || subLoading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!foodtruck) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Layout>{children}</Layout>;
}

function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { accessState } = useSubscription();
  const location = useLocation();

  if (accessState === 'degraded' && !DEGRADED_ALLOWED_ROUTES.includes(location.pathname)) {
    return <Navigate to="/billing" replace state={{ degraded: true }} />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();
  const { foodtruck, loading: foodtruckLoading } = useFoodtruck();

  if (loading) {
    return <Loading />;
  }

  return (
    <ErrorBoundary homeLabel="Retour au tableau de bord">
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/onboarding"
            element={
              user ? (
                foodtruckLoading ? (
                  <Loading />
                ) : foodtruck ? (
                  foodtruck.onboarding_completed_at ? (
                    <Navigate to="/" replace />
                  ) : (
                    <Navigate to="/onboarding-assistant" replace />
                  )
                ) : (
                  <Onboarding />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/onboarding-assistant"
            element={
              user ? (
                foodtruckLoading ? (
                  <Loading />
                ) : !foodtruck ? (
                  <Navigate to="/onboarding" replace />
                ) : (
                  <OnboardingAssistant />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <SubscriptionGuard>
                  <Dashboard />
                </SubscriptionGuard>
              </PrivateRoute>
            }
          />
          <Route
            path="/menu"
            element={
              <PrivateRoute>
                <SubscriptionGuard>
                  <Menu />
                </SubscriptionGuard>
              </PrivateRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <PrivateRoute>
                <SubscriptionGuard>
                  <Orders />
                </SubscriptionGuard>
              </PrivateRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <PrivateRoute>
                <SubscriptionGuard>
                  <Schedule />
                </SubscriptionGuard>
              </PrivateRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <PrivateRoute>
                <SubscriptionGuard>
                  <Analytics />
                </SubscriptionGuard>
              </PrivateRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <PrivateRoute>
                <SubscriptionGuard>
                  <Customers />
                </SubscriptionGuard>
              </PrivateRoute>
            }
          />
          <Route
            path="/campaigns"
            element={
              <PrivateRoute>
                <SubscriptionGuard>
                  <Campaigns />
                </SubscriptionGuard>
              </PrivateRoute>
            }
          />
          {/* Legacy routes redirect to /offers */}
          <Route path="/promo-codes" element={<Navigate to="/offers" replace />} />
          <Route path="/deals" element={<Navigate to="/offers" replace />} />
          <Route
            path="/offers"
            element={
              <PrivateRoute>
                <SubscriptionGuard>
                  <Offers />
                </SubscriptionGuard>
              </PrivateRoute>
            }
          />
          <Route
            path="/loyalty"
            element={
              <PrivateRoute>
                <SubscriptionGuard>
                  <Loyalty />
                </SubscriptionGuard>
              </PrivateRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <PrivateRoute>
                <Billing />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
