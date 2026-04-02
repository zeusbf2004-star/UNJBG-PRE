import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';

const DISTRITOS = [
  'Gregorio Albarracin',
  'Pocollay',
  'Tacna Centro',
  'Alto de la Alianza',
  'Ciudad Nueva',
  'Coronel Gregorio Albarracin',
  'Otro',
];

export const getInitials = (fullName = '') => {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'UN';
};

export const buildProfilePayload = (form) => ({
  displayName: form.displayName,
  carrera_objetivo: form.carrera_objetivo || null,
  canal_objetivo: form.canal_objetivo || null,
  colegio_tipo: form.colegio_tipo || null,
  distrito: form.distrito || null,
});

export default function UserProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    profile,
    scoreStats,
    careerOptions,
    channelOptions,
    loading,
    saving,
    error,
    saveProfile,
    whatsappUrl,
  } = useUserProfile(user);

  const [form, setForm] = useState({
    displayName: '',
    carrera_objetivo: '',
    canal_objetivo: '',
    colegio_tipo: '',
    distrito: '',
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!profile) return;
    setForm({
      displayName: profile.displayName || '',
      carrera_objetivo: profile.carrera_objetivo || '',
      canal_objetivo: profile.canal_objetivo || '',
      colegio_tipo: profile.colegio_tipo || '',
      distrito: profile.distrito || '',
    });
  }, [profile]);

  const premiumLabel = scoreStats.isPremium ? 'PREMIUM' : 'GRATUITO';

  const selectedCareerName = useMemo(() => {
    const c = careerOptions.find((item) => item.id === form.carrera_objetivo);
    return c?.nombre || 'Sin carrera definida';
  }, [careerOptions, form.carrera_objetivo]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus('');

    const payload = buildProfilePayload(form);

    const result = await saveProfile(payload);
    if (result?.success) {
      setStatus('Perfil actualizado correctamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-semibold text-sm">Cargando centro de mando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/40 pb-16">
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Centro de Mando</h1>
              <p className="text-[11px] text-slate-500">Perfil y configuración académica</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <section className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/60 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-500 to-cyan-400 text-white flex items-center justify-center font-black text-lg shadow-lg">
                {getInitials(form.displayName || profile?.displayName)}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 leading-tight">{form.displayName || 'Estudiante UNJBG'}</h2>
                <p className="text-sm text-slate-500">{profile?.email || user?.email}</p>
                <p className="text-xs text-slate-400 mt-1">Meta actual: <span className="font-bold text-slate-600">{selectedCareerName}</span></p>
              </div>
            </div>

            <span className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-black tracking-wider border ${scoreStats.isPremium ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              {scoreStats.isPremium ? 'PREMIUM CROWN' : premiumLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <MetricCard title="Racha actual" value={`${scoreStats.racha_actual || 0} dias`} accent="from-orange-500 to-amber-400" />
            <MetricCard title="Nivel global" value={scoreStats.nivel || 'Novato'} accent="from-indigo-600 to-blue-500" />
          </div>
        </section>

        <form onSubmit={onSubmit} className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/60 p-6 sm:p-8 space-y-6">
          <h3 className="text-lg font-black text-slate-800">Perfil académico</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre completo">
              <input
                value={form.displayName}
                onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                maxLength={80}
                required
              />
            </Field>

            <Field label="Canal objetivo">
              <select
                value={form.canal_objetivo}
                onChange={(e) => setForm((prev) => ({ ...prev, canal_objetivo: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Seleccionar canal</option>
                {channelOptions.map((canal) => (
                  <option key={canal.value} value={canal.value}>{canal.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Carrera objetivo">
              <select
                value={form.carrera_objetivo}
                onChange={(e) => setForm((prev) => ({ ...prev, carrera_objetivo: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Seleccionar carrera</option>
                {careerOptions.map((career) => (
                  <option key={career.id} value={career.id}>{career.nombre}</option>
                ))}
              </select>
            </Field>

            <Field label="Tipo de colegio (opcional)">
              <select
                value={form.colegio_tipo}
                onChange={(e) => setForm((prev) => ({ ...prev, colegio_tipo: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">No especificar</option>
                <option value="nacional">Nacional</option>
                <option value="particular">Particular</option>
              </select>
            </Field>

            <Field label="Distrito (opcional)">
              <select
                value={form.distrito}
                onChange={(e) => setForm((prev) => ({ ...prev, distrito: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">No especificar</option>
                {DISTRITOS.map((distrito) => (
                  <option key={distrito} value={distrito}>{distrito}</option>
                ))}
              </select>
            </Field>
          </div>

          {(error || status) && (
            <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${error ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              {error || status}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-slate-500">Los cambios de carrera impactan tus estadísticas y comparativas.</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </div>
        </form>

        <section className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/60 p-6 sm:p-8">
          <h3 className="text-lg font-black text-slate-800 mb-4">Membresia y soporte</h3>
          <div className="flex flex-col md:flex-row gap-4">
            {!scoreStats.isPremium ? (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-center text-sm">
                Adquirir Premium
              </a>
            ) : (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 text-white font-black text-center text-sm">
                Contactar soporte por WhatsApp
              </a>
            )}
            <button onClick={() => navigate('/stats')} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50">
              Ver impacto en Estadisticas
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-xs font-black tracking-wider text-slate-500 uppercase">{label}</span>
      {children}
    </label>
  );
}

function MetricCard({ title, value, accent }) {
  return (
    <article className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50">
      <p className="text-xs uppercase tracking-wider text-slate-500 font-black">{title}</p>
      <div className="mt-2 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent}`} />
        <p className="text-lg font-black text-slate-800">{value}</p>
      </div>
    </article>
  );
}
