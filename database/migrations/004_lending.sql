-- ============================================================
-- Migration 004: Lending & Borrowing Tracker
-- ============================================================

-- Borrower profiles (reusable contacts across multiple lending records)
CREATE TABLE IF NOT EXISTS borrower_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  total_borrowed INT NOT NULL DEFAULT 0,
  total_returned INT NOT NULL DEFAULT 0,
  overdue_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lending records
CREATE TABLE IF NOT EXISTS lending_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  borrower_id UUID REFERENCES borrower_profiles(id) ON DELETE SET NULL,
  -- Denormalised borrower snapshot (in case borrower_profiles is later deleted)
  borrower_name TEXT NOT NULL,
  borrower_phone TEXT,
  borrower_email TEXT,
  quantity_lent INT NOT NULL DEFAULT 1,
  lent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_return_date DATE,
  returned_at TIMESTAMPTZ,
  condition_lent TEXT,           -- item condition when lent
  condition_returned TEXT,       -- item condition when returned
  notes TEXT,
  reminder_sent_at TIMESTAMPTZ,  -- last time a reminder push was sent
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lending_workspace ON lending_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lending_item ON lending_records(item_id);
CREATE INDEX IF NOT EXISTS idx_lending_active ON lending_records(workspace_id) WHERE returned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lending_overdue ON lending_records(expected_return_date) WHERE returned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_borrower_workspace ON borrower_profiles(workspace_id);

-- updated_at triggers
CREATE TRIGGER set_lending_records_updated_at
  BEFORE UPDATE ON lending_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_borrower_profiles_updated_at
  BEFORE UPDATE ON borrower_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS Policies ─────────────────────────────────────────────────────────────

ALTER TABLE lending_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_profiles ENABLE ROW LEVEL SECURITY;

-- Lending records: workspace members can access
CREATE POLICY "Workspace members can read lending records"
  ON lending_records FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert lending records"
  ON lending_records FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
    OR workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update lending records"
  ON lending_records FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
    OR workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete lending records"
  ON lending_records FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
    OR workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Borrower profiles: workspace-scoped
CREATE POLICY "Workspace members can read borrower profiles"
  ON borrower_profiles FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage borrower profiles"
  ON borrower_profiles FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
    OR workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Enable realtime for lending_records
ALTER PUBLICATION supabase_realtime ADD TABLE lending_records;
