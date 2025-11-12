/**
 * Trifecta Prediction System
 * Learns from race results to predict trifecta outcomes based on odds
 */

import type { Horse, OddsTable } from './types';

export interface TrifectaPrediction {
  horses: [number, number, number]; // IDs in order: 1st, 2nd, 3rd
  confidence: number; // 0-100
  expectedOdds: number;
  reasoning: string;
}

export interface RaceDataPoint {
  raceNumber: number;
  horses: Horse[];
  odds: OddsTable;
  actualResult: number[]; // Finish order
  trifecta: [number, number, number];
  trifectaOdds: number;
}

export interface PatternAnalysis {
  favoritesWinRate: number;
  averageWinnerOdds: number;
  oddsRankCorrelation: number[];
  upsetFrequency: number;
}

export class TrifectaPredictor {
  private raceHistory: RaceDataPoint[] = [];
  private readonly MAX_HISTORY = 1000; // Keep last 1000 races
  private predictionAccuracy = {
    totalPredictions: 0,
    exactMatches: 0, // All 3 horses in exact order
    partialMatches: 0, // 2 out of 3 horses correct
    singleMatches: 0, // 1 out of 3 horses correct
  };
  private lastPrediction: TrifectaPrediction | null = null;

  /**
   * Record a race result for learning
   */
  recordRace(dataPoint: RaceDataPoint): void {
    this.raceHistory.push(dataPoint);

    // Keep only recent history
    if (this.raceHistory.length > this.MAX_HISTORY) {
      this.raceHistory.shift();
    }

    // Check prediction accuracy
    if (this.lastPrediction) {
      this.evaluatePrediction(this.lastPrediction, dataPoint.actualResult);
    }

    console.log(`[Predictor] Recorded race #${dataPoint.raceNumber}. Total data points: ${this.raceHistory.length}`);
  }

  /**
   * Evaluate how accurate the prediction was
   */
  private evaluatePrediction(prediction: TrifectaPrediction, actualResult: number[]): void {
    this.predictionAccuracy.totalPredictions++;

    const predicted = prediction.horses;
    const actual = actualResult.slice(0, 3); // Top 3 finishers

    // Check exact match (all 3 in exact order)
    if (predicted[0] === actual[0] && predicted[1] === actual[1] && predicted[2] === actual[2]) {
      this.predictionAccuracy.exactMatches++;
      console.log('🎯 [Predictor] EXACT MATCH! Predicted:', predicted, 'Actual:', actual);
      return;
    }

    // Check partial matches
    const predictedSet = new Set(predicted);
    const matches = actual.filter(h => predictedSet.has(h)).length;

    if (matches === 2) {
      this.predictionAccuracy.partialMatches++;
      console.log('✓ [Predictor] Partial match (2/3):', predicted, 'Actual:', actual);
    } else if (matches === 1) {
      this.predictionAccuracy.singleMatches++;
      console.log('~ [Predictor] Single match (1/3):', predicted, 'Actual:', actual);
    } else {
      console.log('✗ [Predictor] No match:', predicted, 'Actual:', actual);
    }
  }

  /**
   * Predict trifecta based on current odds and historical data
   */
  predict(horses: Horse[], odds: OddsTable): TrifectaPrediction[] {
    let predictions: TrifectaPrediction[];

    if (this.raceHistory.length < 10) {
      // Not enough data, use simple odds-based prediction
      predictions = this.predictByOdds(horses, odds);
    } else {
      // Analyze patterns from history
      const patterns = this.analyzePatterns();

      // Generate predictions using learned patterns
      predictions = this.predictWithPatterns(horses, odds, patterns);
    }

    // Store the top prediction for evaluation
    if (predictions.length > 0) {
      this.lastPrediction = predictions[0];
    }

    return predictions;
  }

