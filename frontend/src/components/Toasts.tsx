export interface Toast {
  id: number;
  icon: string;
  title: string;
  detail?: string;
  tone: 'xp' | 'level' | 'badge';
}

interface ToastsProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

/**
 * Reward notifications. The region is always in the DOM so screen readers
 * announce new toasts politely. Everything shown here is also visible in the
 * HUD or trophy case, so auto-dismissal doesn't hide information.
 */
const Toasts = ({ toasts, onDismiss }: ToastsProps) => (
  <div className="toast-region" role="status" aria-live="polite" aria-atomic="false">
    {toasts.map((t) => (
      <div key={t.id} className={`toast toast-${t.tone}`}>
        <span className="toast-icon" aria-hidden="true">{t.icon}</span>
        <div className="toast-text">
          <strong>{t.title}</strong>
          {t.detail && <span>{t.detail}</span>}
        </div>
        <button type="button" className="toast-close" onClick={() => onDismiss(t.id)} aria-label={`Dismiss: ${t.title}`}>
          ×
        </button>
      </div>
    ))}
  </div>
);

export default Toasts;
