import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render errors so the window is not left blank after splash. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Planner UI error", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 p-8 text-zinc-100">
          <h1 className="text-lg font-semibold text-rose-300">
            Something went wrong loading the planner
          </h1>
          <pre className="max-w-2xl overflow-auto rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-xs text-zinc-300">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