  /**
   * Simple prediction based on win odds (fallback for early races)
   */
  private predictByOdds(horses: Horse[], odds: OddsTable): TrifectaPrediction[] {
    // Sort horses by win odds (lower odds = favorite)
    const sortedByOdds = horses
      .map((horse, idx) => ({ horse, odds: odds.win[idx] }))
      .sort((a, b) => a.odds - b.odds);

    const predictions: TrifectaPrediction[] = [];

    // Strategy 1: Top 3 favorites in order
    if (sortedByOdds.length >= 3) {
      const top3 = sortedByOdds.slice(0, 3);
      const trifectaKey = `${top3[0].horse.id}-${top3[1].horse.id}-${top3[2].horse.id}`;
      predictions.push({
        horses: [top3[0].horse.id, top3[1].horse.id, top3[2].horse.id],
        confidence: 30,
        expectedOdds: odds.trifecta.get(trifectaKey) || 10,
        reasoning: 'Top 3 favorites by odds',
      });
    }

    // Strategy 2: Favorite + 2nd + dark horse (4th or 5th)
    if (sortedByOdds.length >= 5) {
      const darkHorse = sortedByOdds[4];
      const trifectaKey = `${sortedByOdds[0].horse.id}-${sortedByOdds[1].horse.id}-${darkHorse.horse.id}`;
      predictions.push({
        horses: [sortedByOdds[0].horse.id, sortedByOdds[1].horse.id, darkHorse.horse.id],
        confidence: 25,
        expectedOdds: odds.trifecta.get(trifectaKey) || 20,
        reasoning: 'Favorites with dark horse finish',
      });
    }

    // Strategy 3: Mixed favorites (1st, 3rd, 2nd order)
    if (sortedByOdds.length >= 3) {
      const trifectaKey = `${sortedByOdds[0].horse.id}-${sortedByOdds[2].horse.id}-${sortedByOdds[1].horse.id}`;
      predictions.push({
        horses: [sortedByOdds[0].horse.id, sortedByOdds[2].horse.id, sortedByOdds[1].horse.id],
        confidence: 20,
        expectedOdds: odds.trifecta.get(trifectaKey) || 15,
        reasoning: 'Upset scenario with 3rd favorite placing 2nd',
      });
    }

    return predictions.slice(0, 3);
  }

  /**
   * Analyze historical patterns
   */
  private analyzePatterns(): PatternAnalysis {
    const patterns: PatternAnalysis = {
      favoritesWinRate: 0,
      averageWinnerOdds: 0,
      oddsRankCorrelation: [],
      upsetFrequency: 0,
    };

    if (this.raceHistory.length === 0) return patterns;

    let favoritesWon = 0;
    let totalWinnerOdds = 0;
    let upsets = 0;

    for (const race of this.raceHistory) {
      const winner = race.actualResult[0];
      const winnerIdx = race.horses.findIndex(h => h.id === winner);

      if (winnerIdx !== -1) {
        const winnerOdds = race.odds.win[winnerIdx];
        totalWinnerOdds += winnerOdds;

        // Check if favorite won (odds < 3.0)
        if (winnerOdds < 3.0) {
          favoritesWon++;
        }

        // Check for upset (odds > 8.0)
        if (winnerOdds > 8.0) {
          upsets++;
        }

        // Rank correlation: find odds rank of actual finishers
        const oddsRanks = this.getOddsRanks(race.horses, race.odds);
        for (let i = 0; i < Math.min(3, race.actualResult.length); i++) {
          const horseId = race.actualResult[i];
          const rank = oddsRanks.get(horseId) || 0;
          if (!patterns.oddsRankCorrelation[i]) {
            patterns.oddsRankCorrelation[i] = 0;
          }
          patterns.oddsRankCorrelation[i] += rank;
        }
      }
    }

    const raceCount = this.raceHistory.length;
    patterns.favoritesWinRate = favoritesWon / raceCount;
    patterns.averageWinnerOdds = totalWinnerOdds / raceCount;
    patterns.upsetFrequency = upsets / raceCount;
    patterns.oddsRankCorrelation = patterns.oddsRankCorrelation.map(sum => sum / raceCount);

    console.log('[Predictor] Pattern analysis:', patterns);

    return patterns;
  }

  /**
   * Get odds ranking for each horse (1 = lowest odds/favorite)
   */
  private getOddsRanks(horses: Horse[], odds: OddsTable): Map<number, number> {
    const sorted = horses
      .map((horse, idx) => ({ id: horse.id, odds: odds.win[idx] }))
      .sort((a, b) => a.odds - b.odds);

    const ranks = new Map<number, number>();
    sorted.forEach((item, idx) => {
      ranks.set(item.id, idx + 1);
    });

    return ranks;
  }

