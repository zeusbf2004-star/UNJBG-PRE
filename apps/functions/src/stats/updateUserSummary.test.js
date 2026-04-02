import { describe, it, expect } from 'vitest';
import { buildExamMetrics, buildFlashcardMetrics } from './updateUserSummary.js';

describe('buildExamMetrics', () => {
  it('returns zeroed metrics when there is no historial', () => {
    expect(buildExamMetrics([])).toEqual({
      totalExamenes: 0,
      puntajePromedio: 0,
      puntajeMaximo: 0,
      lastExamAt: null,
    });
  });

  it('computes total, average and max from historial rows', () => {
    const rows = [
      { puntaje: 412.5, fecha: new Date('2026-03-01T10:00:00Z') },
      { puntaje: 390, fecha: new Date('2026-03-10T10:00:00Z') },
      { puntaje: 450, fecha: new Date('2026-03-07T10:00:00Z') },
    ];

    const result = buildExamMetrics(rows);

    expect(result.totalExamenes).toBe(3);
    expect(result.puntajePromedio).toBe(417.5);
    expect(result.puntajeMaximo).toBe(450);
    expect(result.lastExamAt).toBe(new Date('2026-03-10T10:00:00Z').getTime());
  });
});

describe('buildFlashcardMetrics', () => {
  it('computes percentages correctly', () => {
    const result = buildFlashcardMetrics({
      dueToday: 14,
      viewedToday: 20,
      correctasToday: 15,
      masteredCount: 80,
      totalFlashcards: 200,
    });

    expect(result).toEqual({
      flashcardsDueToday: 14,
      flashcardsViewedToday: 20,
      flashcardsAccuracy: 75,
      flashcardsMasteredPct: 40,
    });
  });

  it('handles division by zero safely', () => {
    const result = buildFlashcardMetrics({
      dueToday: 0,
      viewedToday: 0,
      correctasToday: 0,
      masteredCount: 0,
      totalFlashcards: 0,
    });

    expect(result.flashcardsAccuracy).toBe(0);
    expect(result.flashcardsMasteredPct).toBe(0);
  });
});
