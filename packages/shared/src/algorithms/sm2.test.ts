import { describe, it, expect } from 'vitest';
import { calculateSM2, hasIncomingReviewPriority, isDueForReview } from './sm2';

describe('SM-2 Algorithm', () => {
  it('should reset interval to 1 on quality < 3', () => {
    const result = calculateSM2(2, { interval: 10, repetitions: 5, easeFactor: 2.5 });
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
    // Ease factor should decrease
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  it('should increase interval on correct answers', () => {
    const r1 = calculateSM2(4, { interval: 1, repetitions: 0, easeFactor: 2.5 });
    expect(r1.interval).toBe(1);
    expect(r1.repetitions).toBe(1);

    const r2 = calculateSM2(4, r1);
    expect(r2.interval).toBe(6);
    expect(r2.repetitions).toBe(2);

    const r3 = calculateSM2(4, r2);
    expect(r3.interval).toBe(Math.round(6 * r2.easeFactor));
    expect(r3.repetitions).toBe(3);
  });

  it('should generate sync timestamp on each review result', () => {
    const result = calculateSM2(4, { interval: 1, repetitions: 0, easeFactor: 2.5 });
    expect(typeof result.syncTimestamp).toBe('number');
  });

  it('should prioritize newer incoming sync timestamp', () => {
    expect(hasIncomingReviewPriority(1000, 1001)).toBe(true);
    expect(hasIncomingReviewPriority(1000, 1000)).toBe(true);
    expect(hasIncomingReviewPriority(1000, 999)).toBe(false);
    expect(hasIncomingReviewPriority(undefined, 999)).toBe(true);
  });
});
