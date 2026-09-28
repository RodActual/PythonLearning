/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  /** Optional: enables Firebase App Check with reCAPTCHA v3. */
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
  /** Optional: enables Sentry error monitoring. */
  readonly VITE_SENTRY_DSN?: string;
}

/** Pyodide version, injected at build time so its files can be cached forever under a versioned path. */
declare const __PYODIDE_VERSION__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
