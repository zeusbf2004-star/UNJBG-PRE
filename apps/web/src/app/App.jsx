import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { ProtectedRoute } from '../shared/components/ProtectedRoute';
import { LoadingScreen } from '../shared/components/LoadingScreen';

// Lazy loading de páginas por feature
const LandingPage = lazy(() => import('../features/auth/pages/LandingPage'));
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'));
const SimulacroPage = lazy(() => import('../features/exam/pages/SimulacroPage'));
const BanqueoPage = lazy(() => import('../features/exam/pages/BanqueoPage'));
const AdminPanel = lazy(() => import('../features/admin/pages/AdminPanel'));
const FlashcardsPage = lazy(() => import('../features/flashcards/pages/FlashcardsPage'));
const DeckLibrary = lazy(() => import('../features/flashcards/pages/DeckLibrary'));
const TeoriaPage = lazy(() => import('../features/teoria/pages/TeoriaPage'));
const StatsPage = lazy(() => import('../features/stats/pages/StatsPage'));

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                <DashboardPage user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/simulacro/:examenId"
            element={
              <ProtectedRoute user={user}>
                <SimulacroPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/flashcards"
            element={
              <ProtectedRoute user={user}>
                <FlashcardsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teoria"
            element={
              <ProtectedRoute user={user}>
                <TeoriaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/banqueo"
            element={
              <ProtectedRoute user={user}>
                <BanqueoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/biblioteca-mazos"
            element={
              <ProtectedRoute user={user}>
                <DeckLibrary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stats"
            element={
              <ProtectedRoute user={user}>
                <StatsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
