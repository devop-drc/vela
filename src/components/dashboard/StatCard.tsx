import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  color?: "blue" | "emerald" | "violet" | "amber";
  /** When set, the whole card becomes a link to this route. */
  to?: string;
}

const colorMap = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-200/50" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-200/50" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-600", border: "border-violet-200/50" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-200/50" },
};

export const StatCard = ({ title, value, icon: Icon, trend, trendLabel, color = "blue", to }: StatCardProps) => {
  const c = colorMap[color];

  const inner = (
    <>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">{title}</span>
        <div className={cn("rounded-md p-1.5", c.bg)}>
          <Icon className={cn("h-3.5 w-3.5", c.text)} />
        </div>
      </div>
      <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
      {trend && trend !== "neutral" && trendLabel && (
        <span className={cn(
          "mt-1 inline-flex items-center gap-1 text-[10px] font-medium",
          trend === "up" ? "text-emerald-600" : "text-red-500"
        )}>
          {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trendLabel}
        </span>
      )}
    </>
  );

  const base = cn("block rounded-lg border bg-card px-4 py-3 transition-shadow", c.border);

  if (to) {
    return (
      <Link to={to} className={cn(base, "hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring outline-none cursor-pointer")} aria-label={`${title}: ${value}`}>
        {inner}
      </Link>
    );
  }

  return <div className={base}>{inner}</div>;
};