  /**
   * Predict with learned patterns
   */
  private predictWithPatterns(horses: Horse[], odds: OddsTable, patterns: PatternAnalysis): TrifectaPrediction[] {
    const predictions: TrifectaPrediction[] = [];

    // Sort by odds
    const sortedByOdds = horses
      .map((horse, idx) => ({ horse, odds: odds.win[idx], idx }))
      .sort((a, b) => a.odds - b.odds);

    // Strategy 1: Pattern-based favorite prediction
    if (patterns.favoritesWinRate > 0.4) {
      // Favorites tend to win often
      const top3 = sortedByOdds.slice(0, 3);
      const trifectaKey = `${top3[0].horse.id}-${top3[1].horse.id}-${top3[2].horse.id}`;
      predictions.push({
        horses: [top3[0].horse.id, top3[1].horse.id, top3[2].horse.id],
        confidence: Math.min(80, Math.round(patterns.favoritesWinRate * 100)),
        expectedOdds: odds.trifecta.get(trifectaKey) || 10,
        reasoning: `Favorites win ${Math.round(patterns.favoritesWinRate * 100)}% of the time`,
      });
    }

    // Strategy 2: Upset scenario prediction
    if (patterns.upsetFrequency > 0.2 && sortedByOdds.length >= 8) {
      const longshot = sortedByOdds[Math.floor(Math.random() * 4) + 4]; // 5th-8th favorite
      const trifectaKey = `${longshot.horse.id}-${sortedByOdds[0].horse.id}-${sortedByOdds[1].horse.id}`;
      predictions.push({
        horses: [longshot.horse.id, sortedByOdds[0].horse.id, sortedByOdds[1].horse.id],
        confidence: Math.round(patterns.upsetFrequency * 100),
        expectedOdds: odds.trifecta.get(trifectaKey) || 50,
        reasoning: `Upset occurs ${Math.round(patterns.upsetFrequency * 100)}% of the time`,
      });
    }

    // Strategy 3: Correlation-based prediction
    if (patterns.oddsRankCorrelation.length >= 3) {
      // Use average rank positions to predict likely finishers
      const avgRanks = patterns.oddsRankCorrelation;
      const predicted = [
        sortedByOdds[Math.min(Math.round(avgRanks[0]) - 1, sortedByOdds.length - 1)],
        sortedByOdds[Math.min(Math.round(avgRanks[1]) - 1, sortedByOdds.length - 1)],
        sortedByOdds[Math.min(Math.round(avgRanks[2]) - 1, sortedByOdds.length - 1)],
      ];

      // Ensure no duplicates
      const uniqueIds = new Set(predicted.map(p => p.horse.id));
      if (uniqueIds.size === 3) {
        const trifectaKey = `${predicted[0].horse.id}-${predicted[1].horse.id}-${predicted[2].horse.id}`;
        predictions.push({
          horses: [predicted[0].horse.id, predicted[1].horse.id, predicted[2].horse.id],
          confidence: 60,
          expectedOdds: odds.trifecta.get(trifectaKey) || 20,
          reasoning: `Based on historical rank correlation pattern`,
        });
      }
    }

    // Fill with simple odds-based if not enough predictions
    if (predictions.length < 3) {
      predictions.push(...this.predictByOdds(horses, odds));
    }

    // Return top 3 unique predictions
    const seen = new Set<string>();
    return predictions.filter(p => {
      const key = p.horses.join('-');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 3);
  }

  /**
   * Get prediction statistics
   */
  getStats() {
    const exactMatchRate = this.predictionAccuracy.totalPredictions > 0
      ? (this.predictionAccuracy.exactMatches / this.predictionAccuracy.totalPredictions) * 100
      : 0;
    const partialMatchRate = this.predictionAccuracy.totalPredictions > 0
      ? (this.predictionAccuracy.partialMatches / this.predictionAccuracy.totalPredictions) * 100
      : 0;
    const anyMatchRate = this.predictionAccuracy.totalPredictions > 0
      ? ((this.predictionAccuracy.exactMatches + this.predictionAccuracy.partialMatches + this.predictionAccuracy.singleMatches) / this.predictionAccuracy.totalPredictions) * 100
      : 0;

    return {
      totalRaces: this.raceHistory.length,
      readyForPrediction: this.raceHistory.length >= 10,
      accuracy: {
        ...this.predictionAccuracy,
        exactMatchRate,
        partialMatchRate,
        anyMatchRate,
      },
    };
  }

  /**
   * Export history data
   */
  exportHistory(): RaceDataPoint[] {
    return [...this.raceHistory];
  }

  /**
   * Import history data
   */
  importHistory(data: RaceDataPoint[]): void {
    this.raceHistory = data.slice(-this.MAX_HISTORY);
  }
}

// Global predictor instance
export const globalPredictor = new TrifectaPredictor();
