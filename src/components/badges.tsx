import { cn } from "@/lib/utils";

export function PriorityBadge({ priority }: { priority: "low" | "medium" | "high" }) {
  const styles = {
    high: "bg-rose-50 text-rose-700 ring-rose-100",
    medium: "bg-amber-50 text-amber-700 ring-amber-100",
    low: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  } as const;
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full ring-1",
      styles[priority],
    )}>
      {priority}
    </span>
  );
}

export function StatusPill({ status }: { status: "todo" | "in_progress" | "done" }) {
  const label = status === "in_progress" ? "In Progress" : status === "todo" ? "Todo" : "Done";
  const styles = {
    todo: "bg-zinc-100 text-zinc-600",
    in_progress: "bg-blue-50 text-blue-700",
    done: "bg-emerald-50 text-emerald-700",
  } as const;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded", styles[status])}>
      {label}
    </span>
  );
}
