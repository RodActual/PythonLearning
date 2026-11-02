import { useDocumentTitle, useFocusOnMount } from '../a11y/hooks';

/** Shown for a URL that matches no page, lesson, or unit (an old bookmark or a typo). */
const NotFound = ({ onGoHome }: { onGoHome: () => void }) => {
  useDocumentTitle('Page not found');
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  return (
    <div className="error-screen">
      <p className="error-icon" aria-hidden="true">🧭</p>
      <h2 ref={headingRef} tabIndex={-1}>Page not found</h2>
      <p className="muted">That link doesn't match a lesson or page in this course. Your progress is safe.</p>
      <button type="button" className="primary-button" onClick={onGoHome}>Go to your learning path</button>
    </div>
  );
};

export default NotFound;
