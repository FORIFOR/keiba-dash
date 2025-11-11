/**
 * Web Worker for Monte Carlo odds estimation
 * Runs simulations in background to avoid blocking UI
 */

import type { Horse, RaceConfig } from './types';
import { runMonteCarloSimulations } from './race';
import {
  estimatePlaceProbabilities,
  estimateQuinellaProbabilities,
  estimateTrifectaProbabilities,
  applyOverround,
  toDecimalOdds,
  calculateWinOdds,
} from './odds';

export interface WorkerInput {
  horses: Horse[];
  config: RaceConfig;
  numTrials: number;
}

export interface WorkerProgress {
  type: 'progress';
  progress: number;
  trials: number;
  totalTrials: number;
}

export interface WorkerResult {
  type: 'result';
  winOdds: number[];
  placeOdds: number[];
  quinellaOdds: [string, number][];
  trifectaOdds: [string, number][];
}

export type WorkerMessage = WorkerProgress | WorkerResult;

// Listen for messages from main thread
self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const { horses, config, numTrials } = event.data;

  console.log('[Worker] Received request:', { numHorses: horses.length, numTrials });

  try {
    // Run simulations with progress updates
    const batchSize = Math.max(1000, Math.floor(numTrials / 10));
    const allSimulations: number[][] = [];

    for (let batch = 0; batch < numTrials; batch += batchSize) {
      const currentBatchSize = Math.min(batchSize, numTrials - batch);
      const baseSeed = `${config.seed}-batch-${batch}`;

      const batchSimulations = runMonteCarloSimulations(
        horses,
        config,
        currentBatchSize,
        baseSeed
      );
      allSimulations.push(...batchSimulations);

      // Send progress update
      const progress: WorkerProgress = {
        type: 'progress',
        progress: Math.round((allSimulations.length / numTrials) * 100),
        trials: allSimulations.length,
        totalTrials: numTrials,
      };
      self.postMessage(progress);
    }

    // Calculate odds from simulations
    const winOdds = calculateWinOdds(horses, config);

    const placeProbs = estimatePlaceProbabilities(allSimulations, horses.length);
    const adjustedPlaceProbs = applyOverround(placeProbs, config.margin);
    const placeOdds = toDecimalOdds(adjustedPlaceProbs);

    const quinellaProbs = estimateQuinellaProbabilities(allSimulations);
    const quinellaOdds: [string, number][] = [];
    quinellaProbs.forEach((prob, key) => {
      const adjustedProb = prob * (1 + config.margin);
      const odds = Math.max(1.05, 1 / adjustedProb);
      quinellaOdds.push([key, odds]);
    });

    const trifectaProbs = estimateTrifectaProbabilities(allSimulations);
    const trifectaOdds: [string, number][] = [];
    trifectaProbs.forEach((prob, key) => {
      const adjustedProb = prob * (1 + config.margin);
      const odds = Math.max(1.05, 1 / adjustedProb);
      trifectaOdds.push([key, odds]);
    });

    // Send final result
    const result: WorkerResult = {
      type: 'result',
      winOdds,
      placeOdds,
      quinellaOdds,
      trifectaOdds,
    };
    console.log('[Worker] Sending result');
    self.postMessage(result);
  } catch (error) {
    console.error('[Worker] Error:', error);
    self.postMessage({ type: 'error', error: String(error) });
  }
};
