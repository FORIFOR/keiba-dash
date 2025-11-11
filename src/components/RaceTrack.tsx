import { type Horse, type RaceProgress, type RaceResult } from '../engine/race';
import './RaceTrack.css';

interface RaceTrackProps {
  horses: Horse[];
  progress: RaceProgress[];
  results: RaceResult[];
}

function RaceTrack({ horses, progress, results }: RaceTrackProps) {
  const getHorseProgress = (horseId: number): number => {
    const horseProgress = progress.find((p) => p.horseId === horseId);
    return horseProgress?.progress ?? 0;
  };

  const getHorsePosition = (horseId: number): number | null => {
    const result = results.find((r) => r.horseId === horseId);
    return result?.position ?? null;
  };

  return (
    <div className="race-track">
      <h2>Race Track</h2>
      <div className="track-container">
        {horses.map((horse) => {
          const horseProgress = getHorseProgress(horse.id);
          const position = getHorsePosition(horse.id);

          return (
            <div key={horse.id} className="track-lane">
              <div className="lane-info">
                <span className="horse-name">{horse.name}</span>
                {position && <span className="position-badge">#{position}</span>}
              </div>
              <div className="progress-track">
                <div
                  className="progress-bar"
                  style={{
                    width: `${horseProgress}%`,
                    backgroundColor: horse.color,
                  }}
                >
                  <span className="horse-icon">🐴</span>
                </div>
              </div>
              <div className="progress-text">{Math.round(horseProgress)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RaceTrack;
