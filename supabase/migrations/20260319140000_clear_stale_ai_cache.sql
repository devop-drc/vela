-- Clear stale AI analysis cache so posts get re-analyzed with the improved prompt
-- This is safe — posts will be re-analyzed on next sync
TRUNCATE TABLE public.ai_analysis_cache;
