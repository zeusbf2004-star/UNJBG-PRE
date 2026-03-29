import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Lazy loading de páginas para optimizar la carga inicial
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SimulacroPage = lazy(() => import('./pages/SimulacroPage'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const FlashcardsPage = lazy(() => import('./pages/FlashcardsPage'));
const TeoriaPage = lazy(() => import('./pages/TeoriaPage'));
const BanqueoPage = lazy(() => import('./pages/BanqueoPage'));
const DeckLibrary = lazy(() => import('./pages/DeckLibrary'));
const StatsPage = lazy(() => import('./pages/StatsPage'));

/**
 * Componente para proteger rutas privadas.
 * Redirige al login si el usuario no está autenticado.
 */
function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/**
 * Componente de carga (Spinner) reutilizable.
 */
const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
    <div className="text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-200 animate-pulse">
        <span className="text-white text-2xl font-extrabold">U</span>
      </div>
      <p className="text-sm text-slate-400 font-medium">Cargando...</p>
    </div>
  </div>
);

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
            element={user ? <Navigate to="/dashboard" replace /> : <Login />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                <Dashboard user={user} />
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
