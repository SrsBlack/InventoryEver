-- ============================================================
-- InventoryEver - Storage Buckets & Realtime
-- Run AFTER 002_rls_policies.sql
-- ============================================================

-- Enable Realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE workspace_members;

-- Storage bucket for item images
-- Run these in the Supabase Dashboard → Storage, OR via the API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('item-images', 'item-images', true);

-- Storage RLS (if using private bucket, uncomment):
/*
CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'item-images' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can view item images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'item-images');

CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'item-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
*/

-- ============================================================
-- WARRANTY ALERT FUNCTION
-- Schedule via pg_cron or call manually
-- ============================================================
CREATE OR REPLACE FUNCTION generate_warranty_alerts()
RETURNS void AS $$
DECLARE
  item_record RECORD;
BEGIN
  FOR item_record IN
    SELECT i.id, i.workspace_id, i.name, i.warranty_expiry_date, wm.user_id
    FROM items i
    JOIN workspace_members wm ON wm.workspace_id = i.workspace_id AND wm.role IN ('owner', 'admin')
    WHERE i.warranty_expiry_date IS NOT NULL
    AND i.warranty_expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM alerts a
      WHERE a.item_id = i.id
      AND a.alert_type = 'warranty_expiring'
      AND a.resolved_at IS NULL
    )
  LOOP
    INSERT INTO alerts (workspace_id, user_id, item_id, alert_type, title, message)
    VALUES (
      item_record.workspace_id,
      item_record.user_id,
      item_record.id,
      'warranty_expiring',
      'Warranty Expiring Soon',
      item_record.name || ' warranty expires on ' || TO_CHAR(item_record.warranty_expiry_date, 'Mon DD, YYYY')
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
