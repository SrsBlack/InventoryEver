-- ============================================================
-- Migration 006: Collections & Smart Lists
-- ============================================================

-- Collections table: both manual (curated) and smart (rule-based) lists
CREATE TABLE IF NOT EXISTS collections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  icon_emoji      TEXT NOT NULL DEFAULT '📚',
  color_hex       TEXT NOT NULL DEFAULT '#8B5CF6',
  collection_type TEXT NOT NULL DEFAULT 'manual' CHECK (collection_type IN ('manual', 'smart')),
  -- For smart collections: stores ItemFilters-compatible JSON
  -- e.g. {"category_id":"uuid","max_price":500,"condition":"fair","warranty_status":["expiring"]}
  smart_rules     JSONB,
  item_count      INT NOT NULL DEFAULT 0,
  sort_order      INT NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, name)
);

-- Join table for manual collections
CREATE TABLE IF NOT EXISTS collection_items (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  sort_order    INT NOT NULL DEFAULT 0,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection_id, item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collections_workspace ON collections (workspace_id);
CREATE INDEX IF NOT EXISTS idx_collections_type ON collections (workspace_id, collection_type);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items (collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_item ON collection_items (item_id);

-- ── Trigger: maintain updated_at ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_collection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS collections_updated_at ON collections;
CREATE TRIGGER collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_collection_updated_at();

-- ── Trigger: maintain item_count for manual collections ───────────────────────

CREATE OR REPLACE FUNCTION update_collection_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE collections
    SET item_count = item_count + 1,
        updated_at = NOW()
    WHERE id = NEW.collection_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE collections
    SET item_count = GREATEST(0, item_count - 1),
        updated_at = NOW()
    WHERE id = OLD.collection_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS collection_items_count ON collection_items;
CREATE TRIGGER collection_items_count
  AFTER INSERT OR DELETE ON collection_items
  FOR EACH ROW EXECUTE FUNCTION update_collection_item_count();

-- ── RLS Policies ─────────────────────────────────────────────────────────────

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

-- Collections: SELECT (all workspace members)
CREATE POLICY "collections_select" ON collections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = collections.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- Collections: INSERT (editors and above)
CREATE POLICY "collections_insert" ON collections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = collections.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- Collections: UPDATE (editors and above)
CREATE POLICY "collections_update" ON collections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = collections.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- Collections: DELETE (owners and admins)
CREATE POLICY "collections_delete" ON collections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = collections.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- Collection Items: SELECT (all workspace members via collection)
CREATE POLICY "collection_items_select" ON collection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM collections c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = collection_items.collection_id
        AND wm.user_id = auth.uid()
    )
  );

-- Collection Items: INSERT (editors and above via collection)
CREATE POLICY "collection_items_insert" ON collection_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = collection_items.collection_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- Collection Items: DELETE (editors and above via collection)
CREATE POLICY "collection_items_delete" ON collection_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM collections c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = collection_items.collection_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- ── Realtime ─────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE collections;
ALTER PUBLICATION supabase_realtime ADD TABLE collection_items;
