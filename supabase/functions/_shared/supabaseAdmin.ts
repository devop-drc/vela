import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Memoized service-role client. Edge isolates are reused across requests, so a
// module-level singleton avoids re-creating the client (and its fetch plumbing)
// on every invocation.
let _client: SupabaseClient | null = null;

export const getSupabaseAdmin = (): SupabaseClient => {
  if (!_client) {
    _client = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );
  }
  return _client;
};
