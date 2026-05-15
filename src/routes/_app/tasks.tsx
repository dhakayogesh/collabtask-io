import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { PriorityBadge, StatusPill } from "@/components/badges";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const tasks = useQuery({
    queryKey: ["tasks-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, projects(name), profiles:assignee_id(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (tasks.data ?? []).filter((t: any) => {
    if (status !== "all" && t.status !== status) return false;
    if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <TopBar title="All tasks" />
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Tasks</h1>
            <p className="text-sm text-muted-foreground mt-1">Everything across your projects.</p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {filtered.length} {filtered.length === 1 ? "task" : "tasks"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ring-1 ring-border rounded-xl bg-card/60 overflow-hidden shadow-elev">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-border bg-white/[0.02]">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Task</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Project</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Assignee</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Priority</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((t: any) => (
                  <tr key={t.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 font-medium">{t.title}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.projects?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {t.profiles?.name ? (
                        <div className="flex items-center gap-2">
                          <div className="size-5 rounded-full bg-gradient-to-br from-brand/30 to-accent/30 grid place-items-center text-[10px] font-semibold uppercase ring-1 ring-white/10">
                            {t.profiles.name.slice(0, 1)}
                          </div>
                          <span className="text-xs">{t.profiles.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground font-mono">
                      {t.due_date ? format(new Date(t.due_date), "MMM d, yyyy") : "—"}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-sm text-muted-foreground">
                      No tasks match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
