/**
 * Race simulation using Plackett-Luce model
 * Generates deterministic race outcomes based on horse ratings
 */

import { SeededRNG } from './rng';
import type { Horse, RaceConfig } from './types';

/**
 * Generate horse names
 */
const HORSE_NAMES = [
  'Thunder Bolt',
  'Swift Wind',
  'Golden Arrow',
  'Midnight Star',
  'Lucky Charm',
  'Fire Storm',
  'Ocean Wave',
  'Silver Moon',
  'Royal Flash',
  'Dark Knight',
  'Storm Rider',
  'Desert Rose',
  'Crimson Blaze',
  'Shadow Hunter',
  'Phoenix Wings',
  'Crystal Dream',
];

const HORSE_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#10b981', // green
  '#f97316', // orange
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#a855f7', // violet
  '#dc2626', // dark red
  '#1d4ed8', // dark blue
  '#84cc16', // lime
  '#7c3aed', // dark purple
];

/**
 * Generate horses with random ratings
 */
export function generateHorses(config: RaceConfig): Horse[] {
  const rng = new SeededRNG(config.seed);
  const horses: Horse[] = [];

  for (let i = 0; i < config.numHorses; i++) {
    horses.push({
      id: i + 1,
      name: HORSE_NAMES[i % HORSE_NAMES.length],
      rating: rng.nextRange(60, 100),
      color: HORSE_COLORS[i % HORSE_COLORS.length],
    });
  }

  return horses;
}

/**
 * Calculate Plackett-Luce weights from ratings
 * Weight s_i = exp(rating_i / τ)
 */
export function calculateWeights(horses: Horse[], temperature: number): number[] {
  return horses.map((horse) => Math.exp(horse.rating / temperature));
}

/**
 * Sample one horse from remaining horses based on weights
 * Using weighted random selection
 */
function sampleByWeight(
  remainingIndices: number[],
  weights: number[],
  rng: SeededRNG
): number {
  // Calculate total weight of remaining horses
  const totalWeight = remainingIndices.reduce((sum, idx) => sum + weights[idx], 0);

  // Random value in [0, totalWeight)
  let target = rng.next() * totalWeight;

  // Find the selected horse
  for (const idx of remainingIndices) {
    target -= weights[idx];
    if (target <= 0) {
      return idx;
    }
  }

  // Fallback (should not reach here due to floating point)
  return remainingIndices[remainingIndices.length - 1];
}

/**
 * Simulate race finish order using Plackett-Luce model
 * Returns array of horse IDs in finish order [1st, 2nd, 3rd, ...]
 */
export function simulateRace(horses: Horse[], config: RaceConfig): number[] {
  const rng = new SeededRNG(config.seed);
  const weights = calculateWeights(horses, config.temperature);

  const finishOrder: number[] = [];
  const remainingIndices = horses.map((_, idx) => idx);

  // Draw horses one by one until all placed
  while (remainingIndices.length > 0) {
    const selectedIdx = sampleByWeight(remainingIndices, weights, rng);
    finishOrder.push(horses[selectedIdx].id);

    // Remove selected horse from remaining
    const removeIdx = remainingIndices.indexOf(selectedIdx);
    remainingIndices.splice(removeIdx, 1);
  }

  return finishOrder;
}

/**
 * Run multiple race simulations for Monte Carlo estimation
 * Returns array of finish orders
 */
export function runMonteCarloSimulations(
  horses: Horse[],
  config: RaceConfig,
  numTrials: number,
  baseSeed?: string
): number[][] {
  const results: number[][] = [];
  const seed = baseSeed || config.seed;

  for (let trial = 0; trial < numTrials; trial++) {
    // Create unique seed for each trial
    const trialConfig = { ...config, seed: `${seed}-trial-${trial}` };
    const finishOrder = simulateRace(horses, trialConfig);
    results.push(finishOrder);
  }

  return results;
}

/**
 * Generate pseudo racing history for display (optional)
 * Shows simulated recent form based on rating
 */
export function generatePseudoHistory(
  horse: Horse,
  numRaces: number = 5,
  seed: string
): number[] {
  const rng = new SeededRNG(`${seed}-${horse.id}`);
  const history: number[] = [];

  for (let i = 0; i < numRaces; i++) {
    // Higher rating = better average finish
    // Rating 100 -> avg ~2nd, Rating 60 -> avg ~6th
    const avgFinish = 8 - (horse.rating - 60) / 10;
    const variance = 2.5;
    const finish = Math.max(
      1,
      Math.min(12, Math.round(rng.nextRange(avgFinish - variance, avgFinish + variance)))
    );
    history.push(finish);
  }

  return history;
}
