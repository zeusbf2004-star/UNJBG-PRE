/**
 * @unjbg-pre/shared
 *
 * Paquete compartido entre frontend y Cloud Functions.
 * Exporta constantes, algoritmos y tipos.
 */

// Constants
export {
  FREE_WEEKLY_LIMIT,
  FREE_DECKS_LIMIT,
  FREE_COURSES_LIMIT,
  FREE_LIMITS,
  PREMIUM_LIMITS,
} from './constants/limits';
export type { SubscriptionLimits } from './constants/limits';

export {
  NIVELES_GLOBALES,
  HITOS_TITULOS,
  getNivel,
  getProximoNivel,
} from './constants/levels';
export type { Nivel, Hito } from './constants/levels';

export { EXAM_BLUEPRINTS } from './constants/exam-blueprints';

// Algorithms
export { calculateSM2, isDueForReview } from './algorithms/sm2';
export type { SM2Card, SM2Result } from './algorithms/sm2';
