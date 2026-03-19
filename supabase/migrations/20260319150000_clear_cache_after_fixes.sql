-- Clear AI analysis cache after pipeline fixes
-- Posts will be re-analyzed with validated AI responses
TRUNCATE TABLE public.ai_analysis_cache;
