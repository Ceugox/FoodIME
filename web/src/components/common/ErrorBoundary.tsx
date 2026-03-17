'use client';
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
          <h2 className="text-xl font-serif text-text mb-2">Algo deu errado</h2>
          <p className="text-text-secondary text-sm mb-4">Tente recarregar a pagina.</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
