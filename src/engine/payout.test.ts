import { describe, it, expect } from 'vitest';
import { calculateBetPayout, resolveRace, validateBet } from './payout';
import type { Bet, OddsTable } from './types';

describe('payout', () => {
  const mockOdds: OddsTable = {
    win: [5.0, 3.0, 2.0, 10.0],
    place: [2.5, 1.8, 1.5, 4.0],
    quinella: new Map([['1-2', 8.0], ['1-3', 6.0]]),
    trifecta: new Map([['1-2-3', 20.0]]),
  };

  describe('calculateBetPayout', () => {
    it('calculates win bet payout correctly', () => {
      const bet: Bet = { type: 'win', horses: [1], stake: 100 };
      const finishOrder = [1, 2, 3, 4];

      const payout = calculateBetPayout(bet, finishOrder, mockOdds);

      expect(payout.won).toBe(true);
      expect(payout.payout).toBe(500); // floor(100 * 5.0)
      expect(payout.odds).toBe(5.0);
    });

    it('returns zero for losing win bet', () => {
      const bet: Bet = { type: 'win', horses: [2], stake: 100 };
      const finishOrder = [1, 2, 3, 4];

      const payout = calculateBetPayout(bet, finishOrder, mockOdds);

      expect(payout.won).toBe(false);
      expect(payout.payout).toBe(0);
    });

    it('calculates place bet payout for top 3', () => {
      const bet: Bet = { type: 'place', horses: [3], stake: 100 };
      const finishOrder = [1, 2, 3, 4, 5, 6, 7, 8]; // 8 horses

      const payout = calculateBetPayout(bet, finishOrder, mockOdds);

      expect(payout.won).toBe(true);
      expect(payout.payout).toBe(150); // floor(100 * 1.5)
    });

    it('calculates quinella bet payout', () => {
      const bet: Bet = { type: 'quinella', horses: [1, 2], stake: 100 };
      const finishOrder = [2, 1, 3, 4];

      const payout = calculateBetPayout(bet, finishOrder, mockOdds);

      expect(payout.won).toBe(true);
      expect(payout.payout).toBe(800);
    });

    it('calculates trifecta bet payout', () => {
      const bet: Bet = { type: 'trifecta', horses: [1, 2, 3], stake: 100 };
      const finishOrder = [1, 2, 3, 4];

      const payout = calculateBetPayout(bet, finishOrder, mockOdds);

      expect(payout.won).toBe(true);
      expect(payout.payout).toBe(2000);
    });
  });

  describe('resolveRace', () => {
    it('resolves multiple bets correctly', () => {
      const bets: Bet[] = [
        { type: 'win', horses: [1], stake: 100 },
        { type: 'place', horses: [2], stake: 200 },
      ];
      const finishOrder = [1, 2, 3, 4];

      const result = resolveRace(bets, finishOrder, mockOdds);

      expect(result.totalStake).toBe(300);
      expect(result.totalPayout).toBe(860); // 500 + 360
      expect(result.netProfit).toBe(560);
    });
  });

  describe('validateBet', () => {
    it('accepts valid bet', () => {
      const bet: Bet = { type: 'win', horses: [1], stake: 100 };
      const validation = validateBet(bet, 1000, 0, 0.5, 100);

      expect(validation.valid).toBe(true);
    });

    it('rejects bet below minimum', () => {
      const bet: Bet = { type: 'win', horses: [1], stake: 50 };
      const validation = validateBet(bet, 1000, 0, 0.5, 100);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Minimum');
    });

    it('rejects bet exceeding bankroll', () => {
      const bet: Bet = { type: 'win', horses: [1], stake: 2000 };
      const validation = validateBet(bet, 1000, 0, 0.5, 100);

      expect(validation.valid).toBe(false);
    });

    it('rejects duplicate horses', () => {
      const bet: Bet = { type: 'quinella', horses: [1, 1], stake: 100 };
      const validation = validateBet(bet, 1000, 0, 0.5, 100);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('same horse');
    });
  });
});
