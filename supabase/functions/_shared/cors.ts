// Shared CORS headers for all edge functions. Previously copy-pasted into every
// function — import from here instead.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
