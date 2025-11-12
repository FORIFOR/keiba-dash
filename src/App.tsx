import { useEffect, useState } from 'react';
import { useGameStore } from './state/store';
import { useOddsWorker } from './hooks/useOddsWorker';
import type { Bet, BetType } from './engine/types';
import { MIN_BET, INITIAL_BANKROLL } from './engine/types';
import { TrifectaLearning } from './components/TrifectaLearning';

function App() {
  const {
    bankroll,
    raceNumber,
    settings,
    currentHorses,
    currentBets,
    currentOdds,
    gameOver,
    startNewGame,
    generateNewRace,
    addBet,
    removeBet,
    runRace,
    continueAfterGameOver,
    getCurrentRaceConfig,
    setOdds,
    setOddsLoading,
    setOddsProgress,
    oddsLoading,
    oddsProgress,
  } = useGameStore();

  const { calculateOdds, loading: workerLoading, progress: workerProgress, odds: workerOdds } = useOddsWorker();
  const [betType, setBetType] = useState<BetType>('win');
  const [selectedHorses, setSelectedHorses] = useState<number[]>([]);
  const [stake, setStake] = useState(MIN_BET);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<ReturnType<typeof runRace> | null>(null);
  const [isRacing, setIsRacing] = useState(false);
  const [raceProgress, setRaceProgress] = useState<Record<number, number>>({});

  // Initialize game on first load
  useEffect(() => {
    if (currentHorses.length === 0) {
      startNewGame();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate odds when horses change
  useEffect(() => {
    if (currentHorses.length > 0 && !currentOdds) {
      const config = getCurrentRaceConfig();
      calculateOdds(currentHorses, config, settings.monteCarloTrials);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHorses]);

  // Sync worker state to store
  useEffect(() => {
    setOddsLoading(workerLoading);
  }, [workerLoading, setOddsLoading]);

  useEffect(() => {
    setOddsProgress(workerProgress);
  }, [workerProgress, setOddsProgress]);

  useEffect(() => {
    if (workerOdds) {
      setOdds(workerOdds);
    }
  }, [workerOdds, setOdds]);

  const handleAddBet = () => {
    const requiredHorses = betType === 'win' || betType === 'place' ? 1 : betType === 'quinella' ? 2 : 3;

    if (selectedHorses.length !== requiredHorses) {
      alert(`Select ${requiredHorses} horse(s) for ${betType} bet`);
      return;
    }

    const bet: Bet = {
      type: betType,
      horses: [...selectedHorses],
      stake,
    };

    addBet(bet);
    setSelectedHorses([]);
  };

  const handleRunRace = () => {
    // Start race animation
    setIsRacing(true);
    setRaceProgress({});

    // Get race result
    const result = runRace();
    if (!result) return;

    // Animate race for 5 seconds
    const RACE_DURATION = 5000;
    const startTime = Date.now();

    const finishOrder = result.result.finishOrder;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / RACE_DURATION);

      if (progress >= 1) {
        // Race finished - show final positions
        const finalProgress: Record<number, number> = {};
        finishOrder.forEach((horseId, index) => {
          // Winners finish at 100%, others spread out based on position
          finalProgress[horseId] = 100 - (index * 2);
        });
        setRaceProgress(finalProgress);
        setIsRacing(false);
        setLastResult(result);
        setShowResult(true);
        return;
      }

      // Update progress for each horse
      const currentProgress: Record<number, number> = {};
      finishOrder.forEach((horseId, index) => {
        // Each horse progresses at different rate based on final position
        // Add some randomness for visual interest
        const baseSpeed = 1 - (index * 0.08);
        const randomVariation = Math.sin(elapsed / 100 + horseId) * 3;
        currentProgress[horseId] = (progress * baseSpeed * 100) + randomVariation;
      });
      setRaceProgress(currentProgress);

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  };

  const handleNextRace = () => {
    setShowResult(false);
    setLastResult(null);
    setRaceProgress({});
    generateNewRace();
  };

  const toggleHorseSelection = (horseId: number) => {
    const maxSelection = betType === 'win' || betType === 'place' ? 1 : betType === 'quinella' ? 2 : 3;

    if (selectedHorses.includes(horseId)) {
      setSelectedHorses(selectedHorses.filter(id => id !== horseId));
    } else if (selectedHorses.length < maxSelection) {
      setSelectedHorses([...selectedHorses, horseId]);
    }
  };

  const getOddsForHorse = (horseId: number, type: BetType) => {
    if (!currentOdds) return '-';
    if (type === 'win') return currentOdds.win[horseId - 1].toFixed(2);
    if (type === 'place') return currentOdds.place[horseId - 1].toFixed(2);
    return '-';
  };

  const totalStake = currentBets.reduce((sum, bet) => sum + bet.stake, 0);

  if (gameOver) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg text-center">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Game Over!</h1>
          <p className="text-xl mb-6">You ran out of points</p>
          <div className="space-x-4">
            <button
              onClick={startNewGame}
              className="px-6 py-3 bg-blue-600 rounded hover:bg-blue-700"
            >
              New Game
            </button>
            <button
              onClick={continueAfterGameOver}
              className="px-6 py-3 bg-green-600 rounded hover:bg-green-700"
            >
              Continue ({INITIAL_BANKROLL}pt)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <header className="bg-gray-800 p-4 rounded-lg mb-4">
        <h1 className="text-3xl font-bold text-center">Horse Racing Betting Game</h1>
        <div className="flex justify-between mt-2 text-sm">
          <span>Bankroll: <span className="text-yellow-400 font-bold">{bankroll}pt</span></span>
          <span>Race #{raceNumber}</span>
          <span className="capitalize">{settings.difficulty} Mode</span>
        </div>
      </header>

      {showResult && lastResult && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-2xl max-h-[80vh] overflow-auto">
            <h2 className="text-2xl font-bold mb-4">Race Result</h2>
            <div className="mb-4">
              <h3 className="font-bold mb-2">Finish Order:</h3>
              {lastResult.result.finishOrder.map((horseId: number, idx: number) => {
                const horse = currentHorses.find(h => h.id === horseId);
                return (
                  <div key={idx} className="flex items-center gap-3 mb-1">
                    <span className="font-bold w-6">{idx + 1}.</span>
                    <span className="font-bold text-yellow-400 w-8">#{horseId}</span>
                    <span style={{ color: horse?.color }}>{horse?.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-700 pt-4">
              <p>Total Stake: {lastResult.result.totalStake}pt</p>
              <p>Total Payout: {lastResult.result.totalPayout}pt</p>
              <p className={lastResult.result.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                Net Profit: {lastResult.result.netProfit >= 0 ? '+' : ''}{lastResult.result.netProfit}pt
              </p>
            </div>
            <button
              onClick={handleNextRace}
              className="mt-4 w-full px-6 py-3 bg-blue-600 rounded hover:bg-blue-700"
            >
              Next Race
            </button>
          </div>
        </div>
      )}

      {/* Trifecta Learning Panel */}
      <div className="mb-4">
        <TrifectaLearning />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Horses Table */}
        <div className="lg:col-span-2 bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Horses</h2>
          {oddsLoading && (
            <div className="mb-4">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${oddsProgress}%` }}
                />
              </div>
              <p className="text-sm text-center mt-1">Calculating odds... {oddsProgress}%</p>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="p-2 text-center w-16">#</th>
                  <th className="p-2 text-left">Select</th>
                  <th className="p-2 text-left">Horse</th>
                  {settings.showRatings && <th className="p-2">Rating</th>}
                  <th className="p-2">Win</th>
                  <th className="p-2">Place</th>
                </tr>
              </thead>
              <tbody>
                {currentHorses.map((horse) => (
                  <tr key={horse.id} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="p-2 text-center">
                      <span className="font-bold text-yellow-400">{horse.id}</span>
                    </td>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedHorses.includes(horse.id)}
                        onChange={() => toggleHorseSelection(horse.id)}
                        disabled={oddsLoading}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: horse.color }}
                        />
                        <span>{horse.name}</span>
                      </div>
                    </td>
                    {settings.showRatings && (
                      <td className="p-2 text-center">{horse.rating.toFixed(1)}</td>
                    )}
                    <td className="p-2 text-center">{getOddsForHorse(horse.id, 'win')}</td>
                    <td className="p-2 text-center">{getOddsForHorse(horse.id, 'place')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Race Track Animation */}
          {(isRacing || Object.keys(raceProgress).length > 0) && (
            <div className="mt-6 bg-gray-900 p-4 rounded-lg">
              <h3 className="text-lg font-bold mb-4 text-center">
                {isRacing ? '🏁 Racing... 🏁' : '🏆 Race Finished! 🏆'}
              </h3>
              <div className="space-y-3">
                {currentHorses.map((horse) => {
                  const progress = raceProgress[horse.id] || 0;
                  return (
                    <div key={horse.id} className="flex items-center gap-3">
                      <div className="w-8 text-center text-sm font-bold text-yellow-400">
                        {horse.id}
                      </div>
                      <div className="w-32 text-sm font-semibold" style={{ color: horse.color }}>
                        {horse.name}
                      </div>
                      <div className="flex-1 bg-gray-700 h-8 rounded-full overflow-hidden relative">
                        <div
                          className="h-full transition-all duration-100 flex items-center justify-end pr-2"
                          style={{
                            width: `${Math.min(100, Math.max(0, progress))}%`,
                            backgroundColor: horse.color,
                          }}
                        >
                          <span className="text-2xl">🐴</span>
                        </div>
                      </div>
                      <div className="w-16 text-right text-sm font-mono">
                        {Math.round(progress)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bet Slip */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Bet Slip</h2>

          <div className="mb-4">
            <label className="block mb-2">Bet Type:</label>
            <select
              value={betType}
              onChange={(e) => {
                setBetType(e.target.value as BetType);
                setSelectedHorses([]);
              }}
              className="w-full p-2 bg-gray-700 rounded"
            >
              <option value="win">Win (1st)</option>
              <option value="place">Place (Top 2-3)</option>
              <option value="quinella">Quinella (1-2 any order)</option>
              <option value="trifecta">Trifecta (1-2-3 exact)</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block mb-2">Stake:</label>
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(Math.max(MIN_BET, parseInt(e.target.value) || MIN_BET))}
              min={MIN_BET}
              step={100}
              className="w-full p-2 bg-gray-700 rounded"
            />
          </div>

          <button
            onClick={handleAddBet}
            disabled={selectedHorses.length === 0 || oddsLoading}
            className="w-full mb-4 px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Add Bet
          </button>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="font-bold mb-2">Current Bets ({currentBets.length}):</h3>
            {currentBets.length === 0 ? (
              <p className="text-gray-400 text-sm">No bets placed</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {currentBets.map((bet, idx) => (
                  <div key={idx} className="bg-gray-700 p-2 rounded flex justify-between items-center text-sm">
                    <div>
                      <div className="font-bold capitalize">{bet.type}</div>
                      <div>Horses: {bet.horses.join(', ')}</div>
                      <div>Stake: {bet.stake}pt</div>
                    </div>
                    <button
                      onClick={() => removeBet(idx)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="font-bold">Total Stake: {totalStake}pt</p>
              <p className="text-sm text-gray-400">
                Max: {Math.floor(bankroll * settings.maxBetPercentage)}pt
              </p>
            </div>
          </div>

          <button
            onClick={handleRunRace}
            disabled={currentBets.length === 0 || oddsLoading || totalStake > bankroll || isRacing}
            className="w-full mt-4 px-4 py-3 bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed font-bold"
            data-testid="start-race-btn"
          >
            {isRacing ? 'Racing...' : 'Start Race'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
