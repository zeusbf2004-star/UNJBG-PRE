import { describe, it, expect } from 'vitest';
import { buildWeeklyScoresByUser, calculatePercentiles } from './computePercentiles.js';

describe('buildWeeklyScoresByUser', () => {
  it('aggregates weekly score stats by user', () => {
    const rows = [
      { userId: 'u1', puntaje: 400 },
      { userId: 'u1', puntaje: 500 },
      { userId: 'u2', puntaje: 300 },
      { userId: 'u2', puntaje: null },
    ];

    const map = buildWeeklyScoresByUser(rows);

    expect(map.get('u1')).toEqual({ sum: 900, count: 2, max: 500 });
    expect(map.get('u2')).toEqual({ sum: 300, count: 2, max: 300 });
  });
});

describe('calculatePercentiles', () => {
  it('returns ranked rows with percentile and rank', () => {
    const rows = [
      { userId: 'u1', score: 450 },
      { userId: 'u2', score: 400 },
      { userId: 'u3', score: 350 },
    ];

    const ranked = calculatePercentiles(rows);

    expect(ranked[0]).toMatchObject({ userId: 'u1', rank: 1, percentile: 100, total: 3 });
    expect(ranked[1]).toMatchObject({ userId: 'u2', rank: 2, percentile: 67, total: 3 });
    expect(ranked[2]).toMatchObject({ userId: 'u3', rank: 3, percentile: 33, total: 3 });
  });

  it('handles ties by stable sorted order with valid percentile range', () => {
    const rows = [
      { userId: 'u1', score: 420 },
      { userId: 'u2', score: 420 },
    ];

    const ranked = calculatePercentiles(rows);

    expect(ranked).toHaveLength(2);
    expect(ranked[0].percentile).toBeGreaterThanOrEqual(1);
    expect(ranked[0].percentile).toBeLessThanOrEqual(100);
    expect(ranked[1].percentile).toBeGreaterThanOrEqual(1);
    expect(ranked[1].percentile).toBeLessThanOrEqual(100);
  });
});