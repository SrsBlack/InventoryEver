-- ============================================================
-- Migration 005: Smart Locations
-- Adds a self-referencing locations table (Room → Area → Spot)
-- and a nullable location_id FK on items.
-- ============================================================

-- ── Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id        UUID REFERENCES locations(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  full_path        TEXT,             -- "Living Room > TV Stand > Bottom Shelf" (trigger-maintained)
  icon_emoji       TEXT NOT NULL DEFAULT '📍',
  color_hex        TEXT NOT NULL DEFAULT '#3B82F6',
  description      TEXT,
  qr_code_token    TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  sort_order       INT NOT NULL DEFAULT 0,
  depth            INT NOT NULL DEFAULT 0 CHECK (depth BETWEEN 0 AND 2),
                   -- 0 = Room, 1 = Area, 2 = Spot
  item_count       INT NOT NULL DEFAULT 0,
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, parent_id, name)
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_locations_workspace
  ON locations (workspace_id);

CREATE INDEX IF NOT EXISTS idx_locations_parent
  ON locations (parent_id);

CREATE INDEX IF NOT EXISTS idx_locations_qr_token
  ON locations (qr_code_token);

CREATE INDEX IF NOT EXISTS idx_locations_workspace_depth
  ON locations (workspace_id, depth);

-- ── FK on items ──────────────────────────────────────────────
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_items_location_id
  ON items (location_id);

-- ── Trigger: maintain full_path ───────────────────────────────
CREATE OR REPLACE FUNCTION update_location_full_path()
RETURNS TRIGGER AS $$
DECLARE
  parent_path TEXT;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.full_path := NEW.name;
  ELSE
    SELECT full_path INTO parent_path
    FROM locations
    WHERE id = NEW.parent_id;
    NEW.full_path := COALESCE(parent_path, '') || ' > ' || NEW.name;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS locations_full_path ON locations;
CREATE TRIGGER locations_full_path
  BEFORE INSERT OR UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_location_full_path();

-- ── Trigger: maintain item_count ─────────────────────────────
CREATE OR REPLACE FUNCTION update_location_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.location_id IS NOT NULL THEN
      UPDATE locations SET item_count = item_count + 1 WHERE id = NEW.location_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Decrement old location
    IF OLD.location_id IS NOT NULL AND OLD.location_id IS DISTINCT FROM NEW.location_id THEN
      UPDATE locations SET item_count = GREATEST(0, item_count - 1) WHERE id = OLD.location_id;
    END IF;
    -- Increment new location
    IF NEW.location_id IS NOT NULL AND NEW.location_id IS DISTINCT FROM OLD.location_id THEN
      UPDATE locations SET item_count = item_count + 1 WHERE id = NEW.location_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.location_id IS NOT NULL THEN
      UPDATE locations SET item_count = GREATEST(0, item_count - 1) WHERE id = OLD.location_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS items_location_count ON items;
CREATE TRIGGER items_location_count
  AFTER INSERT OR UPDATE OR DELETE ON items
  FOR EACH ROW EXECUTE FUNCTION update_location_item_count();

-- ── Trigger: updated_at on locations ─────────────────────────
-- Reuse the existing update_updated_at() function (created in migration 001)
DROP TRIGGER IF EXISTS locations_updated_at ON locations;
CREATE TRIGGER locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Workspace members can read
CREATE POLICY "locations_select" ON locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = locations.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- Editors and above can insert
CREATE POLICY "locations_insert" ON locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = locations.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- Editors and above can update
CREATE POLICY "locations_update" ON locations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = locations.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- Only owners and admins can delete
CREATE POLICY "locations_delete" ON locations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = locations.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- ── Realtime ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE locations;
