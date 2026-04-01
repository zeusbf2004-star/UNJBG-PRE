/**
 * UNJBG PRE — Firebase Cloud Functions
 *
 * Entry point. Exporta todas las Cloud Functions del proyecto.
 * Cada función está organizada por dominio en su propia carpeta.
 */

// Subscription
export { togglePremium } from './subscription/togglePremium.js';

// Gamification
export { updatePoints } from './gamification/updatePoints.js';

// Exam Generation
export { generateExam } from './exam/generateExam.js';
