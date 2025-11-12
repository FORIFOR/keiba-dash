/**
 * Core types for the horse racing betting game
 */

export interface Horse {
  id: number;
  name: string;
  rating: number; // Strength rating (60-100)
  color: string;
}

export interface RaceConfig {
  numHorses: number; // 6-16
  temperature: number; // τ for Plackett-Luce (15-25)
  margin: number; // Bookmaker margin (e.g., 0.18)
  seed: string;
  difficulty: Difficulty;
}

export type Difficulty = 'easy' | 'standard' | 'hard';

export interface OddsTable {
  win: number[]; // Decimal odds for each horse
  place: number[]; // Decimal odds for place bets
  quinella: Map<string, number>; // Key: "i-j" (smaller id first), value: odds
  trifecta: Map<string, number>; // Key: "i-j-k" (order matters), value: odds
}

export type BetType = 'win' | 'place' | 'quinella' | 'trifecta';

export interface Bet {
  type: BetType;
  horses: number[]; // Horse IDs (1 for win/place, 2 for quinella, 3 for trifecta)
  stake: number; // Points wagered
}

export interface RaceResult {
  finishOrder: number[]; // Array of horse IDs in finish order (1st, 2nd, 3rd, ...)
  payouts: Payout[];
  totalStake: number;
  totalPayout: number;
  netProfit: number;
}

export interface Payout {
  bet: Bet;
  won: boolean;
  payout: number; // 0 if lost, stake * odds (floored) if won
  odds: number;
}

export interface GameState {
  bankroll: number;
  raceNumber: number;
  history: HistoryEntry[];
  settings: GameSettings;
}

export interface HistoryEntry {
  raceNumber: number;
  seed: string;
  horses: Horse[];
  bets: Bet[];
  result: RaceResult;
  bankrollBefore: number;
  bankrollAfter: number;
  roi: number; // (netProfit / totalStake) * 100
}

export interface GameSettings {
  difficulty: Difficulty;
  numHorses: number;
  showRatings: boolean;
  monteCarloTrials: number;
  maxBetPercentage: number; // Max % of bankroll per race (e.g., 0.5 = 50%)
  soundEnabled: boolean;
  animationEnabled: boolean;
}

export interface MonteCarloProgress {
  progress: number; // 0-100
  trials: number;
  totalTrials: number;
}

export interface MonteCarloResult {
  probabilities: number[];
  type: 'place' | 'quinella' | 'trifecta';
}

// Default settings by difficulty
export const DIFFICULTY_CONFIGS: Record<Difficulty, Partial<RaceConfig>> = {
  easy: {
    temperature: 25,
    margin: 0.15,
    numHorses: 8,
  },
  standard: {
    temperature: 20,
    margin: 0.18,
    numHorses: 16,
  },
  hard: {
    temperature: 15,
    margin: 0.22,
    numHorses: 16,
  },
};

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'standard',
  numHorses: 16,
  showRatings: false,
  monteCarloTrials: 50000,
  maxBetPercentage: 0.5,
  soundEnabled: false,
  animationEnabled: true,
};

export const INITIAL_BANKROLL = 10000;
export const MIN_BET = 100;
