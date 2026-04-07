-- ============================================================
-- InventoryEver - Row Level Security Policies
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_processing_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- WORKSPACES
-- ============================================================
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
CREATE POLICY "workspaces_select" ON workspaces
  FOR SELECT USING (
    auth.uid() = owner_id OR
    auth.uid() IN (
      SELECT user_id FROM workspace_members WHERE workspace_id = id
    )
  );

DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
CREATE POLICY "workspaces_insert" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
CREATE POLICY "workspaces_update" ON workspaces
  FOR UPDATE USING (
    auth.uid() = owner_id OR
    auth.uid() IN (
      SELECT user_id FROM workspace_members
      WHERE workspace_id = id AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;
CREATE POLICY "workspaces_delete" ON workspaces
  FOR DELETE USING (auth.uid() = owner_id);

-- ============================================================
-- WORKSPACE MEMBERS
-- ============================================================
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
CREATE POLICY "workspace_members_select" ON workspace_members
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT user_id FROM workspace_members wm2
      WHERE wm2.workspace_id = workspace_id AND wm2.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
CREATE POLICY "workspace_members_insert" ON workspace_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT owner_id FROM workspaces WHERE id = workspace_id
    )
  );

DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;
CREATE POLICY "workspace_members_delete" ON workspace_members
  FOR DELETE USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT owner_id FROM workspaces WHERE id = workspace_id
    )
  );

-- ============================================================
-- CATEGORIES
-- ============================================================
DROP POLICY IF EXISTS "categories_select" ON categories;
CREATE POLICY "categories_select" ON categories
  FOR SELECT USING (
    workspace_id IS NULL OR
    auth.uid() IN (
      SELECT user_id FROM workspace_members WHERE workspace_id = categories.workspace_id
    )
  );

DROP POLICY IF EXISTS "categories_insert" ON categories;
CREATE POLICY "categories_insert" ON categories
  FOR INSERT WITH CHECK (
    workspace_id IS NOT NULL AND
    auth.uid() IN (
      SELECT user_id FROM workspace_members
      WHERE workspace_id = categories.workspace_id AND role IN ('owner', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "categories_update" ON categories;
CREATE POLICY "categories_update" ON categories
  FOR UPDATE USING (
    workspace_id IS NOT NULL AND
    auth.uid() IN (
      SELECT user_id FROM workspace_members
      WHERE workspace_id = categories.workspace_id AND role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- ITEMS
-- ============================================================
DROP POLICY IF EXISTS "items_select" ON items;
CREATE POLICY "items_select" ON items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = items.workspace_id AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "items_insert" ON items;
CREATE POLICY "items_insert" ON items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = items.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "items_update" ON items;
CREATE POLICY "items_update" ON items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = items.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "items_delete" ON items;
CREATE POLICY "items_delete" ON items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = items.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- ============================================================
-- ITEM IMAGES (inherits from items)
-- ============================================================
DROP POLICY IF EXISTS "item_images_select" ON item_images;
CREATE POLICY "item_images_select" ON item_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN workspace_members wm ON wm.workspace_id = i.workspace_id
      WHERE i.id = item_images.item_id AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "item_images_insert" ON item_images;
CREATE POLICY "item_images_insert" ON item_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM items i
      JOIN workspace_members wm ON wm.workspace_id = i.workspace_id
      WHERE i.id = item_images.item_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "item_images_delete" ON item_images;
CREATE POLICY "item_images_delete" ON item_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN workspace_members wm ON wm.workspace_id = i.workspace_id
      WHERE i.id = item_images.item_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- ============================================================
-- TAGS
-- ============================================================
DROP POLICY IF EXISTS "tags_select" ON tags;
CREATE POLICY "tags_select" ON tags
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM workspace_members WHERE workspace_id = tags.workspace_id
    )
  );

DROP POLICY IF EXISTS "tags_insert" ON tags;
CREATE POLICY "tags_insert" ON tags
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM workspace_members
      WHERE workspace_id = tags.workspace_id AND role IN ('owner', 'admin', 'editor')
    )
  );

-- ============================================================
-- ITEM TAGS
-- ============================================================
DROP POLICY IF EXISTS "item_tags_select" ON item_tags;
CREATE POLICY "item_tags_select" ON item_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN workspace_members wm ON wm.workspace_id = i.workspace_id
      WHERE i.id = item_tags.item_id AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "item_tags_insert" ON item_tags;
CREATE POLICY "item_tags_insert" ON item_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM items i
      JOIN workspace_members wm ON wm.workspace_id = i.workspace_id
      WHERE i.id = item_tags.item_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- ============================================================
-- MAINTENANCE LOGS
-- ============================================================
DROP POLICY IF EXISTS "maintenance_logs_select" ON maintenance_logs;
CREATE POLICY "maintenance_logs_select" ON maintenance_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN workspace_members wm ON wm.workspace_id = i.workspace_id
      WHERE i.id = maintenance_logs.item_id AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "maintenance_logs_insert" ON maintenance_logs;
CREATE POLICY "maintenance_logs_insert" ON maintenance_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM items i
      JOIN workspace_members wm ON wm.workspace_id = i.workspace_id
      WHERE i.id = maintenance_logs.item_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- ============================================================
-- ALERTS
-- ============================================================
DROP POLICY IF EXISTS "alerts_select" ON alerts;
CREATE POLICY "alerts_select" ON alerts
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = alerts.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "alerts_update" ON alerts;
CREATE POLICY "alerts_update" ON alerts
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = alerts.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "alerts_insert" ON alerts;
CREATE POLICY "alerts_insert" ON alerts
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = alerts.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- ============================================================
-- USAGE TRACKING
-- ============================================================
DROP POLICY IF EXISTS "usage_tracking_select" ON usage_tracking;
CREATE POLICY "usage_tracking_select" ON usage_tracking
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- AUDIT LOGS (admin-only)
-- ============================================================
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = audit_logs.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );
