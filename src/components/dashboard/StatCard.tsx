import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  color?: "blue" | "emerald" | "violet" | "amber";
}

const colorMap = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-200/50" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-200/50" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-600", border: "border-violet-200/50" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-200/50" },
};

export const StatCard = ({ title, value, icon: Icon, trend, trendLabel, color = "blue" }: StatCardProps) => {
  const c = colorMap[color];

  return (
    <div className={cn("rounded-lg border bg-card p-5 transition-shadow hover:shadow-md", c.border)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className={cn("rounded-lg p-2", c.bg)}>
          <Icon className={cn("h-4 w-4", c.text)} />
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {trend && trend !== "neutral" && trendLabel && (
        <span className={cn(
          "mt-2 inline-flex items-center gap-1 text-xs font-medium",
          trend === "up" ? "text-emerald-600" : "text-red-500"
        )}>
          {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trendLabel}
        </span>
      )}
    </div>
  );
};
