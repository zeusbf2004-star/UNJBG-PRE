/**
 * UNJBG PRE — Firebase Cloud Functions
 *
 * Entry point. Exporta todas las Cloud Functions del proyecto.
 * Cada función está organizada por dominio en su propia carpeta.
 */

// Subscription
export { togglePremium } from './subscription/togglePremium.js';
