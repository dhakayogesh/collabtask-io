import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { CheckCircle2, KanbanSquare, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="size-6 bg-primary rounded grid place-items-center">
            <div className="size-2 bg-background rounded-full" />
          </div>
          <span className="font-semibold tracking-tight">Aether</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/auth"><Button size="sm">Get started</Button></Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 pt-24 pb-16 text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6">
          Team Task Manager
        </p>
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] mb-6">
          A calm workspace for<br/>moving projects forward.
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
          Plan projects, assign work, and ship together — without the noise.
          Built for teams that prefer clarity over clutter.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/auth"><Button size="lg">Start for free</Button></Link>
          <Link to="/auth"><Button size="lg" variant="outline">Sign in</Button></Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 text-left">
          <Feature icon={<KanbanSquare className="size-4" />} title="Kanban + table views"
            body="Switch between focused board and dense table without losing context." />
          <Feature icon={<Users className="size-4" />} title="Roles that protect"
            body="Admin and member roles with strict server-side rules." />
          <Feature icon={<CheckCircle2 className="size-4" />} title="Activity you can trust"
            body="Every status change and assignment is logged in real time." />
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="p-5 rounded-xl ring-1 ring-border bg-card">
      <div className="size-8 rounded-md bg-secondary grid place-items-center mb-4">{icon}</div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
