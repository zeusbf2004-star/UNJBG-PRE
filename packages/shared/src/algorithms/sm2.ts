/**
 * Implementación del algoritmo SM-2 para repetición espaciada.
 * 
 * Basado en el algoritmo de SuperMemo, adaptado para flashcards
 * de preparación preuniversitaria.
 *
 * @see https://en.wikipedia.org/wiki/SuperMemo#Algorithm_SM-2
 */

export interface SM2Card {
  /** Factor de facilidad (mínimo 1.3) */
  easeFactor: number;
  /** Número de repeticiones consecutivas correctas */
  repetitions: number;
  /** Intervalo actual en días */
  interval: number;
  /** Próxima fecha de revisión (ISO string o timestamp) */
  nextReview: string;
  /** Marca temporal para resolver conflictos de sincronización offline */
  syncTimestamp?: number;
}

export interface SM2Result extends SM2Card {
  /** Calidad de la respuesta (0-5) */
  quality: number;
}

/**
 * Determina si una revisión entrante tiene prioridad sobre el estado local actual.
 */
export const hasIncomingReviewPriority = (
  currentSyncTimestamp?: number,
  incomingSyncTimestamp?: number
): boolean => {
  if (typeof incomingSyncTimestamp !== 'number') return false;
  if (typeof currentSyncTimestamp !== 'number') return true;
  return incomingSyncTimestamp >= currentSyncTimestamp;
};

/**
 * Calcula los nuevos parámetros SM-2 basado en la calidad de la respuesta.
 *
 * @param quality - Calidad de la respuesta (0-5)
 *   0: Blackout total
 *   1: Respuesta incorrecta, recordó al ver la respuesta
 *   2: Respuesta incorrecta, pero parecía fácil de recordar
 *   3: Respuesta correcta con mucha dificultad
 *   4: Respuesta correcta con algo de dificultad
 *   5: Respuesta perfecta, sin dificultad
 *
 * @param card - Estado actual de la tarjeta
 * @returns Nuevos parámetros SM-2 para la tarjeta
 */
export const calculateSM2 = (
  quality: number,
  card: Partial<SM2Card> = {}
): SM2Result => {
  let {
    easeFactor = 2.5,
    repetitions = 0,
    interval = 1,
  } = card;

  // Clamp quality 0-5
  quality = Math.max(0, Math.min(5, Math.round(quality)));

  if (quality >= 3) {
    // Respuesta correcta
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Respuesta incorrecta — reset
    repetitions = 0;
    interval = 1;
  }

  // Actualizar factor de facilidad
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);

  // Calcular próxima revisión
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    quality,
    easeFactor,
    repetitions,
    interval,
    nextReview: nextReview.toISOString(),
    syncTimestamp: Date.now(),
  };
};

/**
 * Determina si una tarjeta necesita revisión hoy.
 */
export const isDueForReview = (card: SM2Card): boolean => {
  const now = new Date();
  const reviewDate = new Date(card.nextReview);
  return now >= reviewDate;
};
