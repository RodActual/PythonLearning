import { BADGES } from '../game/badges';
import { useDocumentTitle, useFocusOnMount } from '../a11y/hooks';

interface TrophyCaseProps {
  earned: string[];
  onBack: () => void;
}

const TrophyCase = ({ earned, onBack }: TrophyCaseProps) => {
  useDocumentTitle('Trophies');
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const earnedSet = new Set(earned);

  return (
    <div className="trophy-case">
      <div className="top-controls">
        <button type="button" className="secondary-button" onClick={onBack}>
          <span aria-hidden="true">← </span>Back to map
        </button>
      </div>
      <h2 ref={headingRef} tabIndex={-1}>Trophy Case</h2>
      <p className="muted">You have earned {earned.length} of {BADGES.length} trophies.</p>
      <ul className="badge-grid">
        {BADGES.map((b) => {
          const has = earnedSet.has(b.id);
          return (
            <li key={b.id} className={`badge-card ${has ? 'earned' : 'locked'}`}>
              <span className="badge-icon" aria-hidden="true">{has ? b.icon : '🔒'}</span>
              <h3 className="badge-name">{b.name}</h3>
              <p className="badge-desc">{b.description}</p>
              <p className="badge-state">{has ? 'Earned' : 'Locked'}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default TrophyCase;
