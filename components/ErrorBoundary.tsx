
import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true, error: _, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleCopyError = () => {
    if (this.state.error && this.state.errorInfo) {
      const errorDetails = `Error: ${this.state.error.toString()}\nComponent Stack: ${this.state.errorInfo.componentStack}`;
      navigator.clipboard.writeText(errorDetails).then(() => {
        alert("Error details copied to clipboard!");
      }).catch(err => {
        console.error("Failed to copy error details: ", err);
      });
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2 className="font-bold">Algo deu errado.</h2>
          <details className="mt-2 whitespace-pre-wrap">
            <summary>Detalhes do Erro</summary>
            {this.state.error && <p><strong>Error:</strong> {this.state.error.toString()}</p>}
            {this.state.errorInfo && <p><strong>Stack Trace:</strong> {this.state.errorInfo.componentStack}</p>}
          </details>
          <button 
            onClick={this.handleCopyError}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Copiar Detalhes do Erro
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
