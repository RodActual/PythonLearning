import { useState, type FormEvent } from 'react';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '../firebaseConfig';
import { useDocumentTitle } from '../a11y/hooks';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/invalid-email': 'That email address is not valid.',
  'auth/email-already-in-use': 'This email is already registered.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
  'auth/network-request-failed': 'Network error. Check your connection.',
};

type Mode = 'login' | 'signup' | 'reset';

const COPY: Record<Mode, { title: string; subtitle: string; submit: string; doc: string }> = {
  login: { title: 'Welcome Back', subtitle: 'Sign in to continue learning', submit: 'Sign In', doc: 'Sign in' },
  signup: { title: 'Create Account', subtitle: 'Start your Python journey today', submit: 'Sign Up', doc: 'Create account' },
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
      else if (mode === 'signup') await createUserWithEmailAndPassword(auth, email, password);
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
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                aria-invalid={error ? true : undefined}
                aria-describedby={mode === 'signup' ? 'password-help' : undefined}
                minLength={mode === 'signup' ? 6 : undefined}
                required
              />
              {mode === 'signup' && <p id="password-help" className="input-help">At least 6 characters.</p>}
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Processing...' : copy.submit}
          </button>
        </form>

        <div className="auth-footer">
          {mode === 'login' && (
            <p>
              <button type="button" className="toggle-btn" onClick={() => switchMode('reset')}>
                Forgot your password?
              </button>
            </p>
          )}
          <p>
            {mode === 'signup' ? 'Already have an account? ' : mode === 'reset' ? 'Remembered it? ' : "Don't have an account? "}
            <button type="button" className="toggle-btn" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
