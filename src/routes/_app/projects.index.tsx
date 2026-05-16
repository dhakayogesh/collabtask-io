import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { TopBar } from "@/components/top-bar";
import { useAuth } from "@/lib/auth-context";
import { apiClient, getApiErrorMessage, type ApiResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Users, CheckCircle2, ArrowUpRight, FolderKanban, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/projects/")({
  component: Projects,
});

type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  tasks?: { id: string; status: "TODO" | "IN_PROGRESS" | "DONE" }[];
  _count?: { tasks: number; members: number };
};

function Projects() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const qc = useQueryClient();
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ projects: ProjectSummary[] }>>("/projects");
      return response.data.data.projects;
    },
    staleTime: 30000,
    placeholderData: (previous) => previous,
  });
  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      await apiClient.delete<ApiResponse<{ id: string }>>(`/projects/${projectId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Project deleted");
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <>
      <TopBar title="Projects" />
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? "Create and organize your team's work." : "Projects you're a member of."}
            </p>
          </div>
          {isAdmin && <NewProjectDialog />}
        </div>

        {projects.isLoading && !projects.data ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => <ProjectCardSkeleton key={index} />)}
          </div>
        ) : projects.isError ? (
          <div className="ring-1 ring-border rounded-xl bg-card/60 p-12 text-center">
            <p className="text-sm font-medium text-destructive">Could not load projects</p>
            <p className="text-xs text-muted-foreground mt-1.5">Please try again in a moment.</p>
          </div>
        ) : (projects.data ?? []).length === 0 ? (
          <div className="ring-1 ring-border rounded-xl bg-card/60 p-12 text-center">
            <div className="size-12 mx-auto rounded-xl bg-white/[0.04] grid place-items-center mb-4">
              <FolderKanban className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No projects yet</p>
            {isAdmin && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Create your first project to get started.
              </p>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.data!.map((p: any) => {
              const tasks = (p.tasks as any[]) ?? [];
              const total = p._count?.tasks ?? tasks.length;
              const done = tasks.filter((t) => t.status === "DONE").length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const memberCount = p._count?.members;
              const status = total === 0 ? "empty" : pct === 100 ? "complete" : pct >= 50 ? "on track" : "active";
              const statusStyles =
                status === "complete"
                  ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
                  : status === "on track"
                  ? "bg-sky-500/10 text-sky-300 ring-sky-500/25"
                  : status === "active"
                  ? "bg-amber-500/10 text-amber-300 ring-amber-500/25"
                  : "bg-white/5 text-muted-foreground ring-white/10";

              return (
                <div
                  key={p.id}
                  className="group relative ring-1 ring-border rounded-xl bg-card/60 hover:ring-white/15 hover:bg-card transition-all hover:-translate-y-0.5 shadow-elev hairline overflow-hidden"
                >
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: p.id }}
                    className="block p-5"
                  >
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start justify-between gap-3 mb-3 pr-9">
                      <div className="min-w-0">
                        <h3 className="font-semibold tracking-tight truncate flex items-center gap-1.5">
                          {p.name}
                          <ArrowUpRight className="size-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                        </h3>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {format(new Date(p.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 shrink-0 ${statusStyles}`}>
                        {status}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                      {p.description || "No description"}
                    </p>

                    <div className="mt-5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Progress</span>
                        <span className="text-xs font-medium tabular-nums">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand to-emerald-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5" />
                        <span className="tabular-nums">{done}/{total}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="size-3.5" />
                        <span className="tabular-nums">{memberCount ?? "—"}</span>
                      </div>
                    </div>
                  </Link>
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-3 top-3 size-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete project?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {p.name}, including its tasks and members.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteProject.mutate(p.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="p-5 ring-1 ring-border rounded-xl bg-card/60 shadow-elev hairline animate-pulse">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-2/3 rounded bg-white/[0.06]" />
          <div className="h-3 w-24 rounded bg-white/[0.06]" />
        </div>
        <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
      </div>
      <div className="space-y-2 min-h-[40px]">
        <div className="h-3 w-full rounded bg-white/[0.06]" />
        <div className="h-3 w-3/4 rounded bg-white/[0.06]" />
      </div>
      <div className="mt-5 h-1.5 rounded-full bg-white/[0.06]" />
      <div className="mt-4 pt-4 border-t border-border flex gap-4">
        <div className="h-3 w-12 rounded bg-white/[0.06]" />
        <div className="h-3 w-12 rounded bg-white/[0.06]" />
      </div>
    </div>
  );
}

function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      const response = await apiClient.post<ApiResponse<{ project: ProjectSummary }>>("/projects", {
        name: name.trim(),
        description: desc.trim(),
      });
      return response.data.data.project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Project created");
      setOpen(false); setName(""); setDesc("");
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90 shadow-elev">
          <Plus className="size-4 mr-1" />New project
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-popover border-border">
        <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="np-name">Name</Label>
            <Input id="np-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="np-desc">Description</Label>
            <Textarea id="np-desc" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending} className="bg-brand text-brand-foreground hover:bg-brand/90">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
