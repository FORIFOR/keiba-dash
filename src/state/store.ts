/**
 * Global state management using Zustand
 * Handles game state, bets, and persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  GameState,
  GameSettings,
  Horse,
  Bet,
  OddsTable,
  RaceConfig,
  HistoryEntry,
} from '../engine/types';
import {
  INITIAL_BANKROLL,
  DEFAULT_SETTINGS,
  DIFFICULTY_CONFIGS,
  MIN_BET,
} from '../engine/types';
import { generateHorses, simulateRace } from '../engine/race';
import { resolveRace, validateAllBets } from '../engine/payout';

interface GameStore extends GameState {
  // Current race state
  currentHorses: Horse[];
  currentBets: Bet[];
  currentOdds: OddsTable | null;
  oddsLoading: boolean;
  oddsProgress: number;
  raceInProgress: boolean;
  gameOver: boolean;

  // Actions
  startNewGame: () => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  generateNewRace: () => void;
  addBet: (bet: Bet) => void;
  removeBet: (index: number) => void;
  clearBets: () => void;
  setOdds: (odds: OddsTable) => void;
  setOddsLoading: (loading: boolean) => void;
  setOddsProgress: (progress: number) => void;
  runRace: () => HistoryEntry | undefined;
  getCurrentRaceConfig: () => RaceConfig;
  continueAfterGameOver: () => void;
  exportHistory: () => string;
}

const STORAGE_KEY = 'keiba-dash-game-state';
const STORAGE_VERSION = 2; // Increment when making breaking changes

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state
      bankroll: INITIAL_BANKROLL,
      raceNumber: 1,
      history: [],
      settings: DEFAULT_SETTINGS,
      currentHorses: [],
      currentBets: [],
      currentOdds: null,
      oddsLoading: false,
      oddsProgress: 0,
      raceInProgress: false,
      gameOver: false,

      // Helper to get current race config
      getCurrentRaceConfig: (): RaceConfig => {
        const state = get();
        const difficultyConfig = DIFFICULTY_CONFIGS[state.settings.difficulty];

        return {
          numHorses: state.settings.numHorses,
          temperature: difficultyConfig.temperature!,
          margin: difficultyConfig.margin!,
          seed: `race-${state.raceNumber}-${Date.now()}`,
          difficulty: state.settings.difficulty,
        };
      },

      // Start completely new game
      startNewGame: () => {
        const config = get().getCurrentRaceConfig();
        const horses = generateHorses(config);

        set({
          bankroll: INITIAL_BANKROLL,
          raceNumber: 1,
          history: [],
          currentHorses: horses,
          currentBets: [],
          currentOdds: null,
          oddsLoading: false,
          oddsProgress: 0,
          raceInProgress: false,
          gameOver: false,
        });
      },

      // Update settings
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      // Generate new race (next race number)
      generateNewRace: () => {
        const state = get();
        const config = state.getCurrentRaceConfig();
        const horses = generateHorses(config);

        set({
          currentHorses: horses,
          currentBets: [],
          currentOdds: null,
          oddsLoading: false,
          oddsProgress: 0,
          raceInProgress: false,
        });
      },

      // Add bet to current race
      addBet: (bet) => {
        set((state) => ({
          currentBets: [...state.currentBets, bet],
        }));
      },

      // Remove bet by index
      removeBet: (index) => {
        set((state) => ({
          currentBets: state.currentBets.filter((_, i) => i !== index),
        }));
      },

      // Clear all bets
      clearBets: () => {
        set({ currentBets: [] });
      },

      // Set calculated odds
      setOdds: (odds) => {
        set({
          currentOdds: odds,
          oddsLoading: false,
          oddsProgress: 100,
        });
      },

      // Set odds loading state
      setOddsLoading: (loading) => {
        set({ oddsLoading: loading });
      },

      // Update odds calculation progress
      setOddsProgress: (progress) => {
        set({ oddsProgress: progress });
      },

      // Run the race and process results
      runRace: () => {
        const state = get();

        // Validate bets (skip bankroll validation in unlimited mode)
        const validation = validateAllBets(
          state.currentBets,
          state.settings.gameMode === 'unlimited' ? Infinity : state.bankroll,
          state.settings.maxBetPercentage,
          MIN_BET
        );

        if (!validation.valid) {
          alert(`Cannot start race:\n${validation.errors.join('\n')}`);
          return;
        }

        if (!state.currentOdds) {
          alert('Odds not calculated yet. Please wait.');
          return;
        }

        set({ raceInProgress: true });

        // Simulate race
        const config = state.getCurrentRaceConfig();
        const finishOrder = simulateRace(state.currentHorses, config);

        // Calculate payouts
        const result = resolveRace(state.currentBets, finishOrder, state.currentOdds);

        // Update bankroll (unlimited mode keeps bankroll constant)
        const newBankroll = state.settings.gameMode === 'unlimited'
          ? state.bankroll
          : state.bankroll + result.netProfit;
        const roi = result.totalStake > 0 ? (result.netProfit / result.totalStake) * 100 : 0;

        // Add to history
        const historyEntry: HistoryEntry = {
          raceNumber: state.raceNumber,
          seed: config.seed,
          horses: state.currentHorses,
          bets: state.currentBets,
          result,
          bankrollBefore: state.bankroll,
          bankrollAfter: newBankroll,
          roi,
        };

        // Check game over (only in limited mode)
        const isGameOver = state.settings.gameMode === 'limited' && newBankroll <= 0;

        set({
          bankroll: state.settings.gameMode === 'limited' ? Math.max(0, newBankroll) : state.bankroll,
          raceNumber: state.raceNumber + 1,
          history: [...state.history, historyEntry],
          raceInProgress: false,
          gameOver: isGameOver,
        });

        // Store the result for display (will be handled by UI)
        return historyEntry;
      },

      // Continue after game over (reset bankroll)
      continueAfterGameOver: () => {
        set({
          bankroll: INITIAL_BANKROLL,
          gameOver: false,
        });
        get().generateNewRace();
      },

      // Export history as CSV
      exportHistory: () => {
        const history = get().history;
        const lines = [
          'Race,Seed,Bankroll Before,Total Stake,Total Payout,Net Profit,ROI%,Bankroll After',
        ];

        history.forEach((entry) => {
          lines.push(
            [
              entry.raceNumber,
              entry.seed,
              entry.bankrollBefore,
              entry.result.totalStake,
              entry.result.totalPayout,
              entry.result.netProfit,
              entry.roi.toFixed(2),
              entry.bankrollAfter,
            ].join(',')
          );
        });

        return lines.join('\n');
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      partialize: (state) => ({
        bankroll: state.bankroll,
        raceNumber: state.raceNumber,
        history: state.history,
        settings: state.settings,
      }),
      migrate: (persistedState: unknown, version: number) => {
        // If old version, reset to defaults
        if (version < STORAGE_VERSION) {
          console.log('[Store] Migrating from old version, resetting to defaults');
          return {
            bankroll: INITIAL_BANKROLL,
            raceNumber: 1,
            history: [],
            settings: DEFAULT_SETTINGS,
          };
        }
        return persistedState as Partial<GameState>;
      },
    }
  )
);
