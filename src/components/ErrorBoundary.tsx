import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message ?? 'Something went wrong' };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[ErrorBoundary] caught:', error, info);
  }

  handleReset = () => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  handleReload = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen tf-bg flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="text-base font-semibold tf-text mb-1.5">Something went wrong</h2>
            <p className="text-xs tf-muted mb-1">
              The workspace hit an unexpected error. Try reloading first — if it keeps happening, reset your session data.
            </p>
            <p className="text-[11px] tf-muted mb-5 font-mono break-all">{this.state.message}</p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={this.handleReload} className="tf-btn tf-btn-outline">
                <RefreshCw className="h-4 w-4" />
                Reload
              </button>
              <button onClick={this.handleReset} className="tf-btn tf-btn-primary">
                Reset Session Data
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
