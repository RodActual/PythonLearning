import type { GameSummary } from '../game/summary';
import { BADGES } from '../game/badges';

interface HudProps {
  summary: GameSummary;
  totalLessons: number;
  onOpenTrophies: () => void;
}

/** Player stats bar: level, XP toward next level, badges, lessons done. */
const Hud = ({ summary, totalLessons, onOpenTrophies }: HudProps) => {
  const { level, xp, badges, lessonsCompleted } = summary;
  return (
    <section className="hud" aria-label="Your stats">
      <div className="hud-level">
        <span className="level-badge" aria-hidden="true">{level.level}</span>
        <div className="hud-level-text">
          <span className="hud-title">Level {level.level}: {level.title}</span>
          <div className="xp-row">
            <div
              className="xp-bar"
              role="progressbar"
              aria-label={`Experience toward level ${level.level + 1}`}
              aria-valuemin={0}
              aria-valuemax={level.xpForNext}
              aria-valuenow={level.xpIntoLevel}
              aria-valuetext={`${level.xpIntoLevel} of ${level.xpForNext} XP`}
            >
              <div className="xp-bar-fill" style={{ width: `${level.percent}%` }} />
            </div>
            <span className="xp-text">{level.xpIntoLevel} / {level.xpForNext} XP</span>
          </div>
        </div>
      </div>

      <dl className="hud-stats">
        <div>
          <dt>Total XP</dt>
          <dd>{xp}</dd>
        </div>
        <div>
          <dt>Lessons</dt>
          <dd>{lessonsCompleted} / {totalLessons}</dd>
        </div>
      </dl>

      <button type="button" className="hud-trophies" onClick={onOpenTrophies}>
        <span aria-hidden="true">🏆 </span>
        Trophies {badges.length} / {BADGES.length}
      </button>
    </section>
  );
};

export default Hud;
