import { useId } from 'react';
import type { CourseAbout as About } from '../types/lesson';

interface CourseAboutProps {
  about: About;
  /** Start expanded (e.g. before the learner has started). */
  defaultOpen?: boolean;
}

/** "What this course prepares you for": outcomes, where the skills lead, and next steps. */
const CourseAbout = ({ about, defaultOpen = false }: CourseAboutProps) => {
  const headingId = useId();
  return (
    <details className="course-about" open={defaultOpen}>
      <summary>
        <span aria-hidden="true">🧭 </span>What this course prepares you for
      </summary>
      <div className="course-about-body">
        <p className="course-tagline">{about.tagline}</p>

        <h3 className="about-heading">By the end you'll be able to</h3>
        <ul className="outcome-list">
          {about.outcomes.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>

        <h3 id={headingId} className="about-heading">Where these skills lead</h3>
        <ul className="path-grid" aria-labelledby={headingId}>
          {about.paths.map((p) => (
            <li key={p.title} className="path-card">
              <span className="path-icon" aria-hidden="true">{p.icon}</span>
              <div>
                <h4 className="path-title">{p.title}</h4>
                <p className="path-desc">{p.description}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="next-steps"><strong>Next steps: </strong>{about.next_steps}</p>
      </div>
    </details>
  );
};

export default CourseAbout;
