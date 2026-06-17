import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log detailed error info to help identify the source
    console.error("ErrorBoundary caught:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("React error info:", errorInfo);
    toast.error("Something went wrong. Try refreshing the page.");
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-800">
              Something went wrong
            </h2>
            <p className="text-sm text-slate-600">
              An unexpected error occurred. Please refresh the page.
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}