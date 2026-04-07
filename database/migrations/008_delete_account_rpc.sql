-- ============================================================
-- Migration 008: delete_account RPC
-- ============================================================
-- Allows an authenticated user to permanently delete their own
-- account via supabase.rpc('delete_account').
--
-- Execution order:
--   1. Delete workspace memberships where the user is NOT the owner.
--   2. Delete items in workspaces owned by the user.
--   3. Delete workspaces owned by the user (cascades to members/items).
--   4. Delete the profile row.
--   5. Delete the auth.users row — this signs the user out everywhere.
--
-- SECURITY DEFINER so the function runs with the permissions of the
-- function owner (postgres superuser) regardless of RLS policies.
-- The check `auth.uid() = p_user_id` inside the body ensures only
-- the calling user can delete their own account.

CREATE OR REPLACE FUNCTION delete_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Identify the caller
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Remove the user from workspaces they do NOT own (viewer/editor/admin roles)
  DELETE FROM workspace_members
  WHERE user_id = v_user_id
    AND workspace_id NOT IN (
      SELECT id FROM workspaces WHERE owner_id = v_user_id
    );

  -- 2. Delete items in workspaces owned by the user
  DELETE FROM items
  WHERE workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = v_user_id
  );

  -- 3. Delete workspaces owned by the user
  --    (cascades to workspace_members rows for those workspaces)
  DELETE FROM workspaces WHERE owner_id = v_user_id;

  -- 4. Delete the profile
  DELETE FROM profiles WHERE id = v_user_id;

  -- 5. Delete the auth user record — this invalidates all sessions
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;
