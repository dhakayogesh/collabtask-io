import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";

export const Route = createFileRoute("/_app/team")({
  component: TeamPage,
});

function TeamPage() {
  const team = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, name, email, created_at");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      return (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "member" }));
    },
  });

  return (
    <>
      <TopBar title="Team" />
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">{team.data?.length ?? 0} members in your workspace.</p>
        </div>
        <div className="ring-1 ring-border rounded-xl bg-card divide-y divide-border">
          {(team.data ?? []).map((m: any) => (
            <div key={m.id} className="flex items-center gap-4 p-4">
              <div className="size-10 rounded-full bg-secondary grid place-items-center text-sm font-semibold uppercase">
                {(m.name || m.email).slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.name || m.email}</p>
                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded bg-secondary">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
