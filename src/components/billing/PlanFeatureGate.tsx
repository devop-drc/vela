import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crown, Sparkle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';

// Ordered plan tiers — a higher tier includes everything below it. Legacy
// plan ids ('free') and unknown plans fall back to the lowest tier.
const TIER_ORDER: Record<string, number> = { free: 0, starter: 0, pro: 1, business: 2 };

export const planTier = (planId?: string | null): number => TIER_ORDER[planId || ''] ?? 0;

/**
 * Gates a feature behind a minimum plan tier. While the subscription is still
 * loading it renders the children (no flash of the upsell for paying users);
 * entitlement is enforced server-side regardless.
 */
export const PlanFeatureGate = ({
  minTier,
  planName,
  title,
  body,
  bullets,
  children,
}: {
  minTier: 'pro' | 'business';
  planName: string;
  title: string;
  body: string;
  bullets: string[];
  children: ReactNode;
}) => {
  const { plan, loading } = useSubscription();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (loading || planTier(plan?.id) >= planTier(minTier)) return <>{children}</>;

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
        <Crown className="h-7 w-7" />
      </div>
      <h2 className="font-heading text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      <ul className="mx-auto mt-5 grid max-w-sm gap-2 text-left text-sm">
        {bullets.map((f) => (
          <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />{f}</li>
        ))}
      </ul>
      <Button className="mt-6 brand-gradient border-0 text-white" onClick={() => navigate('/billing')}>
        <Sparkle className="mr-1.5 h-4 w-4" /> {t('planGate.cta', { plan: planName })}
      </Button>
    </div>
  );
};
