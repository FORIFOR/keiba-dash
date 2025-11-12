import { describe, it, expect } from 'vitest';
import { generateHorses, runMonteCarloSimulations } from './race';
import { calculateWinProbabilities, calculateWinOdds } from './odds';
import type { RaceConfig } from './types';

describe('Probability and Odds Consistency', () => {
  it('should match theoretical win probabilities with Monte Carlo', () => {
    const config: RaceConfig = {
      numHorses: 8,
      temperature: 20,
      margin: 0.18,
      seed: 'test-123',
      difficulty: 'standard',
    };

    const horses = generateHorses(config);

    // Theoretical probabilities
    const theoreticalProbs = calculateWinProbabilities(horses, config.temperature);

    // Monte Carlo simulation (10,000 trials)
    const simulations = runMonteCarloSimulations(horses, config, 10000);

    // Count actual wins
    const winCounts = new Array(horses.length).fill(0);
    simulations.forEach(finishOrder => {
      const winnerId = finishOrder[0];
      winCounts[winnerId - 1]++;
    });

    const empiricalProbs = winCounts.map(count => count / simulations.length);

    console.log('\nProbability Comparison:');
    horses.forEach((_horse, i) => {
      console.log(
        `${_horse.name}: Rating=${_horse.rating.toFixed(1)} ` +
        `Theoretical=${(theoreticalProbs[i] * 100).toFixed(2)}% ` +
        `Empirical=${(empiricalProbs[i] * 100).toFixed(2)}%`
      );
    });

    // Check each probability is within reasonable error (±3%)
    horses.forEach((_horse, i) => {
      const diff = Math.abs(theoreticalProbs[i] - empiricalProbs[i]);
      expect(diff).toBeLessThan(0.03); // Within 3%
    });
  });

  it('should show odds reflect true probabilities with house edge', () => {
    const config: RaceConfig = {
      numHorses: 6,
      temperature: 20,
      margin: 0.18,
      seed: 'test-456',
      difficulty: 'standard',
    };

    const horses = generateHorses(config);

    // Get odds
    const odds = calculateWinOdds(horses, config);

    // Theoretical probabilities (without margin)
    const trueProbs = calculateWinProbabilities(horses, config.temperature);

    console.log('\nOdds vs True Probability:');
    horses.forEach((_horse, i) => {
      const impliedProb = 1 / odds[i];
      const fairOdds = 1 / trueProbs[i];
      const edge = ((impliedProb - trueProbs[i]) / trueProbs[i]) * 100;

      console.log(
        `${_horse.name}: ` +
        `TrueProb=${(trueProbs[i] * 100).toFixed(2)}% ` +
        `Odds=${odds[i].toFixed(2)}x ` +
        `FairOdds=${fairOdds.toFixed(2)}x ` +
        `Edge=${edge.toFixed(1)}%`
      );
    });

    // Sum of implied probabilities should be > 100% (overround)
    const totalImpliedProb = odds.reduce((sum, o) => sum + (1 / o), 0);
    console.log(`\nTotal implied probability: ${(totalImpliedProb * 100).toFixed(2)}%`);
    console.log(`House edge: ${((totalImpliedProb - 1) * 100).toFixed(2)}%`);

    expect(totalImpliedProb).toBeGreaterThan(1.0); // Overround
    expect(totalImpliedProb).toBeLessThan(1.25); // Reasonable margin
  });

  it('should show stronger horses win more often', () => {
    const config: RaceConfig = {
      numHorses: 4,
      temperature: 20,
      margin: 0.18,
      seed: 'test-789',
      difficulty: 'standard',
    };

    // Create horses with known ratings
    const horses = generateHorses(config);

    // Sort by rating
    const sortedHorses = [...horses].sort((a, b) => b.rating - a.rating);

    // Run simulations
    const simulations = runMonteCarloSimulations(horses, config, 5000);

    // Count wins
    const winCounts = new Array(horses.length).fill(0);
    simulations.forEach(finishOrder => {
      const winnerId = finishOrder[0];
      winCounts[winnerId - 1]++;
    });

    console.log('\nWin Rates by Rating:');
    sortedHorses.forEach(horse => {
      const index = horses.findIndex(h => h.id === horse.id);
      const winRate = (winCounts[index] / simulations.length) * 100;
      console.log(`${horse.name}: Rating=${horse.rating.toFixed(1)} WinRate=${winRate.toFixed(2)}%`);
    });

    // Strongest horse should have highest win rate
    const strongestHorse = sortedHorses[0];
    const strongestIndex = horses.findIndex(h => h.id === strongestHorse.id);

    horses.forEach((_horse, i) => {
      if (i !== strongestIndex && _horse.rating < strongestHorse.rating) {
        expect(winCounts[strongestIndex]).toBeGreaterThan(winCounts[i]);
      }
    });
  });
});
