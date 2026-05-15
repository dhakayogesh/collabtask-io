import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar, useProfiles } from "@/components/top-bar";
import { PriorityBadge } from "@/components/badges";
import { useAuth } from "@/lib/auth-context";
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
import { ChevronLeft, Plus, UserPlus } from "lucide-react";
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

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const qc = useQueryClient();

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
  });

  const tasks = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, assignee_id, profiles:assignee_id(name)")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const members = useQuery({
    queryKey: ["members", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("project_members")
        .select("user_id, profiles:user_id(name, email)")
        .eq("project_id", projectId);
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tasks").update({ status: status as any }).eq("id", id);
      if (error) throw error;
      await supabase.from("activity_log").insert({
        project_id: projectId, user_id: user!.id,
        message: `moved a task to ${status.replace("_", " ")}`,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <TopBar title={project.data?.name ?? "Project"} crumb="Projects" />
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <Link to="/projects" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-2">
              <ChevronLeft className="size-3 mr-1" />Back to projects
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">{project.data?.name}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{project.data?.description || "—"}</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && <AddMemberDialog projectId={projectId} existing={members.data?.map((m: any) => m.user_id) ?? []} />}
            {isAdmin && <NewTaskDialog projectId={projectId} userId={user!.id} members={members.data ?? []} />}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLS.map((c) => {
            const items = (tasks.data ?? []).filter((t) => t.status === c.key);
            return (
              <div key={c.key} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{c.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary ring-1 ring-border">{items.length}</span>
                </div>
                <div className="space-y-2 min-h-[120px]">
                  {items.map((t: any) => (
                    <div key={t.id} className="p-4 bg-card ring-1 ring-border rounded-lg space-y-3 hover:ring-foreground/20 transition-all">
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="flex items-center justify-between">
                        <PriorityBadge priority={t.priority} />
                        {t.due_date && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(t.due_date), "MMM d")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] text-muted-foreground truncate">
                          {t.profiles?.name ?? "Unassigned"}
                        </div>
                        {(isAdmin || t.assignee_id === user?.id) && (
                          <Select
                            value={t.status}
                            onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v })}
                          >
                            <SelectTrigger className="h-7 text-[11px] w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">Todo</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-6 ring-1 ring-dashed ring-border rounded-lg">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <section className="pt-4">
          <h2 className="text-sm font-semibold tracking-tight mb-3">Members ({members.data?.length ?? 0})</h2>
          <div className="flex flex-wrap gap-2">
            {(members.data ?? []).map((m: any) => (
              <div key={m.user_id} className="flex items-center gap-2 px-3 py-1.5 ring-1 ring-border rounded-full bg-card text-sm">
                <div className="size-5 rounded-full bg-secondary grid place-items-center text-[10px] font-semibold uppercase">
                  {(m.profiles?.name ?? "?").slice(0, 1)}
                </div>
                {m.profiles?.name ?? m.profiles?.email}
              </div>
            ))}
            {(members.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No members yet.</p>}
          </div>
        </section>
      </div>
    </>
  );
}

function NewTaskDialog({ projectId, userId, members }: { projectId: string; userId: string; members: any[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignee, setAssignee] = useState<string | undefined>();
  const [due, setDue] = useState("");
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title required");
      const { error } = await supabase.from("tasks").insert({
        project_id: projectId,
        title: title.trim(),
        description: desc.trim(),
        priority: priority as any,
        assignee_id: assignee ?? null,
        due_date: due ? new Date(due).toISOString() : null,
        created_by: userId,
      });
      if (error) throw error;
      await supabase.from("activity_log").insert({
        project_id: projectId, user_id: userId, message: `created task ${title.trim()}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      toast.success("Task created");
      setOpen(false); setTitle(""); setDesc(""); setDue(""); setAssignee(undefined);
    },
    onError: (e: any) => toast.error(e.message),
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
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profiles?.name ?? m.profiles?.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>Create</Button>
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
      const { error } = await supabase.from("project_members").insert({ project_id: projectId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members", projectId] });
      toast.success("Member added"); setOpen(false); setUserId(undefined);
    },
    onError: (e: any) => toast.error(e.message),
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
          <Button onClick={() => m.mutate()} disabled={m.isPending}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
