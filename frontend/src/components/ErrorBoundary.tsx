import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#0D0D0D] border border-[#991B1B] p-6 rounded-lg text-center space-y-4 my-4">
          <AlertTriangle className="w-8 h-8 text-[#EF4444] mx-auto" />
          <div>
            <h3 className="text-sm font-semibold text-white">
              {this.props.fallbackTitle || 'A rendering error occurred'}
            </h3>
            <p className="text-xs text-[#9CA3AF] mt-1 max-w-md mx-auto">
              {this.state.error?.message || 'An unexpected runtime issue occurred while displaying this section.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="inline-flex items-center space-x-1.5 bg-[#1F2937] hover:bg-[#374151] text-xs text-white px-3 py-1.5 rounded border border-[#4B5563] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
