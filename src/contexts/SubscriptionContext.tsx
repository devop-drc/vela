/**
 * Owner-facing SaaS subscription state. Reads the user's subscription row +
 * the public plans table; exposes entitlement helpers used by the paywall
 * guard, the billing page, and feature gating.
 */
import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isDemoFrame } from "@/lib/isDemoFrame";

export interface Plan {
  id: string;
  name: string;
  price_all: number;
  annual_free_months: number;
  features: string[];
  product_limit: number | null;
  display_order: number;
}

export interface Subscription {
  id: string;
  plan_id: string;
  status: "incomplete" | "trialing" | "active" | "past_due" | "canceled" | "expired";
  billing_cycle: "monthly" | "annual";
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface Ctx {
  loading: boolean;
  subscription: Subscription | null;
  plan: Plan | null;
  plans: Plan[];
  /** trialing (not expired) or active — full app access */
  isActive: boolean;
  /** hard paywall: incomplete / past_due / canceled / expired / trial ran out */
  isLocked: boolean;
  trialDaysLeft: number | null;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<Ctx | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  // User id comes from the shared AuthProvider (resolved once, tracks auth
  // changes) — no more per-context getSession() + onAuthStateChange waterfall.
  const { userId } = useAuth();
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  const refresh = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    const [subRes, plansRes] = await Promise.all([
      supabase.from("subscriptions").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("plans").select("*").eq("is_active", true).order("display_order"),
    ]);
    if (!subRes.error) setSubscription((subRes.data as Subscription) ?? null);
    if (!plansRes.error && plansRes.data) setPlans(plansRes.data as Plan[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isDemoFrame()) { setLoading(false); return; } // demo/preview iframes run on mock data
    refresh();
  }, [refresh, userId]);

  const now = Date.now();
  const trialEnds = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at).getTime() : null;
  const trialValid = subscription?.status === "trialing" && trialEnds != null && trialEnds > now;
  const isActive = subscription?.status === "active" || trialValid;
  // No subscription row (pre-migration DB) fails open so we never brick the app.
  const isLocked = !!subscription && !isActive;
  const trialDaysLeft = trialValid && trialEnds ? Math.max(0, Math.ceil((trialEnds - now) / 86400000)) : null;
  const plan = plans.find((p) => p.id === subscription?.plan_id) ?? null;

  return (
    <SubscriptionContext.Provider value={{ loading, subscription, plan, plans, isActive, isLocked, trialDaysLeft, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
};
