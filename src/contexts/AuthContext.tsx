/**
 * AuthProvider — resolves the session, user, and the merchant's `businessId`
 * ONCE for the whole app, instead of every page/hook doing its own
 * `getSession()` → `from('businesses').eq('user_id', …).single()` waterfall.
 *
 * - `session`/`user`/`userId` come from `getSession()` (instant, reads local
 *   storage) and stay fresh via `onAuthStateChange`.
 * - `businessId` is resolved once and cached in localStorage per-user, so it
 *   hydrates instantly on the next load and revalidates in the background.
 * - `ensureBusinessId()` lets callers await the in-flight lookup when they need
 *   the id before it has resolved.
 *
 * Consumers should prefer `useAuth()` over ad-hoc auth/business queries.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  userId: string | null;
  businessId: string | null;
  /** true until the initial session check resolves. */
  loading: boolean;
  /** true while the business id is being (re)resolved for a logged-in user. */
  businessLoading: boolean;
  /** Resolve the business id, awaiting the in-flight lookup if needed. */
  ensureBusinessId: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const bizKey = (uid: string) => `vela:businessId:v1:${uid}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessLoading, setBusinessLoading] = useState(false);
  const bizPromise = useRef<Promise<string | null> | null>(null);
  const bizUserRef = useRef<string | null>(null);

  const userId = session?.user?.id ?? null;

  /** Resolve businessId for a user: instant from cache, then revalidate. */
  const resolveBusiness = (uid: string): Promise<string | null> => {
    if (bizUserRef.current === uid && bizPromise.current) return bizPromise.current;
    bizUserRef.current = uid;
    try {
      const cached = localStorage.getItem(bizKey(uid));
      if (cached) setBusinessId(cached);
    } catch {
      /* private mode */
    }
    const p = (async () => {
      setBusinessLoading(true);
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", uid)
          .single();
        if (error || !data) return null;
        setBusinessId(data.id);
        try {
          localStorage.setItem(bizKey(uid), data.id);
        } catch {
          /* ignore */
        }
        return data.id as string;
      } finally {
        setBusinessLoading(false);
      }
    })();
    bizPromise.current = p;
    return p;
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
      if (data.session?.user) resolveBusiness(data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s ?? null);
      if (s?.user) {
        resolveBusiness(s.user.id);
      } else {
        setBusinessId(null);
        bizPromise.current = null;
        bizUserRef.current = null;
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureBusinessId = async (): Promise<string | null> => {
    if (businessId) return businessId;
    if (bizPromise.current) return bizPromise.current;
    if (userId) return resolveBusiness(userId);
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        userId,
        businessId,
        loading,
        businessLoading,
        ensureBusinessId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
