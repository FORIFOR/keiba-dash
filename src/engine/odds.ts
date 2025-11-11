/**
 * Odds calculation with bookmaker margin (overround)
 * Handles win, place, quinella, and trifecta odds
 */

import type { Horse, RaceConfig, OddsTable } from './types';
import { calculateWeights } from './race';

/**
 * Calculate win probabilities from horse ratings
 * Using Plackett-Luce model: P(horse i wins) = s_i / Σs_j
 */
export function calculateWinProbabilities(horses: Horse[], temperature: number): number[] {
  const weights = calculateWeights(horses, temperature);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  return weights.map((w) => w / totalWeight);
}

/**
 * Apply bookmaker margin (overround) to probabilities
 * Inflates probabilities so they sum to > 100%
 */
export function applyOverround(probabilities: number[], margin: number): number[] {
  const totalProb = probabilities.reduce((sum, p) => sum + p, 0);
  const inflationFactor = (1 + margin) / totalProb;
  return probabilities.map((p) => p * inflationFactor);
}

/**
 * Convert probabilities to decimal odds
 * Odds = 1 / probability, with minimum floor
 */
export function toDecimalOdds(probabilities: number[], minOdds: number = 1.05): number[] {
  return probabilities.map((p) => Math.max(minOdds, 1 / p));
}

/**
 * Calculate win odds for all horses (analytical)
 */
export function calculateWinOdds(
  horses: Horse[],
  config: RaceConfig
): number[] {
  const winProbs = calculateWinProbabilities(horses, config.temperature);
  const adjustedProbs = applyOverround(winProbs, config.margin);
  return toDecimalOdds(adjustedProbs);
}

/**
 * Estimate place probabilities from Monte Carlo simulations
 * Place: horse finishes in top N (3 for 8+ horses, 2 for 7- horses)
 */
export function estimatePlaceProbabilities(
  simulations: number[][],
  numHorses: number
): number[] {
  const placeThreshold = numHorses >= 8 ? 3 : 2;
  const placeCounts = new Array(numHorses).fill(0);

  for (const finishOrder of simulations) {
    for (let i = 0; i < placeThreshold; i++) {
      const horseId = finishOrder[i];
      placeCounts[horseId - 1]++;
    }
  }

  return placeCounts.map((count) => count / simulations.length);
}

/**
 * Estimate quinella (exacta box) probabilities from Monte Carlo
 * Quinella: any 2 horses finish 1st-2nd in either order
 */
export function estimateQuinellaProbabilities(
  simulations: number[][]
): Map<string, number> {
  const quinellaCounts = new Map<string, number>();

  // Initialize counts
  // Note: We don't pre-initialize pairs, just count as we encounter them

  // Count occurrences
  for (const finishOrder of simulations) {
    const first = finishOrder[0];
    const second = finishOrder[1];
    const key = first < second ? `${first}-${second}` : `${second}-${first}`;
    quinellaCounts.set(key, (quinellaCounts.get(key) || 0) + 1);
  }

  // Convert to probabilities
  const probabilities = new Map<string, number>();
  quinellaCounts.forEach((count, key) => {
    probabilities.set(key, count / simulations.length);
  });

  return probabilities;
}

/**
 * Estimate trifecta probabilities from Monte Carlo
 * Trifecta: 3 horses finish 1st-2nd-3rd in exact order
 */
export function estimateTrifectaProbabilities(
  simulations: number[][]
): Map<string, number> {
  const trifectaCounts = new Map<string, number>();

  // Count occurrences
  for (const finishOrder of simulations) {
    const key = `${finishOrder[0]}-${finishOrder[1]}-${finishOrder[2]}`;
    trifectaCounts.set(key, (trifectaCounts.get(key) || 0) + 1);
  }

  // Convert to probabilities
  const probabilities = new Map<string, number>();
  trifectaCounts.forEach((count, key) => {
    probabilities.set(key, count / simulations.length);
  });

  return probabilities;
}

/**
 * Calculate complete odds table
 * Note: This is a synchronous version. Use Web Worker for production.
 */
export function calculateOddsTable(
  horses: Horse[],
  config: RaceConfig,
  simulations: number[][]
): OddsTable {
  // Win odds (analytical)
  const winOdds = calculateWinOdds(horses, config);

  // Place odds (from Monte Carlo)
  const placeProbs = estimatePlaceProbabilities(simulations, horses.length);
  const adjustedPlaceProbs = applyOverround(placeProbs, config.margin);
  const placeOdds = toDecimalOdds(adjustedPlaceProbs);

  // Quinella odds (from Monte Carlo)
  const quinellaProbs = estimateQuinellaProbabilities(simulations);
  const quinellaOdds = new Map<string, number>();
  quinellaProbs.forEach((prob, key) => {
    const adjustedProb = prob * (1 + config.margin);
    quinellaOdds.set(key, Math.max(1.05, 1 / adjustedProb));
  });

  // Trifecta odds (from Monte Carlo)
  const trifectaProbs = estimateTrifectaProbabilities(simulations);
  const trifectaOdds = new Map<string, number>();
  trifectaProbs.forEach((prob, key) => {
    const adjustedProb = prob * (1 + config.margin);
    trifectaOdds.set(key, Math.max(1.05, 1 / adjustedProb));
  });

  return {
    win: winOdds,
    place: placeOdds,
    quinella: quinellaOdds,
    trifecta: trifectaOdds,
  };
}

/**
 * Get quinella key from two horse IDs (normalized)
 */
export function getQuinellaKey(horse1: number, horse2: number): string {
  return horse1 < horse2 ? `${horse1}-${horse2}` : `${horse2}-${horse1}`;
}

/**
 * Get trifecta key from three horse IDs (order matters)
 */
export function getTrifectaKey(horse1: number, horse2: number, horse3: number): string {
  return `${horse1}-${horse2}-${horse3}`;
}

/**
 * Parse quinella key to horse IDs
 */
export function parseQuinellaKey(key: string): [number, number] {
  const [h1, h2] = key.split('-').map(Number);
  return [h1, h2];
}

/**
 * Parse trifecta key to horse IDs
 */
export function parseTrifectaKey(key: string): [number, number, number] {
  const [h1, h2, h3] = key.split('-').map(Number);
  return [h1, h2, h3];
}
