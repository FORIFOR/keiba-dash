# Horse Racing Betting Game (競馬ベッティングゲーム)

A realistic horse racing betting simulation game built with React, TypeScript, and advanced probability algorithms.

## Features

- **4 Bet Types**: Win, Place, Quinella, and Trifecta
- **Realistic Odds**: Calculated using Plackett-Luce model with bookmaker margin
- **Monte Carlo Simulation**: 50,000+ trials for accurate probability estimation
- **Deterministic Races**: Seeded RNG ensures reproducible results
- **Point System**: Start with 10,000 points, manage your bankroll
- **Persistent State**: Game progress saved in localStorage
- **Web Workers**: Non-blocking odds calculation in background

## Quick Start

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`

## Bet Types Explained

### Win (単勝)
- Pick the horse that finishes 1st
- Higher odds, higher risk

### Place (複勝)
- Pick a horse that finishes in top 2-3
- 8+ horses: Top 3 / 7- horses: Top 2
- Lower odds, safer bet

### Quinella (馬連)
- Pick 2 horses that finish 1st-2nd in any order
- Medium-high odds

### Trifecta (三連単)
- Pick 3 horses that finish 1st-2nd-3rd in exact order
- Highest odds, most difficult

## Game Rules

- **Starting Bankroll**: 10,000 points
- **Minimum Bet**: 100 points
- **Maximum Bet**: 50% of bankroll per race
- **Payouts**: `floor(stake × decimal_odds)`
- **Game Over**: Bankroll = 0 (can continue)

## Development Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview build
npm run typecheck    # Type checking
npm run lint         # Run ESLint
npm run test:unit    # Run Vitest tests
npm run test:e2e     # Run Playwright tests
```

## Technical Details

### Plackett-Luce Model
```
P(horse i wins) = exp(rating_i / τ) / Σ exp(rating_j / τ)
```

### Deterministic RNG
- Mulberry32 algorithm
- Seeded for reproducibility

### Odds Calculation
1. Win: Analytical from model
2. Place/Quinella/Trifecta: Monte Carlo (50k trials)
3. Bookmaker margin applied
4. Decimal odds: `max(1.05, 1 / adjusted_prob)`

## License

MIT

**Disclaimer**: Educational simulation only. No real money involved.
