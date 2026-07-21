-- Async Remotion video generation: the app enqueues jobs, a Node worker
-- (scripts/video-render-worker.mjs — Remotion needs Node+Chromium, which
-- edge functions can't run) claims them, renders ProductPromo, uploads the
-- MP4 to storage and marks the row done. The UI subscribes/polls by id.
CREATE TABLE IF NOT EXISTS public.video_render_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    format text NOT NULL DEFAULT 'reel' CHECK (format IN ('post', 'story', 'reel')),
    template text NOT NULL DEFAULT 'gradient',
    props jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'rendering', 'done', 'failed')),
    output_url text,
    error text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS video_render_jobs_status_idx ON public.video_render_jobs (status, created_at);

ALTER TABLE public.video_render_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage their render jobs" ON public.video_render_jobs;
CREATE POLICY "Owners manage their render jobs"
  ON public.video_render_jobs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
