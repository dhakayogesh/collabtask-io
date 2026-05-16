import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { CheckCircle2, KanbanSquare, Users, ArrowRight, Zap, Shield } from "lucide-react";

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
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background grid + glows */}
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[800px] rounded-full bg-brand/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-40 size-[500px] rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <header className="relative z-10 flex items-center justify-between px-6 md:px-8 py-5 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-gradient-to-br from-brand to-emerald-700 grid place-items-center shadow-elev">
            <div className="size-2 bg-background rounded-[2px] rotate-45" />
          </div>
          <span className="font-semibold tracking-tight">WeTask</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/auth">
            <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90 shadow-elev">
              Get started
              <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 md:px-8 pt-16 md:pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full ring-1 ring-border bg-card/60 glass mb-6 text-xs font-mono">
          <CheckCircle2 className="size-3 text-brand" />
          <span className="text-muted-foreground">Built for focused team delivery</span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05] mb-6">
          The task manager<br />
          <span className="bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
            built for teams that ship.
          </span>
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
          Plan projects, assign work, and ship together — without the noise.
          Built for engineering teams that prefer clarity over clutter.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link to="/auth">
            <Button size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90 shadow-elev glow-brand">
              Start for free
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-24 text-left">
          <Feature
            icon={<KanbanSquare className="size-4" />}
            title="Kanban + table views"
            body="Switch between focused boards and dense tables without losing context."
          />
          <Feature
            icon={<Shield className="size-4" />}
            title="Roles that protect"
            body="Admin and member roles enforced server-side with row-level security."
          />
          <Feature
            icon={<Zap className="size-4" />}
            title="Real-time activity"
            body="Every status change and assignment is logged and synced instantly."
          />
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="group p-5 rounded-xl ring-1 ring-border bg-card/60 hover:ring-white/15 transition-all hover:-translate-y-0.5 hairline">
      <div className="size-9 rounded-md bg-white/[0.04] ring-1 ring-border grid place-items-center mb-4 group-hover:bg-brand/10 group-hover:ring-brand/30 group-hover:text-brand transition-all">
        {icon}
      </div>
      <h3 className="text-sm font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
