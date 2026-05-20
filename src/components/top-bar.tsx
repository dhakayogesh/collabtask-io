import { useDeferredValue, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, Bell, Menu, LogOut, Plus, FolderKanban, CheckSquare, Users, UserRound } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";
import { apiClient, type ApiResponse } from "@/lib/api-client";
import { formatDistanceToNow } from "date-fns";

type SearchProject = {
  id: string;
  name: string;
  description: string | null;
};

type SearchTask = {
  id: string;
  title: string;
  status: string;
  project?: {
    name: string;
  } | null;
};

type SearchProfile = {
  id: string;
  name: string | null;
  email: string;
};

type TeamMember = SearchProfile & {
  role: "ADMIN" | "MEMBER";
};

type AppNotification = {
  id: string;
  type: "TASK_ASSIGNED" | "TASK_DUE_SOON" | "TASK_STATUS_CHANGED" | "PROJECT_MEMBER_ADDED";
  title: string;
  message: string;
  read: boolean;
  data?: {
    taskId?: string;
    projectId?: string;
  } | null;
  createdAt: string;
};

export function TopBar({ title, crumb }: { title: string; crumb?: string }) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isMac, setIsMac] = useState(false);
  const deferredSearchValue = useDeferredValue(searchValue);
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const searchData = useQuery({
    queryKey: ["topbar-search", deferredSearchValue],
    enabled: searchOpen,
    queryFn: async () => {
      const search = deferredSearchValue.trim() || undefined;
      const [tasks, projects, team] = await Promise.all([
        apiClient.get<ApiResponse<{ tasks: SearchTask[] }>>("/tasks", {
          params: { search },
        }),
        apiClient.get<ApiResponse<{ projects: SearchProject[] }>>("/projects", {
          params: { search },
        }),
        apiClient.get<ApiResponse<{ members: TeamMember[] }>>("/team", {
          params: { search },
        }),
      ]);

      return {
        tasks: (tasks.data.data.tasks ?? []).slice(0, 12),
        projects: (projects.data.data.projects ?? []).slice(0, 12),
        profiles: (team.data.data.members ?? [])
          .map(({ id, name, email }) => ({ id, name, email }))
          .slice(0, 12),
      };
    },
    staleTime: 30000,
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && /mac/i.test(navigator.platform));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const runCommand = (callback: () => void) => {
    setSearchOpen(false);
    callback();
  };

  return (
    <header className="h-14 border-b border-border flex items-center justify-between gap-2 px-4 md:px-6 glass-strong sticky top-0 z-20">
      <div className="flex items-center gap-2 min-w-0">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9 md:hidden shrink-0">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 flex flex-col bg-sidebar border-border">
            <SheetHeader className="p-5 pb-2">
              <SheetTitle className="flex items-center gap-2 text-left">
                <div className="size-7 rounded-md bg-gradient-to-br from-brand to-emerald-700 grid place-items-center">
                  <div className="size-2 bg-background rounded-[2px] rotate-45" />
                </div>
                WeTask
              </SheetTitle>
            </SheetHeader>
            <nav className="flex-1 px-2 space-y-0.5 mt-2">
              {navItems.map((it) => {
                const active = path === it.to || path.startsWith(it.to + "/");
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "relative flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-md transition-all",
                      active
                        ? "bg-white/[0.06] text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-brand shadow-[0_0_8px_var(--brand)]" />
                    )}
                    <Icon className={cn("size-4 shrink-0", active && "text-brand")} />
                    {it.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-2 border-t border-border">
              <div className="flex items-center gap-3 p-2">
                <div className="size-8 rounded-full bg-gradient-to-br from-brand/40 to-accent/40 grid place-items-center text-xs font-semibold uppercase">
                  {(user?.email ?? "U").slice(0, 1)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-medium truncate">{user?.email}</p>
                  <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider font-mono">
                    {role ?? "—"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="size-8" onClick={signOut} title="Sign out">
                  <LogOut className="size-4" />
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-muted-foreground hidden sm:inline">{crumb ?? "Workspace"}</span>
          <span className="text-border hidden sm:inline">/</span>
          <span className="font-medium truncate">{title}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-2 h-9 pl-2.5 pr-1.5 rounded-md ring-1 ring-border bg-secondary/40 hover:bg-secondary text-xs text-muted-foreground transition-colors w-56 lg:w-64"
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left">Search or jump to…</span>
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-background/80 ring-1 ring-border">
            {isMac ? "⌘" : "Ctrl"}K
          </kbd>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 md:hidden text-muted-foreground hover:text-foreground"
          title="Search"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="size-4" />
        </Button>
        <NotificationsBell />
        <Button
          size="sm"
          onClick={() => navigate({ to: "/projects" })}
          className="h-9 hidden sm:inline-flex bg-brand text-brand-foreground hover:bg-brand/90 shadow-elev"
        >
          <Plus className="size-3.5 mr-1" />New
        </Button>
        <Button
          size="icon"
          onClick={() => navigate({ to: "/projects" })}
          className="size-9 sm:hidden bg-brand text-brand-foreground hover:bg-brand/90"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput
          placeholder="Search tasks, projects, or people..."
          value={searchValue}
          onValueChange={setSearchValue}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/dashboard" }))}>
              <Search className="size-4" />
              Dashboard
              <CommandShortcut>Page</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/tasks" }))}>
              <CheckSquare className="size-4" />
              Tasks
              <CommandShortcut>Page</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/projects" }))}>
              <FolderKanban className="size-4" />
              Projects
              <CommandShortcut>Page</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/team" }))}>
              <Users className="size-4" />
              Team
              <CommandShortcut>Page</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/profile" }))}>
              <UserRound className="size-4" />
              Profile
              <CommandShortcut>Page</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Projects">
            {(searchData.data?.projects ?? []).map((project) => (
              <CommandItem
                key={project.id}
                value={`project ${project.name} ${project.description ?? ""}`}
                onSelect={() => runCommand(() => navigate({ to: "/projects/$projectId", params: { projectId: project.id } }))}
              >
                <FolderKanban className="size-4" />
                <span className="truncate">{project.name}</span>
                <CommandShortcut>Project</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Tasks">
            {(searchData.data?.tasks ?? []).map((task) => (
              <CommandItem
                key={task.id}
                value={`task ${task.title} ${task.project?.name ?? ""}`}
                onSelect={() => runCommand(() => navigate({ to: "/tasks" }))}
              >
                <CheckSquare className="size-4" />
                <span className="truncate">{task.title}</span>
                <CommandShortcut>{task.status.replace("_", " ")}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="People">
            {(searchData.data?.profiles ?? []).map((profile) => (
              <CommandItem
                key={profile.id}
                value={`person ${profile.name ?? ""} ${profile.email ?? ""}`}
                onSelect={() => runCommand(() => navigate({ to: "/team" }))}
              >
                <Users className="size-4" />
                <span className="truncate">{profile.name || profile.email}</span>
                <CommandShortcut>Team</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}

function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: ["notifications"],
    enabled: Boolean(user),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{
        notifications: AppNotification[];
        unreadCount: number;
      }>>("/notifications");
      return response.data.data;
    },
    refetchInterval: 30000,
    staleTime: 15000,
    placeholderData: (previous) => previous,
  });

  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.patch<ApiResponse<{ notification: AppNotification }>>(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await apiClient.patch<ApiResponse<{ notifications: AppNotification[]; unreadCount: number }>>("/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const items = notifications.data?.notifications ?? [];
  const unreadCount = notifications.data?.unreadCount ?? 0;

  const openNotification = (notification: AppNotification) => {
    if (!notification.read) markRead.mutate(notification.id);
    if (notification.data?.projectId) {
      navigate({ to: "/projects/$projectId", params: { projectId: notification.data.projectId } });
      return;
    }
    navigate({ to: "/tasks" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 text-muted-foreground hover:text-foreground"
          title="Notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-4 h-4 px-1 rounded-full bg-brand text-[9px] font-semibold text-brand-foreground grid place-items-center ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm">Notifications</DropdownMenuLabel>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            disabled={unreadCount === 0 || markAllRead.isPending}
            onClick={(event) => {
              event.preventDefault();
              markAllRead.mutate();
            }}
          >
            Mark all read
          </Button>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-96 overflow-y-auto p-1">
          {notifications.isLoading && !notifications.data ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-3 rounded-md animate-pulse">
                <div className="h-3 w-32 rounded bg-white/[0.06]" />
                <div className="mt-2 h-3 w-full rounded bg-white/[0.06]" />
                <div className="mt-2 h-2 w-20 rounded bg-white/[0.06]" />
              </div>
            ))
          ) : notifications.isError ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Could not load notifications.
            </div>
          ) : items.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <div className="mx-auto size-9 rounded-full bg-white/[0.04] grid place-items-center mb-2">
                <Bell className="size-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">Task and project updates will appear here.</p>
            </div>
          ) : (
            items.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="items-start gap-3 p-3 cursor-pointer"
                onSelect={() => openNotification(notification)}
              >
                <span
                  className={cn(
                    "mt-1 size-2 rounded-full shrink-0",
                    notification.read ? "bg-white/15" : "bg-brand shadow-[0_0_10px_var(--brand)]",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate">{notification.title}</span>
                  <span className="block text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {notification.message}
                  </span>
                  <span className="block text-[10px] text-muted-foreground font-mono mt-1.5">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </span>
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function useProfiles() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ members: TeamMember[] }>>("/team");
      return response.data.data.members.map(({ id, name, email }) => ({ id, name, email }));
    },
    staleTime: 30000,
  });
}
