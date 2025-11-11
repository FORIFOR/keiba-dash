/**
 * Seeded Random Number Generator using Mulberry32
 * Provides deterministic random number generation from a seed
 */

/**
 * Simple hash function to convert string to 32-bit number
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Seeded RNG using Mulberry32 algorithm
 * Returns numbers in range [0, 1)
 */
export class SeededRNG {
  private state: number;

  constructor(seed: string | number) {
    if (typeof seed === 'string') {
      this.state = hashString(seed);
    } else {
      this.state = seed >>> 0; // Ensure unsigned 32-bit integer
    }

    // Ensure state is not zero
    if (this.state === 0) {
      this.state = 1;
    }
  }

  /**
   * Generate next random number in range [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate random number in range [min, max)
   */
  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generate random integer in range [min, max] (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.nextRange(min, max + 1));
  }

  /**
   * Choose a random element from an array
   */
  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /**
   * Shuffle an array in place using Fisher-Yates algorithm
   */
  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Clone the RNG with current state
   */
  clone(): SeededRNG {
    const rng = new SeededRNG(0);
    rng.state = this.state;
    return rng;
  }
}

/**
 * Create a new seeded RNG from a seed value
 */
export function createRNG(seed: string | number): SeededRNG {
  return new SeededRNG(seed);
}
