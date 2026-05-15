import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { LayoutGrid, FolderKanban, CheckSquare, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/team", label: "Team", icon: Users },
] as const;

export function AppSidebar() {
  const { user, role, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="w-60 border-r border-border flex flex-col h-screen sticky top-0 bg-sidebar">
      <Link to="/dashboard" className="p-6 flex items-center gap-2">
        <div className="size-6 bg-primary rounded grid place-items-center">
          <div className="size-2 bg-background rounded-full" />
        </div>
        <span className="font-semibold tracking-tight">Aether</span>
      </Link>

      <nav className="flex-1 px-3 space-y-0.5">
        {items.map((it) => {
          const active = path === it.to || path.startsWith(it.to + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                active
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="size-8 rounded-full bg-secondary grid place-items-center text-xs font-semibold uppercase">
            {(user?.email ?? "U").slice(0, 1)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-medium truncate">{user?.email}</p>
            <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider">
              {role ?? "—"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={signOut}
            title="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
