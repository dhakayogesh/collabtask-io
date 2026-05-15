import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { Mail, Shield, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/team")({
  component: TeamPage,
});

function TeamPage() {
  const team = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, name, email, created_at");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const { data: tasks } = await supabase.from("tasks").select("assignee_id, status");
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      const loadMap = new Map<string, number>();
      (tasks ?? []).forEach((t: any) => {
        if (!t.assignee_id || t.status === "done") return;
        loadMap.set(t.assignee_id, (loadMap.get(t.assignee_id) ?? 0) + 1);
      });
      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleMap.get(p.id) ?? "member",
        load: loadMap.get(p.id) ?? 0,
      }));
    },
  });

  const members = team.data ?? [];
  const maxLoad = Math.max(1, ...members.map((m) => m.load));

  return (
    <>
      <TopBar title="Team" />
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Team</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {members.length} {members.length === 1 ? "member" : "members"} in your workspace.
            </p>
          </div>
          <Button size="sm" variant="outline">
            <UserCog className="size-3.5 mr-1.5" />Invite member
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m, idx) => {
            const isAdmin = m.role === "admin";
            const initial = (m.name || m.email || "?").slice(0, 1);
            // pseudo-random "online" status based on index for visual variety
            const online = idx % 3 !== 2;
            return (
              <div
                key={m.id}
                className="group p-5 ring-1 ring-border rounded-xl bg-card/60 hover:ring-white/15 transition-all hover:-translate-y-0.5 shadow-elev hairline"
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="size-12 rounded-full bg-gradient-to-br from-brand/40 to-accent/40 grid place-items-center text-base font-semibold uppercase ring-1 ring-white/10">
                      {initial}
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-card",
                        online ? "bg-emerald-400" : "bg-zinc-500",
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{m.name || m.email}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      <Mail className="size-3" />
                      {m.email}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 shrink-0",
                      isAdmin
                        ? "bg-brand/10 text-brand ring-brand/30"
                        : "bg-white/5 text-muted-foreground ring-white/10",
                    )}
                  >
                    {isAdmin && <Shield className="size-2.5" />}
                    {m.role}
                  </span>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      Workload
                    </span>
                    <span className="text-xs font-medium tabular-nums">{m.load} open</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        m.load === 0
                          ? "bg-zinc-600"
                          : m.load >= maxLoad * 0.7
                          ? "bg-gradient-to-r from-amber-400 to-rose-400"
                          : "bg-gradient-to-r from-brand to-emerald-400",
                      )}
                      style={{ width: `${Math.max(6, (m.load / maxLoad) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span className={cn("flex items-center gap-1.5", online && "text-emerald-300")}>
                    <span className={cn("size-1.5 rounded-full", online ? "bg-emerald-400" : "bg-zinc-500")} />
                    {online ? "Active now" : "Offline"}
                  </span>
                  <span>ID {m.id.slice(0, 6)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
