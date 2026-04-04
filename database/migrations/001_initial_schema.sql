-- ============================================================
-- InventoryEver - Complete Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'business')),
  subscription_status TEXT DEFAULT 'inactive',
  stripe_customer_id TEXT,
  revenuecat_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ============================================================
-- WORKSPACES
-- ============================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  workspace_type TEXT DEFAULT 'personal' CHECK (workspace_type IN ('personal', 'family', 'business')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORKSPACE MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  UNIQUE(workspace_id, user_id)
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  icon_emoji TEXT,
  color_hex TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

-- ============================================================
-- ITEMS (core inventory)
-- ============================================================
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  unit TEXT DEFAULT 'piece',
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  current_value DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  location TEXT,
  location_details TEXT,
  condition TEXT DEFAULT 'excellent' CHECK (condition IN ('new', 'excellent', 'good', 'fair', 'poor', 'damaged')),
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  barcode TEXT,
  qr_code TEXT,
  warranty_expiry_date DATE,
  warranty_provider TEXT,
  receipt_image_url TEXT,
  main_image_url TEXT,
  metadata JSONB DEFAULT '{}',
  ai_confidence_score DECIMAL(3,2),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_workspace ON items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_name_trgm ON items USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_items_purchase_date ON items(purchase_date);
CREATE INDEX IF NOT EXISTS idx_items_warranty_expiry ON items(warranty_expiry_date);
CREATE INDEX IF NOT EXISTS idx_items_location ON items(location);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ============================================================
-- ITEM IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS item_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT DEFAULT 'photo' CHECK (image_type IN ('photo', 'receipt', 'manual', 'other')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_hex TEXT DEFAULT '#6B7280',
  UNIQUE(workspace_id, name)
);

CREATE TABLE IF NOT EXISTS item_tags (
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

-- ============================================================
-- MAINTENANCE LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  performed_at DATE NOT NULL,
  maintenance_type TEXT,
  description TEXT,
  cost DECIMAL(10,2),
  performed_by TEXT,
  next_scheduled_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('warranty_expiring', 'maintenance_due', 'low_stock', 'custom')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_workspace ON alerts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(workspace_id, is_read) WHERE resolved_at IS NULL;

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI PROCESSING QUEUE
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  processing_type TEXT NOT NULL CHECK (processing_type IN ('image_recognition', 'receipt_ocr', 'voice_transcription')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- USAGE TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  items_count INTEGER DEFAULT 0,
  storage_mb INTEGER DEFAULT 0,
  ai_requests INTEGER DEFAULT 0,
  UNIQUE(user_id, month)
);

-- Increment usage helper function
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_month DATE,
  p_field TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, month)
  VALUES (p_user_id, p_month)
  ON CONFLICT (user_id, month) DO NOTHING;

  IF p_field = 'items_count' THEN
    UPDATE usage_tracking SET items_count = items_count + 1
    WHERE user_id = p_user_id AND month = p_month;
  ELSIF p_field = 'ai_requests' THEN
    UPDATE usage_tracking SET ai_requests = ai_requests + 1
    WHERE user_id = p_user_id AND month = p_month;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DEFAULT CATEGORIES (system-wide, workspace_id = NULL)
-- ============================================================
INSERT INTO categories (workspace_id, name, icon_emoji, color_hex) VALUES
(NULL, 'Electronics', '📱', '#3B82F6'),
(NULL, 'Furniture', '🪑', '#8B5CF6'),
(NULL, 'Appliances', '🏠', '#EC4899'),
(NULL, 'Clothing', '👕', '#F59E0B'),
(NULL, 'Tools', '🔧', '#10B981'),
(NULL, 'Sports & Outdoors', '⚽', '#EF4444'),
(NULL, 'Books & Media', '📚', '#6366F1'),
(NULL, 'Kitchen & Dining', '🍽️', '#14B8A6'),
(NULL, 'Office Supplies', '📎', '#6B7280'),
(NULL, 'Vehicles & Parts', '🚗', '#F97316'),
(NULL, 'Jewelry & Accessories', '💍', '#A855F7'),
(NULL, 'Art & Collectibles', '🎨', '#EC4899'),
(NULL, 'Musical Instruments', '🎸', '#8B5CF6'),
(NULL, 'Toys & Games', '🧸', '#F59E0B'),
(NULL, 'Garden & Outdoor', '🌱', '#10B981'),
(NULL, 'Health & Medical', '💊', '#EF4444'),
(NULL, 'Documents & Files', '📁', '#6B7280'),
(NULL, 'Other', '📦', '#9CA3AF')
ON CONFLICT DO NOTHING;
