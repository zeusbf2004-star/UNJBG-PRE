/**
 * Límites de suscripción por plan.
 * Compartido entre frontend (display) y Cloud Functions (enforcement).
 */

/** Número máximo de preguntas por semana para usuarios gratuitos */
export const FREE_WEEKLY_LIMIT = 60;

/** Número máximo de mazos/decks para usuarios gratuitos */
export const FREE_DECKS_LIMIT = 3;

/** Número máximo de cursos suscribibles para usuarios gratuitos */
export const FREE_COURSES_LIMIT = 3;

export interface SubscriptionLimits {
  weeklyQuestions: number;
  maxDecks: number;
  maxCourses: number;
}

export const FREE_LIMITS: SubscriptionLimits = {
  weeklyQuestions: FREE_WEEKLY_LIMIT,
  maxDecks: FREE_DECKS_LIMIT,
  maxCourses: FREE_COURSES_LIMIT,
};

export const PREMIUM_LIMITS: SubscriptionLimits = {
  weeklyQuestions: Infinity,
  maxDecks: Infinity,
  maxCourses: Infinity,
};
