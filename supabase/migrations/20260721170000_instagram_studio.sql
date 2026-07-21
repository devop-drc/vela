-- Instagram Studio: per-merchant template + caption-style preferences used
-- when publishing products to Instagram.
CREATE TABLE IF NOT EXISTS public.instagram_studio_settings (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_studio_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their studio settings" ON public.instagram_studio_settings;
CREATE POLICY "Owners manage their studio settings"
  ON public.instagram_studio_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
