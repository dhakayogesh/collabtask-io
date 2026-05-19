import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { TopBar, useProfiles } from "@/components/top-bar";
import { PriorityBadge } from "@/components/badges";
import { useAuth } from "@/lib/auth-context";
import { apiClient, getApiErrorMessage, type ApiResponse } from "@/lib/api-client";
import { useTeamMembers, type TeamMember } from "@/lib/team-members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, ChevronLeft, Clock, ListTodo, Plus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/projects/$projectId")({
  component: ProjectDetail,
});

const COLS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
] as const;

type ApiProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  createdAt?: string;
  tasks: ApiTask[];
  members: ApiMember[];
  _count?: { tasks: number; members: number };
};

type ApiTask = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  assignmentType: "UNASSIGNED" | "USER" | "TEAM";
  dueDate: string | null;
  assignedToId: string | null;
  assignedTo?: { name: string | null; email: string } | null;
};

type ApiMember = {
  userId: string;
  user: { id: string; name: string | null; email: string };
};

type UiTask = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  assignment_type: "UNASSIGNED" | "USER" | "TEAM";
  assignee_id: string | null;
  profiles?: { name: string | null; email?: string } | null;
};

type UiMember = {
  user_id: string;
  profiles?: { name: string | null; email: string } | null;
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

const priorityToApi = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
} as const;

const priorityFromApi = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

function mapTask(task: ApiTask): UiTask {
  return {
    id: task.id,
    title: task.title,
    status: statusFromApi[task.status],
    priority: priorityFromApi[task.priority],
    due_date: task.dueDate,
    assignment_type: task.assignmentType,
    assignee_id: task.assignedToId,
    profiles: task.assignedTo ? { name: task.assignedTo.name, email: task.assignedTo.email } : null,
  };
}

