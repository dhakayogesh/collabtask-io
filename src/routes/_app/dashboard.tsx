import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { PriorityBadge, StatusPill } from "@/components/badges";
import { useAuth } from "@/lib/auth-context";
import { format, isPast, differenceInDays } from "date-fns";
import { ArrowUpRight, AlertTriangle, CheckCircle2, Clock, Activity, Plus, FolderPlus, UserPlus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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
        .select("id, title, status, priority, due_date, assignee_id, project_id, projects(name), profiles:assignee_id(name)")
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
  const todo = all.filter((t) => t.status === "todo").length;
  const overdue = all.filter(
    (t) => t.due_date && t.status !== "done" && isPast(new Date(t.due_date)),
  ).length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
  const mine = all.filter((t) => t.assignee_id === user?.id && t.status !== "done").slice(0, 6);
  const upcoming = all
    .filter((t) => t.due_date && t.status !== "done")
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  // workload per assignee
  const workload = new Map<string, { name: string; count: number }>();
  all.filter((t) => t.status !== "done" && t.assignee_id).forEach((t: any) => {
    const k = t.assignee_id;
    const cur = workload.get(k) ?? { name: t.profiles?.name ?? "Unknown", count: 0 };
    cur.count += 1;
    workload.set(k, cur);
  });
  const team = Array.from(workload.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxLoad = Math.max(1, ...team.map((t) => t.count));

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
        <section className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Good to see you back.
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Here's what's moving across your workspace.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
            All systems operational
          </div>
        </section>

        {/* Stats row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Stat label="Total tasks" value={total} hint={`${todo} backlog`} icon={<Activity className="size-3.5" />} />
          <Stat label="In progress" value={inProgress} hint="Active work" icon={<Clock className="size-3.5" />} accent="text-sky-300" />
          <Stat
            label="Overdue"
            value={overdue}
            hint={overdue > 0 ? "Needs attention" : "All clear"}
            icon={<AlertTriangle className="size-3.5" />}
            accent={overdue > 0 ? "text-rose-300" : undefined}
          />
          <Stat
            label="Completed"
            value={done}
            hint={`${completionRate}% completion`}
            icon={<CheckCircle2 className="size-3.5" />}
            accent="text-emerald-300"
          />
        </section>

        {/* Sprint + Quick actions */}
        <section className="grid lg:grid-cols-3 gap-4">
          <SprintProgress done={done} total={total} inProgress={inProgress} />
          <div className="lg:col-span-2 ring-1 ring-border rounded-xl bg-card/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold tracking-tight">Quick actions</h2>
              <Sparkles className="size-3.5 text-brand" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <QuickAction icon={<Plus className="size-4" />} label="New task" />
              <QuickAction icon={<FolderPlus className="size-4" />} label="New project" />
              <QuickAction icon={<UserPlus className="size-4" />} label="Invite member" />
              <QuickAction icon={<Sparkles className="size-4" />} label="AI summary" accent />
            </div>
            <div className="mt-5 pt-5 border-t border-border grid grid-cols-3 gap-4 text-center">
              <Mini label="Backlog" value={todo} />
              <Mini label="Active" value={inProgress} accent="text-sky-300" />
              <Mini label="Shipped" value={done} accent="text-emerald-300" />
            </div>
          </div>
        </section>

        {/* My tasks + Activity */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight">My active tasks</h2>
              <span className="text-xs text-muted-foreground font-mono">{mine.length} open</span>
            </div>
            <div className="ring-1 ring-border rounded-xl bg-card/60 overflow-hidden">
              {mine.length === 0 ? (
                <EmptyState message="No tasks assigned to you yet." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="border-b border-border bg-white/[0.02]">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Task</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Priority</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Status</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {mine.map((t) => (
                        <tr key={t.id} className="hover:bg-white/[0.03] transition-colors group">
                          <td className="px-4 py-3">
                            <div className="font-medium flex items-center gap-1.5">
                              {t.title}
                              <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
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
                </div>
              )}
            </div>

            {/* Team workload */}
            <div className="ring-1 ring-border rounded-xl bg-card/60 p-5 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold tracking-tight">Team workload</h2>
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Open tasks</span>
              </div>
              {team.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No active assignments.</p>
              ) : (
                <div className="space-y-3">
                  {team.map((m) => (
                    <div key={m.name} className="flex items-center gap-3">
                      <div className="size-7 rounded-full bg-gradient-to-br from-brand/30 to-accent/30 grid place-items-center text-[11px] font-semibold uppercase ring-1 ring-white/10 shrink-0">
                        {m.name.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{m.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{m.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand to-emerald-400 rounded-full transition-all"
                            style={{ width: `${(m.count / maxLoad) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Upcoming deadlines */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">Upcoming deadlines</h2>
              <div className="ring-1 ring-border rounded-xl bg-card/60 divide-y divide-border overflow-hidden">
                {upcoming.length === 0 ? (
                  <EmptyState message="No upcoming deadlines." compact />
                ) : (
                  upcoming.map((t: any) => {
                    const days = differenceInDays(new Date(t.due_date), new Date());
                    const urgent = days <= 1;
                    return (
                      <div key={t.id} className="flex items-start gap-3 p-3.5 hover:bg-white/[0.03] transition-colors">
                        <div className={cn(
                          "size-1.5 rounded-full mt-1.5 shrink-0",
                          urgent ? "bg-rose-400 animate-pulse-dot" : days <= 3 ? "bg-amber-400" : "bg-zinc-500",
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.title}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {t.projects?.name ?? "—"}
                          </p>
                        </div>
                        <span className={cn(
                          "text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 shrink-0",
                          urgent
                            ? "bg-rose-500/10 text-rose-300 ring-rose-500/30"
                            : "bg-white/5 text-muted-foreground ring-white/10",
                        )}>
                          {days < 0 ? `${-days}d late` : days === 0 ? "Today" : `${days}d`}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Activity */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">Activity</h2>
              <div className="ring-1 ring-border rounded-xl bg-card/60 p-5 space-y-4 min-h-[200px]">
                {(activity.data ?? []).length === 0 && (
                  <EmptyState message="No activity yet." compact />
                )}
                {(activity.data ?? []).map((a: any) => (
                  <div key={a.id} className="flex gap-3">
                    <div className="size-1.5 rounded-full bg-brand mt-1.5 shrink-0 shadow-[0_0_6px_var(--brand)]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">
                        <span className="font-medium">{a.profiles?.name ?? "Someone"}</span>{" "}
                        <span className="text-muted-foreground">{a.message}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        {format(new Date(a.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  icon?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="group p-4 md:p-5 bg-card/60 ring-1 ring-border rounded-xl hover:ring-white/15 transition-all hover:-translate-y-0.5 hairline">
      <div className="flex items-center justify-between text-muted-foreground mb-3">
        <p className="text-[10px] font-mono uppercase tracking-widest">{label}</p>
        <span className="opacity-60 group-hover:text-brand group-hover:opacity-100 transition-colors">{icon}</span>
      </div>
      <p className={cn("text-2xl md:text-[28px] font-semibold tracking-tight tabular-nums", accent)}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground mt-2 font-mono">{hint}</p>
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div>
      <div className={cn("text-lg font-semibold tabular-nums", accent)}>{value}</div>
      <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      className={cn(
        "flex flex-col items-start gap-2 p-3 rounded-lg ring-1 ring-border bg-white/[0.02] hover:bg-white/[0.05] hover:ring-white/15 transition-all text-left group",
        accent && "ring-brand/30 bg-brand/5 hover:bg-brand/10 hover:ring-brand/50",
      )}
    >
      <span className={cn("text-muted-foreground group-hover:text-foreground transition-colors", accent && "text-brand")}>
        {icon}
      </span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function SprintProgress({ done, total, inProgress }: { done: number; total: number; inProgress: number }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="ring-1 ring-border rounded-xl bg-card/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold tracking-tight">Sprint progress</h2>
        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Live</span>
      </div>
      <div className="flex items-center gap-5">
        <div className="relative size-28 shrink-0">
          <svg className="size-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} stroke="currentColor" strokeWidth="6" fill="none" className="text-white/[0.06]" />
            <circle
              cx="50"
              cy="50"
              r={r}
              stroke="var(--brand)"
              strokeWidth="6"
              fill="none"
              strokeDasharray={c}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-700"
              style={{ filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--brand) 60%, transparent))" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-2xl font-semibold tabular-nums">{Math.round(pct)}%</div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">done</div>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2.5 text-sm">
          <Row label="Completed" value={done} dot="bg-emerald-400" />
          <Row label="In progress" value={inProgress} dot="bg-sky-400" />
          <Row label="Pending" value={Math.max(0, total - done - inProgress)} dot="bg-zinc-500" />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("size-1.5 rounded-full", dot)} />
      <span className="text-muted-foreground flex-1">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function EmptyState({ message, compact }: { message: string; compact?: boolean }) {
  return (
    <div className={cn("text-center text-sm text-muted-foreground", compact ? "p-6" : "p-12")}>
      {message}
    </div>
  );
}
