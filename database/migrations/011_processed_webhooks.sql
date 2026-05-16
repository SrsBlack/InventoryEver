-- Migration: 011_processed_webhooks
-- FIX(audit-2026-05-09 #I-followup) — idempotency table for the
-- handle-revenuecat-webhook edge function.
-- Generated offline. Apply via `supabase db push` or manual psql.

create table public.processed_webhooks (
  event_id     text primary key,
  processed_at timestamptz not null default now()
);

-- Old rows are harmless but unnecessary — trim after 90 days.
-- Run periodically via pg_cron or external scheduler:
--   delete from public.processed_webhooks where processed_at < now() - interval '90 days';

-- No RLS — only the service-role webhook function writes here.
-- Defence in depth: revoke from anon and authenticated explicitly.
revoke all on public.processed_webhooks from anon, authenticated;
