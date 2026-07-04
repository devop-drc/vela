/**
 * Paywall gate for dashboard routes. Locked accounts (trial over, payment
 * failed, canceled, or never added a card) are routed to /billing — which
 * lives OUTSIDE this guard so it stays reachable.
 *
 * Resilience: if the subscription check hangs (e.g. a transient auth 504),
 * we fail OPEN after a short grace period instead of blanking the dashboard —
 * consistent with the "no subscription row fails open" philosophy. The lock
 * still applies as soon as the check resolves.
 */
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";

const GRACE_MS = 4000;

const SubscriptionGuard = () => {
  const { loading, isLocked } = useSubscription();
  const [graceOver, setGraceOver] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGraceOver(true), GRACE_MS);
    return () => clearTimeout(t);
  }, []);

  if (loading && !graceOver) return null; // route chunk renders as soon as the sub loads
  if (!loading && isLocked) return <Navigate to="/billing" replace />;
  return <Outlet />;
};

export default SubscriptionGuard;
