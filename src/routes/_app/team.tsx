import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/top-bar";
import { Mail, Shield, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient, getApiErrorMessage, type ApiResponse } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useTeamMembers, type TeamMember } from "@/lib/team-members";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/team")({
  component: TeamPage,
});

function TeamPage() {
  const { user, role } = useAuth();
  const isAdminUser = role === "admin";
  const qc = useQueryClient();

  const team = useTeamMembers();

  const deleteMember = useMutation({
    mutationFn: async (memberId: string) => {
      await apiClient.delete<ApiResponse<{ id: string }>>(`/team/${memberId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      qc.invalidateQueries({ queryKey: ["team-members"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["tasks-page"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Team member deleted");
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e)),
  });

  const updateRole = useMutation({
    mutationFn: async ({ memberId, nextRole }: { memberId: string; nextRole: TeamMember["role"] }) => {
      const response = await apiClient.patch<ApiResponse<{ member: TeamMember }>>(`/team/${memberId}/role`, {
        role: nextRole,
      });
      return response.data.data.member;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      qc.invalidateQueries({ queryKey: ["team-members"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Role updated");
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e)),
  });

  const members = team.data ?? [];
  const isInitialLoading = team.isLoading && !team.data;
  const maxLoad = Math.max(1, ...members.map((m) => m.openTaskCount));

  return (
    <>
      <TopBar title="Team" />
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Team</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isInitialLoading ? "Loading workspace members..." : `${members.length} ${members.length === 1 ? "member" : "members"} in your workspace.`}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => toast.info("Members can sign up from the auth page.")}>
            <UserCog className="size-3.5 mr-1.5" />Invite member
          </Button>
        </div>

        {isInitialLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="p-5 ring-1 ring-border rounded-xl bg-card/60 shadow-elev hairline">
                <div className="flex items-start gap-3">
                  <div className="size-12 rounded-full bg-white/[0.06] animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-white/[0.06] animate-pulse" />
                    <div className="h-3 w-full rounded bg-white/[0.06] animate-pulse" />
                  </div>
                </div>
                <div className="mt-5 h-1.5 rounded-full bg-white/[0.06] animate-pulse" />
              </div>
            ))}
          </div>
        ) : team.isError ? (
          <div className="ring-1 ring-border rounded-xl bg-card/60 p-12 text-center">
            <p className="text-sm font-medium text-destructive">Could not load team</p>
            <p className="text-xs text-muted-foreground mt-1.5">Please try again in a moment.</p>
          </div>
        ) : members.length === 0 ? (
          <div className="ring-1 ring-border rounded-xl bg-card/60 p-12 text-center">
            <p className="text-sm font-medium">No team members yet</p>
            <p className="text-xs text-muted-foreground mt-1.5">Registered users will appear here.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => {
              const isAdmin = member.role === "ADMIN";
              const initial = (member.name || member.email || "?").slice(0, 1);
              const active = member.activityStatus === "ACTIVE";
              const isSelf = member.id === user?.id;

              return (
                <div
                  key={member.id}
                  className="group p-5 ring-1 ring-border rounded-xl bg-card/60 hover:ring-white/15 transition-all hover:-translate-y-0.5 shadow-elev hairline"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="size-12 rounded-full bg-gradient-to-br from-brand/40 to-accent/40 grid place-items-center text-base font-semibold uppercase ring-1 ring-white/10">
                        {initial}
                      </div>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-card",
                          active ? "bg-emerald-400" : "bg-zinc-500",
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{member.name || member.email}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <Mail className="size-3" />
                        {member.email}
                      </p>
                    </div>
                    {isAdminUser ? (
                      <Select
                        value={member.role}
                        disabled={updateRole.isPending || (isSelf && member.role === "ADMIN")}
                        onValueChange={(nextRole) =>
                          updateRole.mutate({ memberId: member.id, nextRole: nextRole as TeamMember["role"] })
                        }
                      >
                        <SelectTrigger className="h-7 w-[104px] bg-white/[0.03] text-[10px] font-mono uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <RolePill isAdmin={isAdmin} role={member.role} />
                    )}
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        Workload
                      </span>
                      <span className="text-xs font-medium tabular-nums">{member.openTaskCount} open</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          member.openTaskCount === 0
                            ? "bg-zinc-600"
                            : member.openTaskCount >= maxLoad * 0.7
                              ? "bg-gradient-to-r from-amber-400 to-rose-400"
                              : "bg-gradient-to-r from-brand to-emerald-400",
                        )}
                        style={{ width: `${Math.max(6, (member.openTaskCount / maxLoad) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-3 text-[11px] text-muted-foreground font-mono">
                    <span className={cn("flex items-center gap-1.5", active && "text-emerald-300")}>
                      <span className={cn("size-1.5 rounded-full", active ? "bg-emerald-400" : "bg-zinc-500")} />
                      {active ? "Active work" : "Idle"}
                    </span>
                    <span>{format(new Date(member.createdAt), "MMM d, yyyy")}</span>
                  </div>

                  {isAdminUser && (
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <RolePill isAdmin={isAdmin} role={member.role} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSelf || deleteMember.isPending}
                            className="h-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-3.5 mr-1.5" />Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete team member?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes {member.name || member.email} from the workspace and unassigns their active tasks.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteMember.mutate(member.id)}
                            >
                              Delete member
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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

function RolePill({ isAdmin, role }: { isAdmin: boolean; role: TeamMember["role"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 shrink-0",
        isAdmin
          ? "bg-brand/10 text-brand ring-brand/30"
          : "bg-white/5 text-muted-foreground ring-white/10",
      )}
    >
      {isAdmin && <Shield className="size-2.5" />}
      {role}
    </span>
  );
}
