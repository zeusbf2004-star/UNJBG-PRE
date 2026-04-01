/**
 * Sistema de niveles y hitos de gamificación.
 * Compartido entre frontend (display) y Cloud Functions (cálculo).
 */

export interface Nivel {
  nombre: string;
  min: number;
  max: number;
}

export interface Hito {
  nombre: string;
  min: number;
}

export const NIVELES_GLOBALES: Nivel[] = [
  { nombre: 'Novato', min: 0, max: 99 },
  { nombre: 'Aprendiz', min: 100, max: 499 },
  { nombre: 'Explorador', min: 500, max: 1999 },
  { nombre: 'Estratega', min: 2000, max: 4999 },
  { nombre: 'Maestro', min: 5000, max: 14999 },
  { nombre: 'Leyenda UNJBG', min: 15000, max: Infinity },
];

export const HITOS_TITULOS: Hito[] = [
  { nombre: 'Iniciado en', min: 50 },
  { nombre: 'Especialista en', min: 250 },
  { nombre: 'Erudito de', min: 1000 },
];

/**
 * Obtiene el nombre del nivel actual según los puntos.
 */
export const getNivel = (puntos: number): string => {
  return NIVELES_GLOBALES.find(n => puntos >= n.min && puntos <= n.max)?.nombre || 'Novato';
};

/**
 * Obtiene la información del próximo nivel.
 */
export const getProximoNivel = (puntos: number): Nivel | null => {
  const index = NIVELES_GLOBALES.findIndex(n => puntos >= n.min && puntos <= n.max);
  if (index === -1 || index === NIVELES_GLOBALES.length - 1) return null;
  return NIVELES_GLOBALES[index + 1];
};
