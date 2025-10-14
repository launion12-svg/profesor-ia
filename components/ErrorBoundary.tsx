
import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // FIX: Reverted state initialization to use a constructor. The class property syntax, while modern, might have caused an issue with the component's context in the build environment, leading to the error on `this.props`.
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen grid place-items-center bg-gray-900 text-gray-100">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Algo fue mal</h1>
            <p className="mb-4">Reiniciando interfaz…</p>
            <button onClick={() => location.replace(location.pathname + '?reboot=' + Date.now())} className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700">
              Reintentar
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
