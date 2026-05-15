import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { PriorityBadge, StatusPill } from "@/components/badges";
import { useAuth } from "@/lib/auth-context";
import { format, isPast } from "date-fns";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const tasks = useQuery({
    queryKey: ["tasks-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, assignee_id, project_id, projects(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const activity = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("id, message, created_at, profiles:user_id(name)")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const all = tasks.data ?? [];
  const total = all.length;
  const inProgress = all.filter((t) => t.status === "in_progress").length;
  const done = all.filter((t) => t.status === "done").length;
  const overdue = all.filter(
    (t) => t.due_date && t.status !== "done" && isPast(new Date(t.due_date)),
  ).length;
  const mine = all.filter((t) => t.assignee_id === user?.id && t.status !== "done").slice(0, 6);

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Good to see you back.</h1>
          <p className="text-sm text-muted-foreground">Here's what's moving across your workspace.</p>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total tasks" value={total} />
          <Stat label="In progress" value={inProgress} accent="text-foreground" />
          <Stat label="Overdue" value={overdue} accent="text-rose-600" hint="Needs attention" />
          <Stat label="Completed" value={done} accent="text-emerald-600" />
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight">My active tasks</h2>
              <span className="text-xs text-muted-foreground">{mine.length} open</span>
            </div>
            <div className="ring-1 ring-border rounded-xl bg-card overflow-hidden">
              {mine.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No tasks assigned to you yet.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Task</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Priority</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mine.map((t) => (
                      <tr key={t.id} className="hover:bg-secondary/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium">{t.title}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {(t as any).projects?.name ?? "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3"><PriorityBadge priority={t.priority as any} /></td>
                        <td className="px-4 py-3"><StatusPill status={t.status as any} /></td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                          {t.due_date ? format(new Date(t.due_date), "MMM d") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight">Activity</h2>
            <div className="ring-1 ring-border rounded-xl bg-card p-5 space-y-5 min-h-[200px]">
              {(activity.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
              {(activity.data ?? []).map((a: any) => (
                <div key={a.id} className="flex gap-3">
                  <div className="size-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{a.profiles?.name ?? "Someone"}</span>{" "}
                      <span className="text-muted-foreground">{a.message}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(a.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, accent, hint }: { label: string; value: number; accent?: string; hint?: string }) {
  return (
    <div className="p-5 bg-card ring-1 ring-border rounded-xl">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-semibold mt-2 ${accent ?? ""}`}>{value}</p>
      {hint ? <p className="text-[10px] text-muted-foreground mt-3">{hint}</p> : <div className="mt-3 h-1 bg-secondary rounded-full" />}
    </div>
  );
}
