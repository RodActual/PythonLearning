// Optional error monitoring. Set VITE_SENTRY_DSN to turn it on; without it this is a no-op
// and the Sentry SDK is never downloaded (it's loaded with a dynamic import).
type Sentry = typeof import('@sentry/react');

let sentry: Sentry | null = null;

export async function initMonitoring(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  try {
    sentry = await import('@sentry/react');
    sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      // Errors only; no performance tracing or session replay.
      tracesSampleRate: 0,
    });
  } catch (err) {
    console.warn('Monitoring failed to start:', err);
  }
}

/** Logs an error and, when monitoring is on, reports it with optional context. */
export function reportError(err: unknown, context?: Record<string, unknown>): void {
  console.error(err, context ?? '');
  sentry?.captureException(err, context ? { extra: context } : undefined);
}
