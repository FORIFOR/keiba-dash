import { describe, it, expect } from 'vitest';
import {
  SeededRNG,
  DEFAULT_HORSES,
  generateHorseSpeeds,
  calculateFinishTimes,
  calculatePayouts,
  runRaceSimulation,
  simulateRaceProgress,
} from './race';

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

  it('generates numbers in specified range', () => {
    const rng = new SeededRNG(42);

    for (let i = 0; i < 100; i++) {
      const value = rng.nextRange(10, 20);
      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThanOrEqual(20);
    }
  });
});

describe('generateHorseSpeeds', () => {
  it('generates deterministic speeds with same seed', () => {
    const speeds1 = generateHorseSpeeds(12345, 8);
    const speeds2 = generateHorseSpeeds(12345, 8);

    expect(speeds1).toEqual(speeds2);
  });

  it('generates different speeds with different seeds', () => {
    const speeds1 = generateHorseSpeeds(12345, 8);
    const speeds2 = generateHorseSpeeds(54321, 8);

    expect(speeds1).not.toEqual(speeds2);
  });

  it('generates correct number of speeds', () => {
    const speeds = generateHorseSpeeds(42, 8);
    expect(speeds).toHaveLength(8);
  });

  it('generates speeds in valid range', () => {
    const speeds = generateHorseSpeeds(42, 8);

    speeds.forEach((speed) => {
      expect(speed).toBeGreaterThanOrEqual(0.5);
      expect(speed).toBeLessThanOrEqual(1.5);
    });
  });
});

describe('calculateFinishTimes', () => {
  it('produces deterministic results with same seed', () => {
    const results1 = calculateFinishTimes(12345, DEFAULT_HORSES);
    const results2 = calculateFinishTimes(12345, DEFAULT_HORSES);

    expect(results1).toEqual(results2);
  });

  it('produces different results with different seeds', () => {
    const results1 = calculateFinishTimes(12345, DEFAULT_HORSES);
    const results2 = calculateFinishTimes(54321, DEFAULT_HORSES);

    expect(results1).not.toEqual(results2);
  });

  it('assigns unique positions 1 through 8', () => {
    const results = calculateFinishTimes(42, DEFAULT_HORSES);
    const positions = results.map((r) => r.position).sort();

    expect(positions).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('orders results by finish time', () => {
    const results = calculateFinishTimes(42, DEFAULT_HORSES);

    for (let i = 1; i < results.length; i++) {
      expect(results[i].finishTime).toBeGreaterThanOrEqual(results[i - 1].finishTime);
    }
  });

  it('includes all horse IDs in results', () => {
    const results = calculateFinishTimes(42, DEFAULT_HORSES);
    const horseIds = results.map((r) => r.horseId).sort();
    const expectedIds = DEFAULT_HORSES.map((h) => h.id).sort();

    expect(horseIds).toEqual(expectedIds);
  });
});

describe('calculatePayouts', () => {
  const mockResults = [
    { horseId: 1, position: 1, finishTime: 4500 },
    { horseId: 2, position: 2, finishTime: 4800 },
    { horseId: 3, position: 3, finishTime: 5000 },
    { horseId: 4, position: 4, finishTime: 5200 },
  ];

  it('calculates correct payout for 1st place', () => {
    const payouts = calculatePayouts(mockResults, 100);
    const winner = payouts.find((p) => p.position === 1);

    expect(winner).toBeDefined();
    expect(winner?.odds).toBe(5.0);
    expect(winner?.payout).toBe(500);
  });

  it('calculates correct payout for 2nd place', () => {
    const payouts = calculatePayouts(mockResults, 100);
    const second = payouts.find((p) => p.position === 2);

    expect(second).toBeDefined();
    expect(second?.odds).toBe(3.0);
    expect(second?.payout).toBe(300);
  });

  it('calculates correct payout for 3rd place', () => {
    const payouts = calculatePayouts(mockResults, 100);
    const third = payouts.find((p) => p.position === 3);

    expect(third).toBeDefined();
    expect(third?.odds).toBe(2.0);
    expect(third?.payout).toBe(200);
  });

  it('calculates zero payout for 4th place and below', () => {
    const payouts = calculatePayouts(mockResults, 100);
    const fourth = payouts.find((p) => p.position === 4);

    expect(fourth).toBeDefined();
    expect(fourth?.odds).toBe(0);
    expect(fourth?.payout).toBe(0);
  });

  it('scales payouts with bet amount', () => {
    const payouts = calculatePayouts(mockResults, 50);
    const winner = payouts.find((p) => p.position === 1);

    expect(winner?.payout).toBe(250);
  });

  it('returns payout info for all horses', () => {
    const payouts = calculatePayouts(mockResults, 100);
    expect(payouts).toHaveLength(4);
  });
});

describe('simulateRaceProgress', () => {
  it('produces deterministic progress with same seed and time', () => {
    const progress1 = simulateRaceProgress(12345, DEFAULT_HORSES, 2500);
    const progress2 = simulateRaceProgress(12345, DEFAULT_HORSES, 2500);

    expect(progress1).toEqual(progress2);
  });

  it('returns progress for all horses', () => {
    const progress = simulateRaceProgress(42, DEFAULT_HORSES, 2500);
    expect(progress).toHaveLength(8);
  });

  it('keeps progress between 0 and 100', () => {
    const progress = simulateRaceProgress(42, DEFAULT_HORSES, 2500);

    progress.forEach((p) => {
      expect(p.progress).toBeGreaterThanOrEqual(0);
      expect(p.progress).toBeLessThanOrEqual(100);
    });
  });

  it('shows increasing progress over time', () => {
    const progress1 = simulateRaceProgress(42, DEFAULT_HORSES, 1000);
    const progress2 = simulateRaceProgress(42, DEFAULT_HORSES, 3000);

    // At least some horses should have more progress at later time
    const avgProgress1 = progress1.reduce((sum, p) => sum + p.progress, 0) / progress1.length;
    const avgProgress2 = progress2.reduce((sum, p) => sum + p.progress, 0) / progress2.length;

    expect(avgProgress2).toBeGreaterThan(avgProgress1);
  });
});

describe('runRaceSimulation', () => {
  it('produces deterministic complete simulation', () => {
    const sim1 = runRaceSimulation(12345);
    const sim2 = runRaceSimulation(12345);

    expect(sim1).toEqual(sim2);
  });

  it('returns results and payouts', () => {
    const sim = runRaceSimulation(42);

    expect(sim.results).toBeDefined();
    expect(sim.payouts).toBeDefined();
    expect(sim.results).toHaveLength(8);
    expect(sim.payouts).toHaveLength(8);
  });

  it('matches payouts to results', () => {
    const sim = runRaceSimulation(42);

    sim.results.forEach((result) => {
      const payout = sim.payouts.find((p) => p.horseId === result.horseId);
      expect(payout).toBeDefined();
      expect(payout?.position).toBe(result.position);
    });
  });

  it('works with custom horses', () => {
    const customHorses = DEFAULT_HORSES.slice(0, 4);
    const sim = runRaceSimulation(42, customHorses);

    expect(sim.results).toHaveLength(4);
    expect(sim.payouts).toHaveLength(4);
  });
});
