import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Search, Bell, Menu, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

export function TopBar({ title, crumb }: { title: string; crumb?: string }) {
  const [open, setOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="h-14 border-b border-border flex items-center justify-between gap-2 px-4 md:px-8 bg-background sticky top-0 z-10">
      <div className="flex items-center gap-2 min-w-0">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9 md:hidden shrink-0">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 flex flex-col">
            <SheetHeader className="p-6 pb-2">
              <SheetTitle className="flex items-center gap-2 text-left">
                <div className="size-6 bg-primary rounded grid place-items-center">
                  <div className="size-2 bg-background rounded-full" />
                </div>
                Aether
              </SheetTitle>
            </SheetHeader>
            <nav className="flex-1 px-3 space-y-0.5 mt-2">
              {navItems.map((it) => {
                const active = path === it.to || path.startsWith(it.to + "/");
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={() => setOpen(false)}
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
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="text-sm pl-9 pr-4 py-1.5 rounded-md ring-1 ring-border bg-secondary/50 w-48 lg:w-64 focus:outline-none focus:ring-ring transition-shadow"
          />
        </div>
        <button className="size-9 grid place-items-center rounded-md hover:bg-secondary text-muted-foreground">
          <Search className="size-4 md:hidden" />
          <Bell className="size-4 hidden md:block" />
        </button>
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
