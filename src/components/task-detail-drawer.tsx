import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Activity, CalendarClock, CheckCircle2, CircleDot, MessageSquare, Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PriorityBadge, StatusPill } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { apiClient, getApiErrorMessage, type ApiResponse } from "@/lib/api-client";
import { useTeamMembers } from "@/lib/team-members";
import { cn } from "@/lib/utils";

type TaskUser = {
  id: string;
  name: string | null;
  email: string;
  role?: "ADMIN" | "MEMBER";
};

type TaskComment = {
  id: string;
  content: string;
  createdAt: string;
  user: TaskUser;
};

type TaskActivity = {
  id: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: TaskUser;
};

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  assignmentType: "UNASSIGNED" | "USER" | "TEAM";
  dueDate: string | null;
  projectId: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string } | null;
  assignedTo?: TaskUser | null;
  createdBy: TaskUser;
  comments: TaskComment[];
  activities: TaskActivity[];
};

const statusToLabel = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

const priorityToLabel = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const statusToUi = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
} as const;

const priorityToUi = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

function initials(user?: TaskUser | null) {
  const source = user?.name || user?.email || "U";
  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function dateInputValue(value?: string | null) {
  if (!value) return "";
  return format(new Date(value), "yyyy-MM-dd");
}

function activityText(activity: TaskActivity) {
  const actor = activity.user.name || activity.user.email;
  const oldValue = activity.oldValue;
  const newValue = activity.newValue;

  switch (activity.action) {
    case "created":
      return `${actor} created this task`;
    case "status_changed":
      return `${actor} changed status from ${oldValue} to ${newValue}`;
    case "priority_changed":
      return `${actor} changed priority from ${oldValue} to ${newValue}`;
    case "assignee_changed":
      return `${actor} updated the assignee`;
    case "assignment_changed":
      return `${actor} changed assignment from ${oldValue} to ${newValue}`;
    case "due_date_updated":
      return `${actor} updated the due date`;
    case "description_updated":
      return `${actor} updated the description`;
    case "comment_added":
      return `${actor} added a comment`;
    default:
      return `${actor} updated this task`;
  }
}

export function TaskDetailDrawer({
  taskId,
  open,
  onOpenChange,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const teamMembers = useTeamMembers();
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskDetail["status"]>("TODO");
  const [priority, setPriority] = useState<TaskDetail["priority"]>("MEDIUM");
  const [assignee, setAssignee] = useState("UNASSIGNED");
  const [dueDate, setDueDate] = useState("");
  const [comment, setComment] = useState("");

  const detail = useQuery({
    queryKey: ["task-detail", taskId],
    enabled: open && Boolean(taskId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ task: TaskDetail }>>(`/tasks/${taskId}`);
      return response.data.data.task;
    },
    staleTime: 10000,
  });

  useEffect(() => {
    if (!detail.data) return;
    setDescription(detail.data.description ?? "");
    setStatus(detail.data.status);
    setPriority(detail.data.priority);
    setDueDate(dateInputValue(detail.data.dueDate));
    setAssignee(
      detail.data.assignmentType === "TEAM"
        ? "TEAM"
        : detail.data.assignmentType === "USER" && detail.data.assignedToId
          ? `USER:${detail.data.assignedToId}`
          : "UNASSIGNED",
    );
  }, [detail.data]);

  const invalidateTaskSurfaces = () => {
    queryClient.invalidateQueries({ queryKey: ["task-detail", taskId] });
    queryClient.invalidateQueries({ queryKey: ["tasks-page"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["project"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const updateTask = useMutation({
    mutationFn: async () => {
      if (!taskId) return null;
      const assignment =
        assignee === "TEAM"
          ? { assignmentType: "TEAM", assignedToId: null }
          : assignee === "UNASSIGNED"
            ? { assignmentType: "UNASSIGNED", assignedToId: null }
            : { assignmentType: "USER", assignedToId: assignee.replace("USER:", "") };

      const response = await apiClient.patch<ApiResponse<{ task: TaskDetail }>>(`/tasks/${taskId}`, {
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        ...assignment,
      });
      return response.data.data.task;
    },
    onSuccess: () => {
      invalidateTaskSurfaces();
      toast.success("Task updated");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!taskId) return null;
      const response = await apiClient.post<ApiResponse<{ comment: TaskComment }>>(`/tasks/${taskId}/comments`, {
        content: comment.trim(),
      });
      return response.data.data.comment;
    },
    onSuccess: () => {
      setComment("");
      invalidateTaskSurfaces();
      toast.success("Comment added");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const task = detail.data;
  const assignmentLabel = useMemo(() => {
    if (!task) return "Not assigned";
    if (task.assignmentType === "TEAM") return "Whole team";
    if (task.assignmentType === "USER") return task.assignedTo?.name || task.assignedTo?.email || "Individual member";
    return "Not assigned";
  }, [task]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto bg-popover p-0">
        <SheetHeader className="sticky top-0 z-10 border-b border-border bg-popover/95 px-5 py-4 backdrop-blur">
          <SheetTitle className="text-left text-base">
            {detail.isLoading && !task ? "Loading task..." : task?.title ?? "Task detail"}
          </SheetTitle>
        </SheetHeader>

        {detail.isLoading && !task ? (
          <div className="p-5 space-y-5">
            <div className="h-7 w-3/4 rounded bg-white/[0.06] animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-16 rounded-lg bg-white/[0.04] animate-pulse" />
              ))}
            </div>
            <div className="h-36 rounded-lg bg-white/[0.04] animate-pulse" />
            <div className="h-48 rounded-lg bg-white/[0.04] animate-pulse" />
          </div>
        ) : detail.isError || !task ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-destructive">Could not load task detail</p>
            <p className="mt-1 text-xs text-muted-foreground">Please try again in a moment.</p>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => detail.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="p-5 space-y-6">
            <section className="space-y-3">
              <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
              <div className="grid sm:grid-cols-2 gap-3">
                <Info label="Status">
                  <StatusPill status={statusToUi[task.status]} />
                </Info>
                <Info label="Priority">
                  <PriorityBadge priority={priorityToUi[task.priority]} />
                </Info>
                <Info label="Assignee">{assignmentLabel}</Info>
                <Info label="Assignment type">
                  {task.assignmentType === "TEAM"
                    ? "Whole team"
                    : task.assignmentType === "USER"
                      ? "Individual member"
                      : "Not assigned"}
                </Info>
                <Info label="Due date">{task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "No due date"}</Info>
                <Info label="Project">{task.project?.name ?? "No project"}</Info>
                <Info label="Created by">{task.createdBy.name || task.createdBy.email}</Info>
                <Info label="Created">{format(new Date(task.createdAt), "MMM d, yyyy h:mm a")}</Info>
                <Info label="Updated">{format(new Date(task.updatedAt), "MMM d, yyyy h:mm a")}</Info>
              </div>
            </section>

            <section className="rounded-xl ring-1 ring-border bg-card/60 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-brand" />
                <h2 className="text-sm font-semibold">Edit task</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Status">
                  <Select value={status} onValueChange={(value) => setStatus(value as TaskDetail["status"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">Todo</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="DONE">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Priority">
                  <Select value={priority} onValueChange={(value) => setPriority(value as TaskDetail["priority"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Assignee">
                  <Select value={assignee} onValueChange={setAssignee}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNASSIGNED">Not assigned</SelectItem>
                      <SelectItem value="TEAM">Whole team</SelectItem>
                      {(teamMembers.data ?? []).map((member) => (
                        <SelectItem key={member.id} value={`USER:${member.id}`}>
                          {member.name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Due date">
                  <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                </Field>
              </div>
              <Field label="Description">
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add context, acceptance notes, or links..."
                  className="min-h-28 resize-none"
                />
              </Field>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => updateTask.mutate()}
                  disabled={updateTask.isPending}
                  className="bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  <Save className="size-4 mr-2" />
                  {updateTask.isPending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </section>

            <section className="rounded-xl ring-1 ring-border bg-card/60 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-brand" />
                <h2 className="text-sm font-semibold">Comments</h2>
              </div>
              <div className="space-y-3">
                {task.comments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    No comments yet. Start the discussion.
                  </div>
                ) : (
                  task.comments.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <Avatar user={item.user} />
                      <div className="min-w-0 flex-1 rounded-lg bg-white/[0.03] p-3 ring-1 ring-border">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium truncate">{item.user.name || item.user.email}</p>
                          <p className="text-[10px] text-muted-foreground font-mono shrink-0">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{item.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-2">
                <Textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Write a comment..."
                  className="min-h-24 resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    disabled={addComment.isPending || !comment.trim()}
                    onClick={() => addComment.mutate()}
                  >
                    {addComment.isPending ? "Posting..." : "Submit comment"}
                  </Button>
                </div>
              </div>
            </section>

            <section className="rounded-xl ring-1 ring-border bg-card/60 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-brand" />
                <h2 className="text-sm font-semibold">Activity history</h2>
              </div>
              <div className="space-y-4">
                {task.activities.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    No activity yet.
                  </div>
                ) : (
                  task.activities.map((item) => (
                    <div key={item.id} className="relative flex gap-3">
                      <div className="pt-1">
                        <CircleDot className="size-4 text-brand" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm">{activityText(item)}</p>
                        <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg ring-1 ring-border bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Avatar({ user }: { user: TaskUser }) {
  return (
    <div
      className={cn(
        "size-8 rounded-full bg-gradient-to-br from-brand/40 to-accent/40 grid place-items-center text-xs font-semibold uppercase ring-1 ring-white/10 shrink-0",
      )}
    >
      <UserRound className="sr-only" />
      {initials(user)}
    </div>
  );
}
