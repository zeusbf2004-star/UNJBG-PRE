/**
 * @unjbg-pre/shared — Código compartido entre frontend y Cloud Functions
 *
 * Exporta algoritmos, constantes y tipos que ambos lados necesitan.
 */

// Algoritmos
export { calculateSM2 } from './algorithms/sm2.js';

// Constantes
export {
  FREE_WEEKLY_LIMIT,
  FREE_DECKS_LIMIT,
  FREE_COURSES_LIMIT,
} from './constants/limits.js';

export {
  NIVELES_GLOBALES,
  HITOS_TITULOS,
  getNivel,
  getProximoNivel,
} from './constants/levels.js';

export { EXAM_BLUEPRINTS } from './constants/exam-blueprints.js';
