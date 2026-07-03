import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Instagram, Package, Share2, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface GetStartedCardProps {
  hasIntegration: boolean;
  hasProducts: boolean;
  onConnect: () => void;
  onAddProducts: () => void;
  onShare: () => void;
  canShare: boolean;
}

export const GetStartedCard = ({ hasIntegration, hasProducts, onConnect, onAddProducts, onShare, canShare }: GetStartedCardProps) => {
  const steps = [
    {
      done: hasIntegration,
      icon: Instagram,
      title: "Connect your Instagram",
      desc: "Link your Instagram Business account so we can turn your posts into products.",
      action: !hasIntegration ? { label: "Connect", onClick: onConnect } : null,
    },
    {
      done: hasProducts,
      icon: Package,
      title: "Add your products",
      desc: "Import them from Instagram, or add a product by hand.",
      action: !hasProducts ? { label: "Add products", onClick: onAddProducts } : null,
    },
    {
      done: false,
      icon: Share2,
      title: "Share your shop",
      desc: "Copy your shop link and send it to your customers.",
      action: canShare ? { label: "Copy link", onClick: onShare } : null,
    },
  ];

  const nextIndex = steps.findIndex((s) => !s.done);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Let's set up your shop</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">A few quick steps and you'll be ready to sell.</p>

        <div className="space-y-2.5">
          {steps.map((step, i) => {
            const isNext = i === nextIndex;
            return (
              <div
                key={step.title}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                  step.done ? "bg-muted/40 border-border" : isNext ? "bg-card border-primary/40 shadow-sm" : "bg-card/60 border-border"
                )}
              >
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0", step.done ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary")}>
                  {step.done ? <CheckCircle2 className="h-5 w-5" /> : <step.icon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", step.done && "text-muted-foreground line-through")}>{step.title}</p>
                  {!step.done && <p className="text-xs text-muted-foreground">{step.desc}</p>}
                </div>
                {step.action && (
                  <Button size="sm" variant={isNext ? "default" : "outline"} className="flex-shrink-0" onClick={step.action.onClick}>
                    {step.action.label}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
