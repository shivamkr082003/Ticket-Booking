import { Component, type ReactNode, type ErrorInfo } from "react";
import "./ErrorBoundary.css";

interface Props {
  children:  ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error:    Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="eb-wrap">
          <div className="eb-card">
            <div className="eb-icon">⚠️</div>
            <h2 className="eb-title">Something Went Wrong</h2>
            <p className="eb-sub">
              An unexpected error occurred. Please try again.
            </p>
            {this.state.error && (
              <p className="eb-detail">{this.state.error.message}</p>
            )}
            <div className="eb-actions">
              <button className="btn btn-primary" onClick={this.handleReset}>
                Try Again
              </button>
              <button className="btn btn-ghost" onClick={() => window.location.href = "/"}>
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}