import { useState, useEffect, useRef } from 'react';
import {
  DEFAULT_HORSES,
  runRaceSimulation,
  simulateRaceProgress,
  type RaceResult,
  type PayoutInfo,
  type RaceProgress,
} from './engine/race';
import RaceTrack from './components/RaceTrack';
import PayoutTable from './components/PayoutTable';
import './App.css';

function App() {
  const [seed, setSeed] = useState('12345');
  const [isRacing, setIsRacing] = useState(false);
  const [raceComplete, setRaceComplete] = useState(false);
  const [progress, setProgress] = useState<RaceProgress[]>([]);
  const [results, setResults] = useState<RaceResult[]>([]);
  const [payouts, setPayouts] = useState<PayoutInfo[]>([]);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number>(0);

  const RACE_DURATION = 5000; // 5 seconds

  const startRace = () => {
    const numericSeed = parseInt(seed, 10);
    if (isNaN(numericSeed)) {
      alert('Please enter a valid numeric seed');
      return;
    }

    // Reset state
    setIsRacing(true);
    setRaceComplete(false);
    setProgress([]);
    startTimeRef.current = Date.now();

    // Pre-calculate final results
    const simulation = runRaceSimulation(numericSeed, DEFAULT_HORSES);
    setResults(simulation.results);
    setPayouts(simulation.payouts);

    // Start animation loop
    animateRace();
  };

  const animateRace = () => {
    const elapsed = Date.now() - startTimeRef.current;
    const numericSeed = parseInt(seed, 10);

    if (elapsed >= RACE_DURATION) {
      // Race finished
      const finalProgress = DEFAULT_HORSES.map((horse) => ({
        horseId: horse.id,
        progress: 100,
      }));
      setProgress(finalProgress);
      setIsRacing(false);
      setRaceComplete(true);
      return;
    }

    // Update progress
    const currentProgress = simulateRaceProgress(
      numericSeed,
      DEFAULT_HORSES,
      elapsed,
      RACE_DURATION
    );
    setProgress(currentProgress);

    // Continue animation
    animationRef.current = requestAnimationFrame(animateRace);
  };

  const resetRace = () => {
    setIsRacing(false);
    setRaceComplete(false);
    setProgress([]);
    setResults([]);
    setPayouts([]);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>Horse Racing Game</h1>
      </header>

      <main className="main">
        <div className="controls">
          <div className="seed-input">
            <label htmlFor="seed">Race Seed:</label>
            <input
              id="seed"
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              disabled={isRacing}
              placeholder="Enter a number"
            />
          </div>

          <div className="buttons">
            <button
              onClick={startRace}
              disabled={isRacing}
              className="btn-start"
              data-testid="start-race-btn"
            >
              {isRacing ? 'Racing...' : 'Start Race'}
            </button>

            {raceComplete && (
              <button onClick={resetRace} className="btn-reset">
                Reset
              </button>
            )}
          </div>
        </div>

        <RaceTrack horses={DEFAULT_HORSES} progress={progress} results={results} />

        {raceComplete && <PayoutTable horses={DEFAULT_HORSES} payouts={payouts} />}
      </main>
    </div>
  );
}

export default App;
