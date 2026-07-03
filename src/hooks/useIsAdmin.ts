import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Reads the caller's own user_roles row (RLS allows exactly that). */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { if (!cancelled) setLoading(false); return; }
      const { data } = await supabase.from("user_roles")
        .select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      if (!cancelled) { setIsAdmin(!!data); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);
  return { isAdmin, loading };
}
