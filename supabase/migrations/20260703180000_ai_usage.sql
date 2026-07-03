-- Per-user AI usage ledger. Written by edge functions (service role) after
-- each Gemini call; read by admin-api for per-client cost stats. No client
-- access at all — RLS on with no policies.

create table if not exists public.ai_usage (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  function_name text not null,          -- e.g. 'ai-product-classifier'
  model         text not null,          -- e.g. 'gemini-2.5-flash'
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd      numeric(10, 6) not null default 0,
  created_at    timestamptz default now()
);

create index if not exists idx_ai_usage_user on public.ai_usage(user_id, created_at desc);

alter table public.ai_usage enable row level security;
-- Intentionally no policies: only the service role reads/writes.
