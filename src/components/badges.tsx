import { cn } from "@/lib/utils";

export function PriorityBadge({ priority }: { priority: "low" | "medium" | "high" }) {
  const styles = {
    high: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
    medium: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
    low: "bg-white/5 text-muted-foreground ring-white/10",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full ring-1 tracking-wider",
        styles[priority],
      )}
    >
      {priority}
    </span>
  );
}

export function StatusPill({ status }: { status: "todo" | "in_progress" | "done" }) {
  const label = status === "in_progress" ? "In Progress" : status === "todo" ? "Todo" : "Done";
  const dot = {
    todo: "bg-zinc-400",
    in_progress: "bg-sky-400 animate-pulse-dot",
    done: "bg-emerald-400",
  } as const;
  const styles = {
    todo: "bg-white/5 text-muted-foreground ring-white/10",
    in_progress: "bg-sky-500/10 text-sky-300 ring-sky-500/25",
    done: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full ring-1",
        styles[status],
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot[status])} />
      {label}
    </span>
  );
}
