/**
 * Trifecta Learning Component
 * Auto-bets and learns patterns to predict trifecta outcomes
 */

import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../state/store';
import { globalPredictor } from '../engine/trifecta-predictor';
import type { TrifectaPrediction } from '../engine/trifecta-predictor';

export function TrifectaLearning() {
  const [isLearning, setIsLearning] = useState(false);
  const [learningStats, setLearningStats] = useState({
    totalRaces: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    totalProfit: 0,
    avgConfidence: 0,
  });
  const [predictions, setPredictions] = useState<TrifectaPrediction[]>([]);
  const [autoBetSpeed, setAutoBetSpeed] = useState(1000); // ms delay between races

  const store = useGameStore();

  const runAutoBet = useCallback(async () => {
    const { currentHorses, currentOdds, addBet, runRace, clearBets } = store;

    if (!currentOdds || currentHorses.length === 0) {
      console.log('[Learning] Waiting for odds...');
      return;
    }

    // Clear previous bets
    clearBets();

    // Get predictions
    const newPredictions = globalPredictor.predict(currentHorses, currentOdds);
    setPredictions(newPredictions);

    // Bet on the highest confidence prediction
    if (newPredictions.length > 0) {
      const bestPrediction = newPredictions[0];

      // Place trifecta bet
      addBet({
        type: 'trifecta',
        horses: [...bestPrediction.horses],
        stake: 100, // Fixed stake for learning
      });

      console.log(`[Learning] Betting on trifecta: ${bestPrediction.horses.join('-')} (confidence: ${bestPrediction.confidence}%)`);
    }

    // Run the race
    const result = runRace();

    if (result) {
      // Record the race for learning
      const trifecta: [number, number, number] = [
        result.result.finishOrder[0],
        result.result.finishOrder[1],
        result.result.finishOrder[2],
      ];

      const trifectaKey = `${trifecta[0]}-${trifecta[1]}-${trifecta[2]}`;
      const trifectaOdds = currentOdds.trifecta.get(trifectaKey) || 0;

      globalPredictor.recordRace({
        raceNumber: result.raceNumber,
        horses: currentHorses,
        odds: currentOdds,
        actualResult: result.result.finishOrder,
        trifecta,
        trifectaOdds,
      });

      // Update stats
      const won = result.result.netProfit > 0;
      setLearningStats((prev) => {
        const totalRaces = prev.totalRaces + 1;
        const wins = prev.wins + (won ? 1 : 0);
        const losses = prev.losses + (won ? 0 : 1);
        const winRate = (wins / totalRaces) * 100;
        const totalProfit = prev.totalProfit + result.result.netProfit;

        return {
          totalRaces,
          wins,
          losses,
          winRate,
          totalProfit,
          avgConfidence: newPredictions[0]?.confidence || 0,
        };
      });

      // Auto-continue to next race
      setTimeout(() => {
        store.generateNewRace();
      }, 100);
    }
  }, [store, setPredictions, setLearningStats]);

  useEffect(() => {
    let interval: number | null = null;

    if (isLearning && !store.raceInProgress && !store.gameOver) {
      interval = window.setTimeout(() => {
        runAutoBet();
      }, autoBetSpeed);
    }

    return () => {
      if (interval) clearTimeout(interval);
    };
  }, [isLearning, store.raceInProgress, store.gameOver, autoBetSpeed, runAutoBet]);

  const startLearning = () => {
    setIsLearning(true);
    setLearningStats({
      totalRaces: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalProfit: 0,
      avgConfidence: 0,
    });
  };

  const stopLearning = () => {
    setIsLearning(false);
  };

  const predictorStats = globalPredictor.getStats();

  return (
    <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
      <h2 className="text-2xl font-bold mb-4 text-amber-400">
        🤖 Trifecta Learning System
      </h2>

      <div className="space-y-4">
        {/* Learning Status */}
        <div className="bg-slate-700 rounded p-4">
          <h3 className="font-semibold mb-2 text-lg">Learning Status</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-slate-400">Status:</span>
              <span className={`ml-2 font-bold ${isLearning ? 'text-green-400' : 'text-slate-400'}`}>
                {isLearning ? '🟢 Active' : '⚪ Idle'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Data Points:</span>
              <span className="ml-2 font-bold text-blue-400">{predictorStats.totalRaces}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400">Ready:</span>
              <span className={`ml-2 font-bold ${predictorStats.readyForPrediction ? 'text-green-400' : 'text-yellow-400'}`}>
                {predictorStats.readyForPrediction ? '✓ Yes' : `Need ${10 - predictorStats.totalRaces} more races`}
              </span>
            </div>
          </div>
        </div>

        {/* Learning Stats */}
        <div className="bg-slate-700 rounded p-4">
          <h3 className="font-semibold mb-2 text-lg">Session Statistics</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-800 rounded p-2">
              <div className="text-slate-400 text-xs">Races</div>
              <div className="text-xl font-bold text-blue-400">{learningStats.totalRaces}</div>
            </div>
            <div className="bg-slate-800 rounded p-2">
              <div className="text-slate-400 text-xs">Win Rate</div>
              <div className="text-xl font-bold text-green-400">
                {learningStats.winRate.toFixed(1)}%
              </div>
            </div>
            <div className="bg-slate-800 rounded p-2">
              <div className="text-slate-400 text-xs">Wins / Losses</div>
              <div className="text-xl font-bold">
                <span className="text-green-400">{learningStats.wins}</span>
                <span className="text-slate-500"> / </span>
                <span className="text-red-400">{learningStats.losses}</span>
              </div>
            </div>
            <div className="bg-slate-800 rounded p-2">
              <div className="text-slate-400 text-xs">Total Profit</div>
              <div className={`text-xl font-bold ${learningStats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {learningStats.totalProfit >= 0 ? '+' : ''}{learningStats.totalProfit}pt
              </div>
            </div>
          </div>
        </div>

        {/* Current Predictions */}
        {predictions.length > 0 && (
          <div className="bg-slate-700 rounded p-4">
            <h3 className="font-semibold mb-2 text-lg">Current Predictions</h3>
            <div className="space-y-2">
              {predictions.map((pred, idx) => (
                <div key={idx} className="bg-slate-800 rounded p-3 text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-mono font-bold text-amber-400">
                      {pred.horses[0]} → {pred.horses[1]} → {pred.horses[2]}
                    </div>
                    <div className="text-xs px-2 py-1 bg-blue-600 rounded">
                      {pred.confidence}% confidence
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">{pred.reasoning}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Expected odds: {pred.expectedOdds.toFixed(2)}x
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Auto-bet Speed (ms delay)
            </label>
            <input
              type="range"
              min="100"
              max="3000"
              step="100"
              value={autoBetSpeed}
              onChange={(e) => setAutoBetSpeed(Number(e.target.value))}
              className="w-full"
              disabled={isLearning}
            />
            <div className="text-xs text-slate-500 text-center">{autoBetSpeed}ms</div>
          </div>

          <div className="flex gap-2">
            {!isLearning ? (
              <button
                onClick={startLearning}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded transition-colors"
                disabled={store.gameOver}
              >
                Start Learning
              </button>
            ) : (
              <button
                onClick={stopLearning}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded transition-colors"
              >
                Stop Learning
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="text-xs text-slate-400 bg-slate-900 rounded p-3">
          <p className="mb-1">
            <strong>How it works:</strong> The system automatically places trifecta bets and learns from results.
          </p>
          <p>
            It analyzes odds patterns, favorite performance, upset frequency, and historical correlations
            to improve predictions over time.
          </p>
        </div>
      </div>
    </div>
  );
}
