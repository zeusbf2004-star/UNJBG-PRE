/**
 * Límites del plan gratuito.
 * Estos valores se usan tanto en el frontend (para mostrar UI) como en
 * Cloud Functions (para enforce real en el servidor).
 */

/** Máximo de preguntas por semana para usuarios free */
export const FREE_WEEKLY_LIMIT = 60;

/** Máximo de mazos de flashcards para usuarios free */
export const FREE_DECKS_LIMIT = 3;

/** Máximo de cursos de flashcards a los que un usuario free puede suscribirse */
export const FREE_COURSES_LIMIT = 3;
