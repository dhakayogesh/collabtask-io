import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, restoreError, retrySession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user && !restoreError) navigate({ to: "/auth" });
  }, [user, loading, restoreError, navigate]);

  if (restoreError && !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl ring-1 ring-border bg-card/70 p-6 text-center shadow-elev">
          <div className="mx-auto mb-4 size-10 rounded-full bg-brand/10 ring-1 ring-brand/20" />
          <h1 className="text-xl font-semibold tracking-tight">Workspace is waking up</h1>
          <p className="mt-2 text-sm text-muted-foreground">{restoreError}</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={() => retrySession()}
              disabled={loading}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {loading ? "Retrying..." : "Retry"}
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: "/auth" })}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-brand animate-pulse-dot" />
          Loading workspace…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0 md:py-3 md:pr-3">
        <div className="md:rounded-xl md:ring-1 md:ring-border md:bg-card/40 md:shadow-elev min-h-[calc(100vh-1.5rem)] overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
