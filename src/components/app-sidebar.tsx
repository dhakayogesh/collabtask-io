import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { LogOut, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { navItems } from "./nav-items";

export function AppSidebar() {
  const { user, role, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col h-screen sticky top-0 p-3">
      <div className="flex flex-col flex-1 rounded-xl ring-1 ring-border bg-sidebar shadow-elev overflow-hidden">
        {/* Workspace switcher */}
        <button className="m-2 mb-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors group">
          <div className="size-7 rounded-md bg-gradient-to-br from-brand to-emerald-700 grid place-items-center shadow-elev">
            <div className="size-2 bg-background rounded-[2px] rotate-45" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-semibold tracking-tight truncate">WeTask</div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider truncate">
              {role === "admin" ? "Admin workspace" : "Workspace"}
            </div>
          </div>
          <ChevronsUpDown className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <div className="px-4 pt-3 pb-1.5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
            Workspace
          </p>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {navItems.map((it) => {
            const active = path === it.to || path.startsWith(it.to + "/");
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "relative flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-md transition-all",
                  active
                    ? "bg-white/[0.06] text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-brand shadow-[0_0_8px_var(--brand)]" />
                )}
                <Icon className={cn("size-4 shrink-0", active && "text-brand")} />
                {it.label}
              </Link>
            );
          })}
        </nav>

        {/* User profile card */}
        <div className="p-2 border-t border-border">
          <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
            <div className="relative">
              <div className="size-8 rounded-full bg-gradient-to-br from-brand/40 to-accent/40 grid place-items-center text-xs font-semibold uppercase ring-1 ring-white/10">
                {(user?.email ?? "U").slice(0, 1)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-sidebar" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-medium truncate">{user?.email}</p>
              <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider font-mono">
                {role ?? "—"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-white/5"
              onClick={signOut}
              title="Sign out"
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
