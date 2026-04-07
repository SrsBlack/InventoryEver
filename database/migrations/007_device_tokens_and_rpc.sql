-- ============================================================
-- Migration 007: Device Tokens & Usage Tracking RPC
-- ============================================================

-- ── device_tokens ─────────────────────────────────────────────────────────────
-- Stores push notification tokens per user/device.
-- Referenced by lib/notifications.ts via supabase.from('device_tokens').

CREATE TABLE IF NOT EXISTS device_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL,
  platform    TEXT        NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens (user_id);

-- Trigger: keep updated_at current
CREATE OR REPLACE FUNCTION update_device_token_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS device_tokens_updated_at ON device_tokens;
CREATE TRIGGER device_tokens_updated_at
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW EXECUTE FUNCTION update_device_token_updated_at();

-- ── RLS: device_tokens ────────────────────────────────────────────────────────

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read their own tokens
CREATE POLICY "device_tokens_select" ON device_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Users can register their own tokens
CREATE POLICY "device_tokens_insert" ON device_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens (e.g. refresh)
CREATE POLICY "device_tokens_update" ON device_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can remove their own tokens (e.g. on logout)
CREATE POLICY "device_tokens_delete" ON device_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- ── RLS: usage_tracking INSERT policy ────────────────────────────────────────
-- The usage_tracking table was created in 001_initial_schema.sql.
-- The increment_usage function (SECURITY DEFINER) handles inserts on behalf of
-- users, but this policy is also needed when the table is queried directly.

ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own usage rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'usage_tracking' AND policyname = 'usage_tracking_select'
  ) THEN
    CREATE POLICY "usage_tracking_select" ON usage_tracking
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Allow users to insert their own usage rows (also covered by SECURITY DEFINER
-- function, but required for direct client inserts if any)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'usage_tracking' AND policyname = 'usage_tracking_insert'
  ) THEN
    CREATE POLICY "usage_tracking_insert" ON usage_tracking
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── increment_usage RPC ───────────────────────────────────────────────────────
-- Called by hooks/useSubscription.ts:
--   supabase.rpc('increment_usage', {
--     p_user_id: userId,
--     p_month:   month,   -- 'YYYY-MM-01' (cast to DATE internally)
--     p_field:   type,    -- 'items_count' | 'ai_requests'
--   })
--
-- SECURITY DEFINER so the function can write to usage_tracking regardless of
-- the calling user's RLS context.

CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id  UUID,
  p_month    DATE,
  p_field    TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Ensure a row exists for this user/month, then increment the requested field.
  -- ON CONFLICT targets the UNIQUE(user_id, month) constraint defined in 001.
  IF p_field = 'items_count' THEN
    INSERT INTO usage_tracking (user_id, month, items_count)
    VALUES (p_user_id, p_month, 1)
    ON CONFLICT (user_id, month)
    DO UPDATE SET items_count = usage_tracking.items_count + 1;

  ELSIF p_field = 'ai_requests' THEN
    INSERT INTO usage_tracking (user_id, month, ai_requests)
    VALUES (p_user_id, p_month, 1)
    ON CONFLICT (user_id, month)
    DO UPDATE SET ai_requests = usage_tracking.ai_requests + 1;

  -- Silently ignore unknown field names to avoid breaking callers on schema
  -- changes; add ELSE RAISE if strict validation is preferred.
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
