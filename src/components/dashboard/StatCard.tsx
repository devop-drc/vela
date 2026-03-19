import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
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
  blue: {
    iconBg: "bg-blue-50",
    icon: "text-blue-500",
  },
  emerald: {
    iconBg: "bg-emerald-50",
    icon: "text-emerald-500",
  },
  violet: {
    iconBg: "bg-violet-50",
    icon: "text-violet-500",
  },
  amber: {
    iconBg: "bg-amber-50",
    icon: "text-amber-500",
  },
};

export const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = "blue",
}: StatCardProps) => {
  const colors = colorMap[color];

  return (
    <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }}>
      <Card className="overflow-hidden">
        <CardContent className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
              <p className="text-3xl font-bold mt-1 tabular-nums">{value}</p>
              {trend && trend !== "neutral" && trendLabel && (
                <span
                  className={cn(
                    "mt-1 inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5",
                    trend === "up"
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-red-600 bg-red-50"
                  )}
                >
                  {trend === "up" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {trendLabel}
                </span>
              )}
            </div>
            <div className={cn("flex-shrink-0 rounded-full p-2", colors.iconBg)}>
              <Icon className={cn("h-4 w-4", colors.icon)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
