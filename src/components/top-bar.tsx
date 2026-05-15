import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Bell } from "lucide-react";

export function TopBar({ title, crumb }: { title: string; crumb?: string }) {
  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-8 bg-background sticky top-0 z-10">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{crumb ?? "Workspace"}</span>
        <span className="text-border">/</span>
        <span className="font-medium">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="text-sm pl-9 pr-4 py-1.5 rounded-md ring-1 ring-border bg-secondary/50 w-64 focus:outline-none focus:ring-ring transition-shadow"
          />
        </div>
        <button className="size-8 grid place-items-center rounded-md hover:bg-secondary text-muted-foreground">
          <Bell className="size-4" />
        </button>
      </div>
    </header>
  );
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, name, email");
      if (error) throw error;
      return data;
    },
  });
}
