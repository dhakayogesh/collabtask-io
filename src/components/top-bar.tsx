import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Search, Bell, Menu, LogOut, Plus, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

export function TopBar({ title, crumb }: { title: string; crumb?: string }) {
  const [open, setOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const { user, role, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && /mac/i.test(navigator.platform));
  }, []);

  return (
    <header className="h-14 border-b border-border flex items-center justify-between gap-2 px-4 md:px-6 glass-strong sticky top-0 z-20">
      <div className="flex items-center gap-2 min-w-0">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9 md:hidden shrink-0">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 flex flex-col bg-sidebar border-border">
            <SheetHeader className="p-5 pb-2">
              <SheetTitle className="flex items-center gap-2 text-left">
                <div className="size-7 rounded-md bg-gradient-to-br from-brand to-emerald-700 grid place-items-center">
                  <div className="size-2 bg-background rounded-[2px] rotate-45" />
                </div>
                WeTask
              </SheetTitle>
            </SheetHeader>
            <nav className="flex-1 px-2 space-y-0.5 mt-2">
              {navItems.map((it) => {
                const active = path === it.to || path.startsWith(it.to + "/");
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={() => setOpen(false)}
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
            <div className="p-2 border-t border-border">
              <div className="flex items-center gap-3 p-2">
                <div className="size-8 rounded-full bg-gradient-to-br from-brand/40 to-accent/40 grid place-items-center text-xs font-semibold uppercase">
                  {(user?.email ?? "U").slice(0, 1)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-medium truncate">{user?.email}</p>
                  <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider font-mono">
                    {role ?? "—"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="size-8" onClick={signOut} title="Sign out">
                  <LogOut className="size-4" />
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-muted-foreground hidden sm:inline">{crumb ?? "Workspace"}</span>
          <span className="text-border hidden sm:inline">/</span>
          <span className="font-medium truncate">{title}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button className="hidden md:flex items-center gap-2 h-9 pl-2.5 pr-1.5 rounded-md ring-1 ring-border bg-secondary/40 hover:bg-secondary text-xs text-muted-foreground transition-colors w-56 lg:w-64">
          <Search className="size-3.5" />
          <span className="flex-1 text-left">Search or jump to…</span>
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-background/80 ring-1 ring-border">
            {isMac ? "⌘" : "Ctrl"}K
          </kbd>
        </button>
        <Button variant="ghost" size="icon" className="size-9 hidden sm:inline-flex text-muted-foreground hover:text-foreground" title="AI assistant">
          <Sparkles className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-foreground" title="Notifications">
          <Bell className="size-4" />
        </Button>
        <Button size="sm" className="h-9 hidden sm:inline-flex bg-brand text-brand-foreground hover:bg-brand/90 shadow-elev">
          <Plus className="size-3.5 mr-1" />New
        </Button>
        <Button size="icon" className="size-9 sm:hidden bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="size-4" />
        </Button>
      </div>
    </header>
  );
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, name, email");
      if (error) throw error;
      return data;
    },
  });
}
