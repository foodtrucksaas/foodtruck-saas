import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // If Sentry is available, report the error
    if (
      typeof window !== 'undefined' &&
      (window as unknown as { Sentry?: { captureException: (e: Error, c?: unknown) => void } })
        .Sentry
    ) {
      (
        window as unknown as { Sentry: { captureException: (e: Error, c?: unknown) => void } }
      ).Sentry.captureException(error, {
        extra: { componentStack: errorInfo.componentStack },
      });
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Oups, quelque chose s'est mal passé
            </h1>

            <p className="text-gray-500 mb-6">
              Une erreur inattendue s'est produite. Nous nous excusons pour la gêne occasionnée.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center justify-center gap-2 px-5 py-2.5 min-h-[48px] bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-5 py-2.5 min-h-[48px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors active:scale-[0.98]"
              >
                <Home className="w-4 h-4" />
                Retour à l'accueil
              </button>
            </div>

            {/* Debug info in development */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-600">
                  Détails techniques (dev)
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs font-mono text-red-600 overflow-auto max-h-48">
                  <p className="font-semibold mb-1">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="whitespace-pre-wrap text-gray-500">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
