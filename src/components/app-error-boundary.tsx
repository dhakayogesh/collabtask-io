import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background grid place-items-center px-4">
        <div className="w-full max-w-md rounded-xl ring-1 ring-border bg-card/70 p-6 text-center shadow-elev">
          <div className="mx-auto mb-4 size-10 rounded-full bg-destructive/10 ring-1 ring-destructive/20" />
          <h1 className="text-xl font-semibold tracking-tight">This page did not load</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We could not finish loading the workspace. This can happen during a temporary network issue.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              Try again
            </Button>
            <Button variant="outline" onClick={() => window.location.assign("/auth")}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
