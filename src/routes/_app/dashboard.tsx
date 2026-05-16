import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/top-bar";
import { PriorityBadge, StatusPill } from "@/components/badges";
import { useAuth } from "@/lib/auth-context";
import { apiClient, type ApiResponse } from "@/lib/api-client";
import { format, differenceInDays } from "date-fns";
import { ArrowUpRight, AlertTriangle, CheckCircle2, Clock, Activity, Plus, FolderPlus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

type ApiTask = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  assignmentType: "UNASSIGNED" | "USER" | "TEAM";
  dueDate: string | null;
  assignedToId: string | null;
  project?: { id: string; name: string } | null;
  assignedTo?: { id: string; name: string | null; email: string } | null;
};

type DashboardData = {
  statistics: {
    total: number;
    completed: number;
    inProgress: number;
    backlog: number;
    overdue: number;
    assignedToMe: number;
    activeProjects: number;
    completionRate: number;
  };
  tasksByStatus: {
    TODO: number;
    IN_PROGRESS: number;
    DONE: number;
  };
  upcomingDeadlines: ApiTask[];
  assignedTasks: ApiTask[];
  recentActivity: {
    id: string;
    message: string;
    createdAt: string;
    actor?: { name: string | null; email: string } | null;
  }[];
};

const statusFromApi = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
} as const;

