import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { TopBar } from "@/components/top-bar";
import { PriorityBadge } from "@/components/badges";
import { apiClient, getApiErrorMessage, type ApiResponse } from "@/lib/api-client";
import { useTeamMembers } from "@/lib/team-members";
import { TaskDetailDrawer } from "@/components/task-detail-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/tasks")({
  component: TasksPage,
});

type ApiTask = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  assignmentType: "UNASSIGNED" | "USER" | "TEAM";
  dueDate: string | null;
  project?: { id: string; name: string } | null;
  assignedTo?: { id: string; name: string | null; email: string } | null;
};

type ProjectSummary = {
  id: string;
  name: string;
};

const statusToApi = {
  todo: "TODO",
  in_progress: "IN_PROGRESS",
  done: "DONE",
} as const;

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

const priorityToApi = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
} as const;

function TasksPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [assignee, setAssignee] = useState<string>("all");
  const [projectId, setProjectId] = useState<string>("all");
  const [due, setDue] = useState<string>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(q);
  const qc = useQueryClient();
  const teamMembers = useTeamMembers();
  const projects = useQuery({
    queryKey: ["projects", "task-filters"],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ projects: ProjectSummary[] }>>("/projects");
      return response.data.data.projects;
    },
    staleTime: 30000,
    placeholderData: (previous) => previous,
  });

  const tasks = useQuery({
    queryKey: ["tasks-page", deferredSearch, status, priority, assignee, projectId, due],
    queryFn: async () => {
      const assigneeParams =
        assignee === "team"
          ? { assignmentType: "TEAM" }
          : assignee === "unassigned"
            ? { assignmentType: "UNASSIGNED" }
            : assignee.startsWith("user:")
              ? { assignedToId: assignee.slice(5) }
              : {};

      const response = await apiClient.get<ApiResponse<{ tasks: ApiTask[] }>>("/tasks", {
        params: {
          search: deferredSearch.trim() || undefined,
          status: status === "all" ? undefined : statusToApi[status as keyof typeof statusToApi],
          priority: priority === "all" ? undefined : priorityToApi[priority as keyof typeof priorityToApi],
          projectId: projectId === "all" ? undefined : projectId,
          due: due === "all" ? undefined : due,
          ...assigneeParams,
        },
      });
      return response.data.data.tasks;
    },
    refetchInterval: 10000,
    staleTime: 15000,
    placeholderData: (previous) => previous,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: keyof typeof statusToApi }) => {
      const response = await apiClient.patch<ApiResponse<{ task: ApiTask }>>(`/tasks/${id}/status`, {
        status: statusToApi[nextStatus],
      });
      return response.data.data.task;
    },
    onMutate: async ({ id, nextStatus }) => {
      await qc.cancelQueries({ queryKey: ["tasks-page"] });
      const snapshots = qc.getQueriesData<ApiTask[]>({ queryKey: ["tasks-page"] });
      snapshots.forEach(([key, data]) => {
        if (!data) return;
        qc.setQueryData<ApiTask[]>(
          key,
          data.map((task) => (task.id === id ? { ...task, status: statusToApi[nextStatus] } : task)),
        );
      });
      return { snapshots };
    },
    onError: (e, _variables, context) => {
      context?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(getApiErrorMessage(e));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks-page"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const filtered = tasks.data ?? [];
  const isInitialLoading = tasks.isLoading && !tasks.data;
  const hasActiveFilters =
    q.trim() !== "" || status !== "all" || priority !== "all" || assignee !== "all" || projectId !== "all" || due !== "all";

  const clearFilters = () => {
    setQ("");
    setStatus("all");
    setPriority("all");
    setAssignee("all");
    setProjectId("all");
    setDue("all");
  };

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
            {isInitialLoading ? "Loading tasks" : `${filtered.length} ${filtered.length === 1 ? "task" : "tasks"}`}
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(5,minmax(140px,180px))_auto]">
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger><SelectValue placeholder="Assignee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              <SelectItem value="unassigned">Not assigned</SelectItem>
              <SelectItem value="team">Whole team</SelectItem>
              {(teamMembers.data ?? []).map((member) => (
                <SelectItem key={member.id} value={`user:${member.id}`}>
                  {member.name || member.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {(projects.data ?? []).map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={due} onValueChange={setDue}>
            <SelectTrigger><SelectValue placeholder="Due date" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any due date</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="today">Due today</SelectItem>
              <SelectItem value="week">Due this week</SelectItem>
              <SelectItem value="no_due">No due date</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="h-10 px-3"
            disabled={!hasActiveFilters}
            onClick={clearFilters}
          >
            <X className="size-3.5 mr-1.5" />
            Clear
          </Button>
        </div>

        <div className="ring-1 ring-border rounded-xl bg-card/60 overflow-hidden shadow-elev">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
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
                {isInitialLoading ? (
                  Array.from({ length: 6 }).map((_, index) => <TaskRowSkeleton key={index} />)
                ) : tasks.isError ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-sm text-destructive">
                      Could not load tasks. Please try again.
                    </td>
                  </tr>
                ) : filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                    onClick={() => setSelectedTaskId(t.id)}
                  >
                    <td className="px-4 py-3 font-medium">{t.title}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.project?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {t.assignmentType === "TEAM" ? (
                        <div className="flex items-center gap-2">
                          <div className="size-5 rounded-full bg-gradient-to-br from-sky-400/30 to-emerald-400/30 grid place-items-center text-[10px] font-semibold uppercase ring-1 ring-white/10">
                            T
                          </div>
                          <span className="text-xs">Whole team</span>
                        </div>
                      ) : t.assignedTo?.name ? (
                        <div className="flex items-center gap-2">
                          <div className="size-5 rounded-full bg-gradient-to-br from-brand/30 to-accent/30 grid place-items-center text-[10px] font-semibold uppercase ring-1 ring-white/10">
                            {t.assignedTo.name.slice(0, 1)}
                          </div>
                          <span className="text-xs">{t.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={priorityFromApi[t.priority]} /></td>
                    <td className="px-4 py-3">
                      <Select
                        value={statusFromApi[t.status]}
                        disabled={updateStatus.isPending}
                        onValueChange={(nextStatus) =>
                          updateStatus.mutate({ id: t.id, nextStatus: nextStatus as keyof typeof statusToApi })
                        }
                      >
                        <SelectTrigger
                          className="h-8 w-32 bg-white/[0.03]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">Todo</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground font-mono">
                      {t.dueDate ? format(new Date(t.dueDate), "MMM d, yyyy") : "—"}
                    </td>
                  </tr>
                ))}
                {!isInitialLoading && !tasks.isError && filtered.length === 0 && (
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
      <TaskDetailDrawer
        taskId={selectedTaskId}
        open={Boolean(selectedTaskId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedTaskId(null);
        }}
      />
    </>
  );
}

function TaskRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="h-4 w-44 rounded bg-white/[0.06]" /></td>
      <td className="px-4 py-3"><div className="h-3 w-28 rounded bg-white/[0.06]" /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded-full bg-white/[0.06]" />
          <div className="h-3 w-20 rounded bg-white/[0.06]" />
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-white/[0.06]" /></td>
      <td className="px-4 py-3"><div className="h-8 w-32 rounded bg-white/[0.06]" /></td>
      <td className="px-4 py-3 text-right"><div className="h-3 w-20 ml-auto rounded bg-white/[0.06]" /></td>
    </tr>
  );
}
