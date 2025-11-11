import { type Horse, type PayoutInfo } from '../engine/race';
import './PayoutTable.css';

interface PayoutTableProps {
  horses: Horse[];
  payouts: PayoutInfo[];
}

function PayoutTable({ horses, payouts }: PayoutTableProps) {
  // Sort payouts by position
  const sortedPayouts = [...payouts].sort((a, b) => a.position - b.position);

  const getHorse = (horseId: number): Horse | undefined => {
    return horses.find((h) => h.id === horseId);
  };

  const getPositionLabel = (position: number): string => {
    switch (position) {
      case 1:
        return '1st';
      case 2:
        return '2nd';
      case 3:
        return '3rd';
      default:
        return `${position}th`;
    }
  };

  return (
    <div className="payout-table" data-testid="payout-table">
      <h2>Race Results & Payouts</h2>
      <table>
        <thead>
          <tr>
            <th>Position</th>
            <th>Horse</th>
            <th>Odds</th>
            <th>Payout (per $100)</th>
          </tr>
        </thead>
        <tbody>
          {sortedPayouts.map((payout) => {
            const horse = getHorse(payout.horseId);
            const isWinner = payout.position <= 3;

            return (
              <tr key={payout.horseId} className={isWinner ? 'winner' : ''}>
                <td className="position">{getPositionLabel(payout.position)}</td>
                <td className="horse-info">
                  <span
                    className="color-dot"
                    style={{ backgroundColor: horse?.color }}
                  ></span>
                  {horse?.name}
                </td>
                <td className="odds">{payout.odds > 0 ? `${payout.odds}x` : '-'}</td>
                <td className="payout">
                  {payout.payout > 0 ? `$${payout.payout.toFixed(2)}` : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PayoutTable;
