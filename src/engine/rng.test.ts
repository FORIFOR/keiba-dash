import { describe, it, expect } from 'vitest';
import { SeededRNG, createRNG } from './rng';

describe('SeededRNG', () => {
  it('produces deterministic results with same seed', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(12345);

    const values1 = Array.from({ length: 10 }, () => rng1.next());
    const values2 = Array.from({ length: 10 }, () => rng2.next());

    expect(values1).toEqual(values2);
  });

  it('produces different results with different seeds', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(54321);

    const values1 = Array.from({ length: 10 }, () => rng1.next());
    const values2 = Array.from({ length: 10 }, () => rng2.next());

    expect(values1).not.toEqual(values2);
  });

  it('generates numbers in range [0, 1)', () => {
    const rng = new SeededRNG(42);

    for (let i = 0; i < 100; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('handles string seeds', () => {
    const rng1 = new SeededRNG('test');
    const rng2 = new SeededRNG('test');

    expect(rng1.next()).toBe(rng2.next());
  });

  it('nextRange generates numbers in specified range', () => {
    const rng = new SeededRNG(42);

    for (let i = 0; i < 100; i++) {
      const value = rng.nextRange(10, 20);
      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThan(20);
    }
  });

  it('nextInt generates integers in specified range', () => {
    const rng = new SeededRNG(42);

    for (let i = 0; i < 100; i++) {
      const value = rng.nextInt(1, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });
});

describe('createRNG', () => {
  it('creates deterministic RNG', () => {
    const rng1 = createRNG(123);
    const rng2 = createRNG(123);

    expect(rng1.next()).toBe(rng2.next());
  });
});
