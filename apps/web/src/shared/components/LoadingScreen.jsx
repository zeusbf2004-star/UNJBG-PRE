/**
 * Shared UI components — LoadingScreen
 * Spinner centralizado para Suspense y estados de carga.
 */
export const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
    <div className="text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-200 animate-pulse">
        <span className="text-white text-2xl font-extrabold">U</span>
      </div>
      <p className="text-sm text-slate-400 font-medium">Cargando...</p>
    </div>
  </div>
);
