import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppSidebar } from "@/components/app-sidebar";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

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
