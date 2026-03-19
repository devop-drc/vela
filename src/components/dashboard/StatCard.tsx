import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    border: "border-l-blue-500",
    icon: "text-blue-500",
    badge: "text-blue-600 bg-blue-50",
  },
  emerald: {
    border: "border-l-emerald-500",
    icon: "text-emerald-500",
    badge: "text-emerald-600 bg-emerald-50",
  },
  violet: {
    border: "border-l-violet-500",
    icon: "text-violet-500",
    badge: "text-violet-600 bg-violet-50",
  },
  amber: {
    border: "border-l-amber-500",
    icon: "text-amber-500",
    badge: "text-amber-600 bg-amber-50",
  },
};

export const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendLabel,
  color = "blue",
}: StatCardProps) => {
  const colors = colorMap[color];

  return (
    <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }}>
      <Card className={cn("border-l-4 overflow-hidden", colors.border)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className={cn("h-4 w-4", colors.icon)} />
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold">{value}</div>
          <div className="flex items-center gap-2 mt-1">
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && trend !== "neutral" && trendLabel && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5",
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
        </CardContent>
      </Card>
    </motion.div>
  );
};
