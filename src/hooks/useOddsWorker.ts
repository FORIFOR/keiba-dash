import { useEffect, useRef, useState } from 'react';
import type { Horse, RaceConfig, OddsTable } from '../engine/types';
import type { WorkerMessage } from '../engine/montecarlo.worker';

export function useOddsWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [odds, setOdds] = useState<OddsTable | null>(null);

  useEffect(() => {
    // Initialize worker
    workerRef.current = new Worker(
      new URL('../engine/montecarlo.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;

      if (message.type === 'progress') {
        setProgress(message.progress);
      } else if (message.type === 'result') {
        console.log('[Hook] Received odds result');
        const oddsTable: OddsTable = {
          win: message.winOdds,
          place: message.placeOdds,
          quinella: new Map(message.quinellaOdds),
          trifecta: new Map(message.trifectaOdds),
        };
        setOdds(oddsTable);
        setLoading(false);
        console.log('[Hook] Odds set, loading=false');
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const calculateOdds = (horses: Horse[], config: RaceConfig, numTrials: number) => {
    if (!workerRef.current) {
      console.error('[Hook] Worker not initialized');
      return;
    }

    console.log('[Hook] Starting odds calculation', { numHorses: horses.length, numTrials });
    setLoading(true);
    setProgress(0);
    setOdds(null);

    workerRef.current.postMessage({
      horses,
      config,
      numTrials,
    });
  };

  return { calculateOdds, loading, progress, odds };
}
