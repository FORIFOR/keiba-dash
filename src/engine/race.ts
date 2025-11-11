/**
 * Horse Racing Game Engine
 * Pure functions with seeded RNG for deterministic race simulation
 */

export interface Horse {
  id: number;
  name: string;
  color: string;
}

export interface RaceProgress {
  horseId: number;
  progress: number; // 0 to 100
}

export interface RaceResult {
  horseId: number;
  position: number; // 1st, 2nd, 3rd, etc.
  finishTime: number; // milliseconds
}

export interface PayoutInfo {
  horseId: number;
  position: number;
  odds: number;
  payout: number; // multiplier on bet
}

/**
 * Seeded Random Number Generator using Mulberry32
 * Returns numbers in range [0, 1)
 */
export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Default 8 horses with distinct colors
 */
export const DEFAULT_HORSES: Horse[] = [
  { id: 1, name: 'Thunder Bolt', color: '#ef4444' },
  { id: 2, name: 'Swift Wind', color: '#3b82f6' },
  { id: 3, name: 'Golden Arrow', color: '#f59e0b' },
  { id: 4, name: 'Midnight Star', color: '#8b5cf6' },
  { id: 5, name: 'Lucky Charm', color: '#10b981' },
  { id: 6, name: 'Fire Storm', color: '#f97316' },
  { id: 7, name: 'Ocean Wave', color: '#06b6d4' },
  { id: 8, name: 'Silver Moon', color: '#6366f1' },
];

/**
 * Generate deterministic race speeds for each horse
 */
export function generateHorseSpeeds(seed: number, horseCount: number): number[] {
  const rng = new SeededRNG(seed);
  const speeds: number[] = [];

  for (let i = 0; i < horseCount; i++) {
    // Base speed between 0.5 and 1.5
    const baseSpeed = rng.nextRange(0.5, 1.5);
    speeds.push(baseSpeed);
  }

  return speeds;
}

/**
 * Simulate race progress at a given time
 * Returns progress for each horse (0-100)
 */
export function simulateRaceProgress(
  seed: number,
  horses: Horse[],
  elapsedTime: number,
  totalDuration: number = 5000
): RaceProgress[] {
  const speeds = generateHorseSpeeds(seed, horses.length);
  const rng = new SeededRNG(seed + elapsedTime);

  return horses.map((horse, index) => {
    const baseProgress = (elapsedTime / totalDuration) * speeds[index] * 100;
    // Add small random variation for visual interest
    const variance = rng.nextRange(-2, 2);
    const progress = Math.min(100, Math.max(0, baseProgress + variance));

    return {
      horseId: horse.id,
      progress,
    };
  });
}

/**
 * Calculate finish times for all horses
 */
export function calculateFinishTimes(seed: number, horses: Horse[]): RaceResult[] {
  const speeds = generateHorseSpeeds(seed, horses.length);
  const rng = new SeededRNG(seed);

  // Calculate finish time for each horse
  const finishTimes = horses.map((horse, index) => {
    const baseTime = 5000 / speeds[index];
    // Add random variation to make races interesting
    const variance = rng.nextRange(-500, 500);
    return {
      horseId: horse.id,
      finishTime: baseTime + variance,
    };
  });

  // Sort by finish time and assign positions
  finishTimes.sort((a, b) => a.finishTime - b.finishTime);

  return finishTimes.map((result, index) => ({
    horseId: result.horseId,
    position: index + 1,
    finishTime: result.finishTime,
  }));
}

/**
 * Calculate payouts based on finish positions
 * Traditional win/place/show betting structure
 */
export function calculatePayouts(results: RaceResult[], betAmount: number = 100): PayoutInfo[] {
  return results.map((result) => {
    let odds: number;
    let payout: number;

    // Calculate odds based on position
    switch (result.position) {
      case 1: // Win
        odds = 5.0;
        payout = betAmount * odds;
        break;
      case 2: // Place
        odds = 3.0;
        payout = betAmount * odds;
        break;
      case 3: // Show
        odds = 2.0;
        payout = betAmount * odds;
        break;
      default:
        odds = 0;
        payout = 0;
    }

    return {
      horseId: result.horseId,
      position: result.position,
      odds,
      payout,
    };
  });
}

/**
 * Run complete race simulation
 */
export function runRaceSimulation(seed: number, horses: Horse[] = DEFAULT_HORSES) {
  const results = calculateFinishTimes(seed, horses);
  const payouts = calculatePayouts(results);

  return {
    results,
    payouts,
  };
}
