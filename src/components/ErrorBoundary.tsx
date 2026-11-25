import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let friendly = 'Something went wrong while loading IPO Insiders.';
    if (error?.message) {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed?.error && String(parsed.error).toLowerCase().includes('permission')) {
          friendly = 'You do not have permission to perform this action. Please sign in with an authorized account.';
        } else if (parsed?.error) {
          friendly = String(parsed.error);
        }
      } catch {
        friendly = error.message;
      }
    }
    return { hasError: true, message: friendly };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-[#EAEAEA] rounded-xl p-6 text-center space-y-4">
            <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 text-[#DC2626] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-[#111827]">Unable to display this view</h2>
              <p className="text-sm text-[#4B5563] leading-relaxed">{this.state.message}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#111827] hover:bg-[#1F2937] rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