function mapMember(member: ApiMember): UiMember {
  return {
    user_id: member.userId,
    profiles: { name: member.user.name, email: member.user.email },
  };
}

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const qc = useQueryClient();
  const teamMembers = useTeamMembers();
  const cachedProject = qc
    .getQueryData<Array<{ id: string; name: string; description: string | null }>>(["projects"])
    ?.find((p) => p.id === projectId);

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ project: ApiProjectDetail }>>(`/projects/${projectId}`);
      return response.data.data.project;
    },
    staleTime: 30000,
    placeholderData: (previous) => previous,
  });

  const tasks = project.data?.tasks.map(mapTask) ?? [];
  const members = project.data?.members.map(mapMember) ?? [];
  const isLoading = project.isLoading && !project.data;
  const isError = project.isError;
  const isSuccess = project.isSuccess && Boolean(project.data);
  const isEmpty = isSuccess && tasks.length === 0;
  const title = project.data?.name ?? cachedProject?.name;
  const description = project.data?.description ?? cachedProject?.description;
  const todoCount = tasks.filter((task) => task.status === "todo").length;
  const inProgressCount = tasks.filter((task) => task.status === "in_progress").length;
  const doneCount = tasks.filter((task) => task.status === "done").length;

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: keyof typeof statusToApi }) => {
      await apiClient.patch<ApiResponse<{ task: ApiTask }>>(`/tasks/${id}/status`, {
        status: statusToApi[status],
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["tasks-page"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <>
      <TopBar title={title ?? "Project"} crumb="Projects" />
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
          <div>
            <Link to="/projects" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-2">
              <ChevronLeft className="size-3 mr-1" />Back to projects
            </Link>
            {isLoading && !title ? (
              <ProjectHeaderSkeleton />
            ) : (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">{title ?? "Project"}</h1>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description || "—"}</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && <AddMemberDialog projectId={projectId} existing={members.map((m) => m.user_id)} />}
            {isAdmin && (
              <NewTaskDialog
                projectId={projectId}
                members={teamMembers.data ?? []}
                membersLoading={teamMembers.isLoading && !teamMembers.data}
              />
            )}
          </div>
        </div>

        {isError ? (
          <ProjectErrorState onRetry={() => project.refetch()} />
        ) : (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => <ProjectStatSkeleton key={index} />)
              ) : (
                <>
                  <ProjectStat label="Total tasks" value={tasks.length} icon={<ListTodo className="size-3.5" />} />
                  <ProjectStat label="In progress" value={inProgressCount} icon={<Clock className="size-3.5" />} accent="text-sky-300" />
                  <ProjectStat label="Completed" value={doneCount} icon={<CheckCircle2 className="size-3.5" />} accent="text-emerald-300" />
                  <ProjectStat label="Members" value={members.length} icon={<Users className="size-3.5" />} />
                </>
              )}
            </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLS.map((c) => {
            const items = tasks.filter((t) => t.status === c.key);
            const accent = c.key === "done" ? "bg-emerald-400" : c.key === "in_progress" ? "bg-sky-400" : "bg-zinc-500";
            return (
              <div key={c.key} className="space-y-3 rounded-xl ring-1 ring-border bg-card/40 p-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`size-1.5 rounded-full ${accent}`} />
                    <span className="text-[11px] font-semibold text-foreground uppercase tracking-widest">{c.label}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] ring-1 ring-border">
                    {isLoading ? <span className="inline-block h-3 w-4 rounded bg-white/[0.08] animate-pulse" /> : items.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[120px]">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, index) => <TaskCardSkeleton key={index} />)
                  ) : (
                  items.map((t: any) => (
                    <div
                      key={t.id}
                      className="group p-3.5 bg-card ring-1 ring-border rounded-lg space-y-3 hover:ring-white/15 hover:-translate-y-0.5 transition-all shadow-elev hairline cursor-pointer"
                    >
                      <div className="text-sm font-medium leading-snug">{t.title}</div>
                      <div className="flex items-center justify-between">
                        <PriorityBadge priority={t.priority} />
                        {t.due_date && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {format(new Date(t.due_date), "MMM d")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                          {t.assignment_type === "TEAM" ? (
                            <>
                              <div className="size-4 rounded-full bg-gradient-to-br from-sky-400/40 to-emerald-400/40 grid place-items-center text-[9px] font-semibold uppercase ring-1 ring-white/10">
                                T
                              </div>
                              <span className="truncate">Whole team</span>
                            </>
                          ) : t.profiles?.name ? (
                            <>
                              <div className="size-4 rounded-full bg-gradient-to-br from-brand/40 to-accent/40 grid place-items-center text-[9px] font-semibold uppercase ring-1 ring-white/10">
                                {t.profiles.name.slice(0, 1)}
                              </div>
                              <span className="truncate">{t.profiles.name}</span>
                            </>
                          ) : (
                            <span>Not assigned</span>
                          )}
                        </div>
                        {(isAdmin || t.assignee_id === user?.id) && (
                          <Select
                            value={t.status}
                            onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v })}
                          >
                            <SelectTrigger className="h-6 text-[10px] w-24 bg-white/[0.03]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">Todo</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  ))
                  )}
                  {!isLoading && items.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-8 ring-1 ring-dashed ring-border rounded-lg">
                      {isEmpty ? "No tasks in this project yet." : "Drop tasks here"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <section className="pt-4">
          <h2 className="text-sm font-semibold tracking-tight mb-3">
            {isLoading ? "Members" : `Members (${members.length})`}
          </h2>
          <div className="flex flex-wrap gap-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => <MemberChipSkeleton key={index} />)
            ) : (
            members.map((m: any) => (
              <div key={m.user_id} className="flex items-center gap-2 px-3 py-1.5 ring-1 ring-border rounded-full bg-card text-sm">
                <div className="size-5 rounded-full bg-secondary grid place-items-center text-[10px] font-semibold uppercase">
                  {(m.profiles?.name ?? "?").slice(0, 1)}
                </div>
                {m.profiles?.name ?? m.profiles?.email}
              </div>
            ))
            )}
            {!isLoading && members.length === 0 && <p className="text-sm text-muted-foreground">No members yet.</p>}
          </div>
        </section>
          </>
        )}
      </div>
    </>
  );
}

function ProjectHeaderSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-7 w-56 rounded bg-white/[0.06]" />
      <div className="h-4 w-full max-w-xl rounded bg-white/[0.06]" />
    </div>
  );
}

function ProjectErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="ring-1 ring-border rounded-xl bg-card/60 shadow-elev hairline p-8 md:p-12 text-center">
      <div className="size-12 mx-auto rounded-xl bg-destructive/10 text-destructive grid place-items-center mb-4 ring-1 ring-destructive/20">
        <AlertTriangle className="size-5" />
      </div>
      <p className="text-sm font-semibold">Could not load this project</p>
      <p className="text-xs text-muted-foreground mt-1.5">
        The project may have changed, or the server took too long to respond.
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-5" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function ProjectStat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  accent?: string;
}) {
  return (
    <div className="p-4 bg-card/60 ring-1 ring-border rounded-xl hairline shadow-elev">
      <div className="flex items-center justify-between text-muted-foreground mb-2">
        <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
        <span className={accent}>{icon}</span>
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

function ProjectStatSkeleton() {
  return (
    <div className="p-4 bg-card/60 ring-1 ring-border rounded-xl hairline shadow-elev animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-20 rounded bg-white/[0.06]" />
        <div className="size-4 rounded bg-white/[0.06]" />
      </div>
      <div className="h-7 w-12 rounded bg-white/[0.06]" />
    </div>
  );
}

function TaskCardSkeleton() {
  return (
    <div className="p-3.5 bg-card ring-1 ring-border rounded-lg space-y-3 shadow-elev hairline animate-pulse">
      <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
      <div className="flex items-center justify-between">
        <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
        <div className="h-3 w-12 rounded bg-white/[0.06]" />
      </div>
      <div className="pt-2 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="size-4 rounded-full bg-white/[0.06]" />
          <div className="h-3 w-20 rounded bg-white/[0.06]" />
        </div>
        <div className="h-6 w-20 rounded bg-white/[0.06]" />
      </div>
    </div>
  );
}

function MemberChipSkeleton() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 ring-1 ring-border rounded-full bg-card animate-pulse">
      <div className="size-5 rounded-full bg-white/[0.06]" />
      <div className="h-3 w-24 rounded bg-white/[0.06]" />
    </div>
  );
}

