/**
 * Shared UI components — ProtectedRoute
 * Redirige al login si el usuario no está autenticado.
 */
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
