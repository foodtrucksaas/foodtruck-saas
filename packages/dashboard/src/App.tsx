import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useFoodtruck } from './contexts/FoodtruckContext';
import Layout from './components/Layout';
import Loading from './components/Loading';
import { ErrorBoundary } from './components/ErrorBoundary';

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
const Settings = lazy(() => import('./pages/Settings'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const OnboardingAssistant = lazy(() => import('./pages/OnboardingAssistant'));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { foodtruck, loading: foodtruckLoading } = useFoodtruck();

  if (loading || foodtruckLoading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!foodtruck) {
    return <Navigate to="/onboarding" replace />;
  }

  // Foodtruck exists but onboarding not completed → redirect to assistant
  if (!foodtruck.onboarding_completed_at) {
    return <Navigate to="/onboarding-assistant" replace />;
  }

  return <Layout>{children}</Layout>;
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
    <ErrorBoundary>
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
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/menu"
            element={
              <PrivateRoute>
                <Menu />
              </PrivateRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <PrivateRoute>
                <Orders />
              </PrivateRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <PrivateRoute>
                <Schedule />
              </PrivateRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <PrivateRoute>
                <Analytics />
              </PrivateRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <PrivateRoute>
                <Customers />
              </PrivateRoute>
            }
          />
          <Route
            path="/campaigns"
            element={
              <PrivateRoute>
                <Campaigns />
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
                <Offers />
              </PrivateRoute>
            }
          />
          <Route
            path="/loyalty"
            element={
              <PrivateRoute>
                <Loyalty />
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
