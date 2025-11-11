/**
 * Payout calculation for all bet types
 * Determines winners and calculates payouts
 */

import type { Bet, OddsTable, Payout, RaceResult } from './types';
import { getQuinellaKey, getTrifectaKey } from './odds';

/**
 * Check if a win bet is a winner
 */
function checkWinBet(bet: Bet, finishOrder: number[]): boolean {
  return finishOrder[0] === bet.horses[0];
}

/**
 * Check if a place bet is a winner
 * Place: horse finishes in top N (3 for 8+ horses, 2 for 7- horses)
 */
function checkPlaceBet(bet: Bet, finishOrder: number[]): boolean {
  const placeThreshold = finishOrder.length >= 8 ? 3 : 2;
  return finishOrder.slice(0, placeThreshold).includes(bet.horses[0]);
}

/**
 * Check if a quinella bet is a winner
 * Quinella: selected 2 horses finish 1st-2nd in either order
 */
function checkQuinellaBet(bet: Bet, finishOrder: number[]): boolean {
  const first = finishOrder[0];
  const second = finishOrder[1];
  const [h1, h2] = bet.horses;

  return (
    (first === h1 && second === h2) ||
    (first === h2 && second === h1)
  );
}

/**
 * Check if a trifecta bet is a winner
 * Trifecta: selected 3 horses finish 1st-2nd-3rd in exact order
 */
function checkTrifectaBet(bet: Bet, finishOrder: number[]): boolean {
  return (
    finishOrder[0] === bet.horses[0] &&
    finishOrder[1] === bet.horses[1] &&
    finishOrder[2] === bet.horses[2]
  );
}

/**
 * Get odds for a bet from odds table
 */
function getOddsForBet(bet: Bet, oddsTable: OddsTable): number {
  switch (bet.type) {
    case 'win':
      return oddsTable.win[bet.horses[0] - 1];

    case 'place':
      return oddsTable.place[bet.horses[0] - 1];

    case 'quinella': {
      const key = getQuinellaKey(bet.horses[0], bet.horses[1]);
      return oddsTable.quinella.get(key) || 0;
    }

    case 'trifecta': {
      const key = getTrifectaKey(bet.horses[0], bet.horses[1], bet.horses[2]);
      return oddsTable.trifecta.get(key) || 0;
    }
  }
}

/**
 * Check if a bet is a winner based on finish order
 */
function isBetWinner(bet: Bet, finishOrder: number[]): boolean {
  switch (bet.type) {
    case 'win':
      return checkWinBet(bet, finishOrder);

    case 'place':
      return checkPlaceBet(bet, finishOrder);

    case 'quinella':
      return checkQuinellaBet(bet, finishOrder);

    case 'trifecta':
      return checkTrifectaBet(bet, finishOrder);
  }
}

/**
 * Calculate payout for a single bet
 */
export function calculateBetPayout(
  bet: Bet,
  finishOrder: number[],
  oddsTable: OddsTable
): Payout {
  const won = isBetWinner(bet, finishOrder);
  const odds = getOddsForBet(bet, oddsTable);
  const payout = won ? Math.floor(bet.stake * odds) : 0;

  return {
    bet,
    won,
    payout,
    odds,
  };
}

/**
 * Resolve all bets for a race and calculate total payout
 */
export function resolveRace(
  bets: Bet[],
  finishOrder: number[],
  oddsTable: OddsTable
): RaceResult {
  const payouts: Payout[] = [];
  let totalStake = 0;
  let totalPayout = 0;

  for (const bet of bets) {
    const payout = calculateBetPayout(bet, finishOrder, oddsTable);
    payouts.push(payout);
    totalStake += bet.stake;
    totalPayout += payout.payout;
  }

  const netProfit = totalPayout - totalStake;

  return {
    finishOrder,
    payouts,
    totalStake,
    totalPayout,
    netProfit,
  };
}

/**
 * Validate bet before placing
 */
export function validateBet(
  bet: Bet,
  bankroll: number,
  currentTotalStake: number,
  maxBetPercentage: number,
  minBet: number
): { valid: boolean; error?: string } {
  // Check minimum bet
  if (bet.stake < minBet) {
    return { valid: false, error: `Minimum bet is ${minBet} points` };
  }

  // Check if stake is valid number
  if (bet.stake <= 0 || !Number.isFinite(bet.stake)) {
    return { valid: false, error: 'Invalid bet amount' };
  }

  // Check if player has enough bankroll
  const totalAfterBet = currentTotalStake + bet.stake;
  if (totalAfterBet > bankroll) {
    return { valid: false, error: 'Insufficient bankroll' };
  }

  // Check maximum bet percentage
  const maxAllowed = bankroll * maxBetPercentage;
  if (totalAfterBet > maxAllowed) {
    return {
      valid: false,
      error: `Maximum bet per race is ${Math.round(maxBetPercentage * 100)}% of bankroll`,
    };
  }

  // Validate horse selections
  if (bet.horses.length === 0) {
    return { valid: false, error: 'No horses selected' };
  }

  // Check for duplicate horses
  const uniqueHorses = new Set(bet.horses);
  if (uniqueHorses.size !== bet.horses.length) {
    return { valid: false, error: 'Cannot select the same horse multiple times' };
  }

  // Validate correct number of horses for bet type
  switch (bet.type) {
    case 'win':
    case 'place':
      if (bet.horses.length !== 1) {
        return { valid: false, error: `${bet.type} bet requires 1 horse` };
      }
      break;

    case 'quinella':
      if (bet.horses.length !== 2) {
        return { valid: false, error: 'Quinella bet requires 2 horses' };
      }
      break;

    case 'trifecta':
      if (bet.horses.length !== 3) {
        return { valid: false, error: 'Trifecta bet requires 3 horses' };
      }
      break;
  }

  return { valid: true };
}

/**
 * Validate all bets before race starts
 */
export function validateAllBets(
  bets: Bet[],
  bankroll: number,
  maxBetPercentage: number,
  minBet: number
): { valid: boolean; errors: string[] } {
  if (bets.length === 0) {
    return { valid: false, errors: ['No bets placed'] };
  }

  const errors: string[] = [];
  let totalStake = 0;

  for (let i = 0; i < bets.length; i++) {
    const validation = validateBet(
      bets[i],
      bankroll,
      totalStake,
      maxBetPercentage,
      minBet
    );

    if (!validation.valid) {
      errors.push(`Bet ${i + 1}: ${validation.error}`);
    } else {
      totalStake += bets[i].stake;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
