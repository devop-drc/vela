import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandButton } from "@/components/BrandButton";
import { CheckCircle2, Instagram, Package, Share2, ArrowRight } from "lucide-react";
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
  const { t } = useTranslation();
  const steps = [
    {
      done: hasIntegration,
      icon: Instagram,
      title: t('get_started.connect_title'),
      desc: t('get_started.connect_desc'),
      action: !hasIntegration ? { label: t('get_started.connect_action'), onClick: onConnect } : null,
    },
    {
      done: hasProducts,
      icon: Package,
      title: t('get_started.products_title'),
      desc: t('get_started.products_desc'),
      action: !hasProducts ? { label: t('get_started.products_action'), onClick: onAddProducts } : null,
    },
    {
      done: false,
      icon: Share2,
      title: t('get_started.share_title'),
      desc: t('get_started.share_desc'),
      action: canShare ? { label: t('get_started.share_action'), onClick: onShare } : null,
    },
  ];

  const nextIndex = steps.findIndex((s) => !s.done);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <img src="/vela-icon.svg" alt="Vela" className="h-6 w-6 rounded-md ring-1 ring-border" />
          <h2 className="text-lg font-semibold">{t('get_started.title')}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{t('get_started.subtitle')}</p>

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
                  isNext ? (
                    <BrandButton size="sm" className="flex-shrink-0 rounded-full" onClick={step.action.onClick}>
                      {step.action.label}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </BrandButton>
                  ) : (
                    <Button size="sm" variant="outline" className="flex-shrink-0" onClick={step.action.onClick}>
                      {step.action.label}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  )
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
