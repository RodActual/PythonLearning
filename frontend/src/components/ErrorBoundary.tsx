import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../monitoring';

interface Props {
  children: ReactNode;
  /** Called when the learner chooses to go back; lets the parent reset its view. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

/** Shows a recoverable error screen instead of a blank page when rendering crashes. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, { componentStack: info.componentStack });
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-screen" role="alert">
        <p className="error-icon" aria-hidden="true">🛠️</p>
        <h2>Something went wrong</h2>
        <p>Your progress is saved. Go back to the map, or reload the page if the problem continues.</p>
        <div className="completion-actions">
          <button type="button" className="primary-button" onClick={this.reset}>Back to the map</button>
          <button type="button" className="secondary-button" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </div>
    );
  }
}
