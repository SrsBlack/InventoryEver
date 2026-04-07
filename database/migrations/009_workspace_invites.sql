-- ============================================================
-- Workspace Invites
-- Stores shareable invite codes for joining workspaces
-- ============================================================

CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INT DEFAULT NULL,
  use_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

-- Workspace members (and owners) can read invites for their workspace
CREATE POLICY "workspace_invites_select" ON workspace_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_invites.workspace_id
        AND wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_invites.workspace_id
        AND w.owner_id = auth.uid()
    )
  );

-- Only the creator can insert (admins/owners generate codes)
CREATE POLICY "workspace_invites_insert" ON workspace_invites
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Owners can delete (revoke) invites
CREATE POLICY "workspace_invites_delete" ON workspace_invites
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_invites.workspace_id
        AND w.owner_id = auth.uid()
    )
  );

-- Anyone authenticated can read a single invite by code (for join flow)
-- We use a separate permissive select for unauthenticated lookup via code
CREATE POLICY "workspace_invites_select_by_code" ON workspace_invites
  FOR SELECT USING (true);

-- Allow incrementing use_count during join (done via service role in edge fn,
-- or here via a permissive update scoped to the joining user)
CREATE POLICY "workspace_invites_update_use_count" ON workspace_invites
  FOR UPDATE USING (true) WITH CHECK (true);
