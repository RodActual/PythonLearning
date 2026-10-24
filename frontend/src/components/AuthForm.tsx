import { useState, type FormEvent } from 'react';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '../firebaseConfig';
import { useDocumentTitle } from '../a11y/hooks';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/invalid-email': 'That email address is not valid.',
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
  'auth/network-request-failed': 'Network error. Check your connection.',
};

// Single-user app: there is no sign-up. New accounts are also disabled in the Firebase console.
type Mode = 'login' | 'reset';

const COPY: Record<Mode, { title: string; subtitle: string; submit: string; doc: string }> = {
  login: { title: 'Welcome back', subtitle: 'Sign in to pick up where you left off', submit: 'Sign In', doc: 'Sign in' },
  reset: { title: 'Reset Password', subtitle: "Enter your email and we'll send you a reset link", submit: 'Send reset link', doc: 'Reset password' },
};

const AuthForm = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const copy = COPY[mode];
  useDocumentTitle(copy.doc);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      // App's onAuthStateChanged listener handles the signed-in state.
      if (mode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else {
        await sendPasswordResetEmail(auth, email);
        // Same message either way, so the form doesn't reveal which emails have accounts.
        setNotice('If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.');
      }
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : '';
      if (mode === 'reset' && code === 'auth/user-not-found') {
        setNotice('If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.');
      } else {
        setError(ERROR_MESSAGES[code] ?? (err instanceof Error ? err.message : 'Something went wrong.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>

        <div role="alert" className={error ? 'auth-error' : undefined}>{error}</div>
        <div role="status" className={notice ? 'auth-notice' : undefined}>{notice}</div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={error ? true : undefined}
              required
            />
          </div>

          {mode !== 'reset' && (
            <div className="input-group">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                aria-invalid={error ? true : undefined}
                required
              />
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Processing...' : copy.submit}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {mode === 'reset' && 'Remembered it? '}
            <button type="button" className="toggle-btn" onClick={() => switchMode(mode === 'login' ? 'reset' : 'login')}>
              {mode === 'login' ? 'Forgot your password?' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
