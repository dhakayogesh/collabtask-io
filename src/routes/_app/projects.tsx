import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/projects")({
  component: Projects,
});

function Projects() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description, created_at, tasks(count), project_members(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <TopBar title="Projects" />
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? "Create and organize your team's work." : "Projects you're a member of."}
            </p>
          </div>
          {isAdmin && <NewProjectDialog userId={user!.id} />}
        </div>

        {(projects.data ?? []).length === 0 ? (
          <div className="ring-1 ring-border rounded-xl bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">No projects yet.</p>
            {isAdmin && <p className="text-xs text-muted-foreground mt-2">Create your first project to get started.</p>}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.data!.map((p: any) => (
              <Link
                key={p.id}
                to="/projects/$projectId"
                params={{ projectId: p.id }}
                className="block p-5 ring-1 ring-border rounded-xl bg-card hover:ring-foreground/20 transition-all hover:-translate-y-0.5"
              >
                <h3 className="font-semibold tracking-tight">{p.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2 min-h-[40px]">
                  {p.description || "No description"}
                </p>
                <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.tasks?.[0]?.count ?? 0} tasks · {p.project_members?.[0]?.count ?? 0} members</span>
                  <span>{format(new Date(p.created_at), "MMM d")}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function NewProjectDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      const { data, error } = await supabase
        .from("projects")
        .insert({ name: name.trim(), description: desc.trim(), created_by: userId })
        .select()
        .single();
      if (error) throw error;
      // add creator as a member
      await supabase.from("project_members").insert({ project_id: data.id, user_id: userId });
      await supabase.from("activity_log").insert({
        project_id: data.id, user_id: userId, message: `created project ${data.name}`,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created");
      setOpen(false); setName(""); setDesc("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4 mr-1" />New project</Button>
      </DialogTrigger>
      <DialogContent>
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
          <Button onClick={() => m.mutate()} disabled={m.isPending}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
