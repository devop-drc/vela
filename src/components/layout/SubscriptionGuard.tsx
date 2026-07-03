/**
 * Paywall gate for dashboard routes. Locked accounts (trial over, payment
 * failed, canceled, or never added a card) are routed to /billing — which
 * lives OUTSIDE this guard so it stays reachable.
 */
import { Navigate, Outlet } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";

const SubscriptionGuard = () => {
  const { loading, isLocked } = useSubscription();
  if (loading) return null; // route chunk renders as soon as the sub loads
  if (isLocked) return <Navigate to="/billing" replace />;
  return <Outlet />;
};

export default SubscriptionGuard;