const priorityFromApi = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<DashboardData>>("/dashboard");
      return response.data.data;
    },
    refetchInterval: 10000,
    staleTime: 15000,
    placeholderData: (previous) => previous,
  });

  const stats = dashboard.data?.statistics;
  const tasksByStatus = dashboard.data?.tasksByStatus;
  const hasDashboardData = Boolean(dashboard.data && stats);
  const isInitialLoading = dashboard.isLoading && !dashboard.data;
  const total = stats?.total;
  const inProgress = stats?.inProgress ?? tasksByStatus?.IN_PROGRESS;
  const done = stats?.completed ?? tasksByStatus?.DONE;
  const todo = stats?.backlog ?? tasksByStatus?.TODO;
  const overdue = stats?.overdue;
  const completionRate = stats?.completionRate;
  const mine = dashboard.data?.assignedTasks ?? [];
  const upcoming = dashboard.data?.upcomingDeadlines ?? [];
  const activity = dashboard.data?.recentActivity ?? [];

  const workload = new Map<string, { name: string; count: number }>();
  [...mine, ...upcoming].filter((t) => t.status !== "DONE" && t.assignedToId).forEach((t) => {
    const k = t.assignedToId!;
    const cur = workload.get(k) ?? { name: t.assignedTo?.name ?? "Unknown", count: 0 };
    cur.count += 1;
    workload.set(k, cur);
  });
  const team = Array.from(workload.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxLoad = Math.max(1, ...team.map((t) => t.count));
  const displayName = user?.name?.trim();
  const greeting = authLoading ? "" : displayName ? `Welcome back, ${displayName} 👋` : "Welcome back 👋";

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
        <section className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {authLoading ? <span className="inline-block h-8 w-56 rounded bg-white/[0.06] animate-pulse" /> : greeting}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Here's what's moving across your workspace.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
            {isInitialLoading ? "Syncing workspace" : dashboard.isError ? "Sync failed" : `${stats?.activeProjects} active projects`}
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {isInitialLoading ? (
            Array.from({ length: 4 }).map((_, index) => <StatSkeleton key={index} />)
          ) : dashboard.isError ? (
            <div className="col-span-full ring-1 ring-border rounded-xl bg-card/60 p-6 text-sm text-destructive">
              Could not load dashboard stats. Please try again.
            </div>
          ) : hasDashboardData ? (
            <>
              <Stat label="Total tasks" value={total!} hint={`${todo} backlog`} icon={<Activity className="size-3.5" />} />
              <Stat label="In progress" value={inProgress!} hint="Active work" icon={<Clock className="size-3.5" />} accent="text-sky-300" />
              <Stat
                label="Overdue"
                value={overdue!}
                hint={overdue! > 0 ? "Needs attention" : "All clear"}
                icon={<AlertTriangle className="size-3.5" />}
                accent={overdue! > 0 ? "text-rose-300" : undefined}
              />
              <Stat
                label="Completed"
                value={done!}
                hint={`${completionRate}% completion`}
                icon={<CheckCircle2 className="size-3.5" />}
                accent="text-emerald-300"
              />
            </>
          ) : null}
        </section>

        {/* Sprint + Quick actions */}
        <section className="grid lg:grid-cols-3 gap-4">
          {isInitialLoading || !hasDashboardData ? (
            <SprintSkeleton />
          ) : (
            <SprintProgress done={done!} total={total!} inProgress={inProgress!} />
          )}
          <div className="lg:col-span-2 ring-1 ring-border rounded-xl bg-card/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold tracking-tight">Quick actions</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <QuickAction
                icon={<Plus className="size-4" />}
                label="New task"
                onClick={() => navigate({ to: "/tasks" })}
              />
              <QuickAction
                icon={<FolderPlus className="size-4" />}
                label="New project"
                onClick={() => navigate({ to: "/projects" })}
              />
              <QuickAction
                icon={<UserPlus className="size-4" />}
                label="Invite member"
                onClick={() => navigate({ to: "/team" })}
              />
              <QuickAction
                icon={<Activity className="size-4" />}
                label="View activity"
                onClick={() => document.getElementById("dashboard-activity")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              />
            </div>
            <div className="mt-5 pt-5 border-t border-border grid grid-cols-3 gap-4 text-center">
              {isInitialLoading || !hasDashboardData ? (
                <>
                  <MiniSkeleton />
                  <MiniSkeleton />
                  <MiniSkeleton />
                </>
              ) : (
                <>
                  <Mini label="Backlog" value={todo!} />
                  <Mini label="Active" value={inProgress!} accent="text-sky-300" />
                  <Mini label="Shipped" value={done!} accent="text-emerald-300" />
                </>
              )}
            </div>
          </div>
        </section>

        {/* My tasks + Activity */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight">My active tasks</h2>
              <span className="text-xs text-muted-foreground font-mono">
                {isInitialLoading ? "Loading" : `${mine.length} open`}
              </span>
            </div>
            <div className="ring-1 ring-border rounded-xl bg-card/60 overflow-hidden">
              {isInitialLoading ? (
                <TaskTableSkeleton />
              ) : mine.length === 0 ? (
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
                              {t.project?.name ?? "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3"><PriorityBadge priority={priorityFromApi[t.priority]} /></td>
                          <td className="px-4 py-3"><StatusPill status={statusFromApi[t.status]} /></td>
                          <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                            {t.dueDate ? format(new Date(t.dueDate), "MMM d") : "—"}
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
              {isInitialLoading ? (
                <WorkloadSkeleton />
              ) : team.length === 0 ? (
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
                {isInitialLoading ? (
                  <ListSkeleton rows={3} />
                ) : upcoming.length === 0 ? (
                  <EmptyState message="No upcoming deadlines." compact />
                ) : (
                  upcoming.map((t) => {
                    const days = differenceInDays(new Date(t.dueDate!), new Date());
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
                            {t.project?.name ?? "—"}
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
            <div id="dashboard-activity" className="space-y-3 scroll-mt-20">
              <h2 className="text-sm font-semibold tracking-tight">Activity</h2>
              <div className="ring-1 ring-border rounded-xl bg-card/60 p-5 space-y-4 min-h-[200px]">
                {isInitialLoading && <ActivitySkeleton />}
                {!isInitialLoading && activity.length === 0 && (
                  <EmptyState message="No activity yet." compact />
                )}
                {!isInitialLoading && activity.map((a) => (
                  <div key={a.id} className="flex gap-3">
                    <div className="size-1.5 rounded-full bg-brand mt-1.5 shrink-0 shadow-[0_0_6px_var(--brand)]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">
                        <span className="font-medium">{a.actor?.name ?? "Someone"}</span>{" "}
                        <span className="text-muted-foreground">{a.message}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        {format(new Date(a.createdAt), "MMM d, h:mm a")}
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

function StatSkeleton() {
  return (
    <div className="p-4 md:p-5 bg-card/60 ring-1 ring-border rounded-xl hairline animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-24 rounded bg-white/[0.06]" />
        <div className="size-4 rounded bg-white/[0.06]" />
      </div>
      <div className="h-8 w-16 rounded bg-white/[0.06]" />
      <div className="h-3 w-20 rounded bg-white/[0.06] mt-3" />
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

function MiniSkeleton() {
  return (
    <div className="grid place-items-center gap-2 animate-pulse">
      <div className="h-5 w-10 rounded bg-white/[0.06]" />
      <div className="h-3 w-14 rounded bg-white/[0.06]" />
    </div>
  );
}

function QuickAction({
  icon,
  label,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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

function SprintSkeleton() {
  return (
    <div className="ring-1 ring-border rounded-xl bg-card/60 p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-28 rounded bg-white/[0.06]" />
        <div className="h-3 w-10 rounded bg-white/[0.06]" />
      </div>
      <div className="flex items-center gap-5">
        <div className="size-28 rounded-full bg-white/[0.06] shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-3 w-full rounded bg-white/[0.06]" />
          <div className="h-3 w-5/6 rounded bg-white/[0.06]" />
          <div className="h-3 w-4/6 rounded bg-white/[0.06]" />
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

function TaskTableSkeleton() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="grid grid-cols-[1fr_72px_88px_56px] gap-3 items-center">
          <div className="space-y-2">
            <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
            <div className="h-3 w-32 rounded bg-white/[0.06]" />
          </div>
          <div className="h-5 rounded-full bg-white/[0.06]" />
          <div className="h-5 rounded-full bg-white/[0.06]" />
          <div className="h-3 rounded bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function WorkloadSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="size-7 rounded-full bg-white/[0.06] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 rounded bg-white/[0.06]" />
            <div className="h-1.5 w-full rounded-full bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-border animate-pulse">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-start gap-3 p-3.5">
          <div className="size-1.5 rounded-full mt-1.5 bg-white/[0.06] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
            <div className="h-3 w-1/2 rounded bg-white/[0.06]" />
          </div>
          <div className="h-5 w-12 rounded-full bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex gap-3">
          <div className="size-1.5 rounded-full bg-white/[0.06] mt-1.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-full rounded bg-white/[0.06]" />
            <div className="h-3 w-24 rounded bg-white/[0.06]" />
          </div>
        </div>
      ))}
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
