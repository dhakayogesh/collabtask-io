import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { PriorityBadge, StatusPill } from "@/components/badges";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Everything across your projects.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search tasks..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />
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

        <div className="ring-1 ring-border rounded-xl bg-card overflow-hidden">
         <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Task</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Project</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Assignee</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Priority</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t: any) => (
                <tr key={t.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium">{t.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.projects?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.profiles?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {t.due_date ? format(new Date(t.due_date), "MMM d, yyyy") : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No tasks match your filters.
                </td></tr>
              )}
            </tbody>
          </table>
         </div>
        </div>
      </div>
    </>
  );
}