function NewTaskDialog({
  projectId,
  members,
  membersLoading,
}: {
  projectId: string;
  members: TeamMember[];
  membersLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignee, setAssignee] = useState("UNASSIGNED");
  const [due, setDue] = useState("");
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title required");
      const base = {
        projectId,
        title: title.trim(),
        description: desc.trim(),
        priority: priorityToApi[priority as keyof typeof priorityToApi],
        dueDate: due ? new Date(due).toISOString() : null,
      };
      const assignment =
        assignee === "TEAM"
          ? { assignmentType: "TEAM", assignedToId: null }
          : assignee === "UNASSIGNED"
            ? { assignmentType: "UNASSIGNED", assignedToId: null }
            : { assignmentType: "USER", assignedToId: assignee };

      await apiClient.post<ApiResponse<{ task: ApiTask }>>("/tasks", {
        ...base,
        ...assignment,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["tasks-page"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Task created");
      setOpen(false); setTitle(""); setDesc(""); setDue(""); setAssignee("UNASSIGNED");
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />New task</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} maxLength={1000} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select value={assignee} onValueChange={setAssignee} disabled={membersLoading}>
              <SelectTrigger><SelectValue placeholder={membersLoading ? "Loading members..." : "Not assigned"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UNASSIGNED">Not assigned</SelectItem>
                <SelectItem value="TEAM">Whole team</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center gap-2">
                      <span className="size-5 rounded-full bg-gradient-to-br from-brand/35 to-accent/35 grid place-items-center text-[10px] font-semibold uppercase ring-1 ring-white/10">
                        {(m.name || m.email || "?").slice(0, 1)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{m.name ?? m.email}</span>
                        <span className="block text-[10px] text-muted-foreground truncate">
                          {m.email} · {m.role}
                        </span>
                      </span>
                    </div>
                  </SelectItem>
                ))}
                {!membersLoading && members.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No team members found. Invite members first.</div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!m.isPending) m.mutate();
            }}
            disabled={m.isPending}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog({ projectId, existing }: { projectId: string; existing: string[] }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string>();
  const profiles = useProfiles();
  const qc = useQueryClient();
  const available = (profiles.data ?? []).filter((p) => !existing.includes(p.id));

  const m = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Pick a user");
      await apiClient.post<ApiResponse<{ member: ApiMember }>>(`/projects/${projectId}/members`, { userId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Member added"); setOpen(false); setUserId(undefined);
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><UserPlus className="size-4 mr-1" />Add member</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add team member</DialogTitle></DialogHeader>
        <div className="space-y-2 py-2">
          <Label>User</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
            <SelectContent>
              {available.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>
              ))}
              {available.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">All users already added.</div>}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!m.isPending) m.mutate();
            }}
            disabled={m.isPending}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
