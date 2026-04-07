// ============================================
// User & Auth Types
// ============================================
export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_tier: 'free' | 'pro' | 'business';
  subscription_status: 'active' | 'inactive';
  stripe_customer_id?: string;
  revenuecat_user_id?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// Workspace Types
// ============================================
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  workspace_type: 'personal' | 'family' | 'business';
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  invited_at: string;
  joined_at?: string;
}

// ============================================
// Category Types
// ============================================
export interface Category {
  id: string;
  workspace_id?: string;
  name: string;
  parent_id?: string;
  icon_emoji?: string;
  color_hex: string;
  created_at: string;
}

// ============================================
// Location Types
// ============================================
export type LocationDepth = 0 | 1 | 2; // 0 = Room, 1 = Area, 2 = Spot

export const LOCATION_DEPTH_LABELS: Record<LocationDepth, string> = {
  0: 'Room',
  1: 'Area',
  2: 'Spot',
};

export interface Location {
  id: string;
  workspace_id: string;
  parent_id?: string;
  name: string;
  full_path?: string;
  icon_emoji: string;
  color_hex: string;
  description?: string;
  qr_code_token: string;
  sort_order: number;
  depth: LocationDepth;
  item_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined / computed
  parent?: Pick<Location, 'id' | 'name' | 'full_path'>;
  children?: Location[];
}

// ============================================
// Item Types
// ============================================
export type ItemCondition = 'new' | 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';

export interface Item {
  id: string;
  workspace_id: string;
  category_id?: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  currency: string;
  location?: string;
  location_details?: string;
  location_id?: string;
  condition: ItemCondition;
  brand?: string;
  model?: string;
  serial_number?: string;
  barcode?: string;
  qr_code?: string;
  warranty_expiry_date?: string;
  warranty_provider?: string;
  receipt_image_url?: string;
  main_image_url?: string;
  metadata?: Record<string, unknown>;
  ai_confidence_score?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
  location_data?: Pick<Location, 'id' | 'name' | 'full_path' | 'icon_emoji' | 'color_hex'>;
  images?: ItemImage[];
  tags?: Tag[];
}

export interface ItemImage {
  id: string;
  item_id: string;
  image_url: string;
  image_type: 'photo' | 'receipt' | 'manual' | 'other';
  sort_order: number;
  created_at: string;
}

// ============================================
// Tag Types
// ============================================
export interface Tag {
  id: string;
  workspace_id: string;
  name: string;
  color_hex: string;
}

// ============================================
// Alert Types
// ============================================
export type AlertType = 'warranty_expiring' | 'maintenance_due' | 'low_stock' | 'custom';

export interface Alert {
  id: string;
  workspace_id: string;
  user_id: string;
  item_id?: string;
  alert_type: AlertType;
  title: string;
  message: string;
  is_read: boolean;
  triggered_at: string;
  resolved_at?: string;
  item?: Pick<Item, 'id' | 'name' | 'main_image_url'>;
}

// ============================================
// Maintenance Log Types
// ============================================
export interface MaintenanceLog {
  id: string;
  item_id: string;
  performed_at: string;
  maintenance_type?: string;
  description?: string;
  cost?: number;
  performed_by?: string;
  next_scheduled_date?: string;
  created_at: string;
}

// ============================================
// AI Types
// ============================================
export interface AIItemSuggestion {
  name: string;
  category: string;
  brand?: string;
  model?: string;
  confidence: number;
  description?: string;
  estimated_value?: number;
}

export interface ReceiptData {
  merchant: string;
  date: string;
  total: number;
  subtotal: number;
  tax: number;
  items: ReceiptItem[];
  payment_method: string;
  receipt_number?: string;
}

export interface ReceiptItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// ============================================
// Subscription Types
// ============================================
export type SubscriptionTier = 'free' | 'pro' | 'business';

export interface TierLimits {
  max_items: number;
  ai_requests_per_month: number;
  max_workspaces: number;
  max_members_per_workspace: number;
  storage_gb: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    max_items: 50,
    ai_requests_per_month: 10,
    max_workspaces: 1,
    max_members_per_workspace: 1,
    storage_gb: 0.5,
  },
  pro: {
    max_items: 1000,
    ai_requests_per_month: 100,
    max_workspaces: 3,
    max_members_per_workspace: 5,
    storage_gb: 5,
  },
  business: {
    max_items: 50000,
    ai_requests_per_month: 10000,
    max_workspaces: 20,
    max_members_per_workspace: 50,
    storage_gb: 100,
  },
};

// ============================================
// Usage Tracking
// ============================================
export interface UsageTracking {
  id: string;
  user_id: string;
  month: string;
  items_count: number;
  storage_mb: number;
  ai_requests: number;
}

// ============================================
// Form Types
// ============================================
export interface AddItemFormData {
  name: string;
  description: string;
  quantity: number;
  unit: string;
  purchase_price: string;
  purchase_date: string;
  location: string;
  location_details: string;
  location_id: string;
  category_id: string;
  brand: string;
  model: string;
  serial_number: string;
  warranty_expiry_date: string;
  warranty_provider: string;
  condition: ItemCondition;
  main_image_url: string;
  receipt_image_url: string;
  tags: string[];
}

// ============================================
// Collections & Smart Lists Types
// ============================================

export type CollectionType = 'manual' | 'smart';

export interface SmartRules {
  search?: string;
  category_id?: string;
  location_id?: string;
  condition?: string;
  tag_ids?: string[];
  min_price?: number;
  max_price?: number;
  purchase_date_from?: string;
  purchase_date_to?: string;
  warranty_status?: string[];
}

export interface Collection {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  icon_emoji: string;
  color_hex: string;
  collection_type: CollectionType;
  smart_rules?: SmartRules;
  item_count: number;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionItem {
  collection_id: string;
  item_id: string;
  sort_order: number;
  added_at: string;
  item?: Item;
}

// ============================================
// Lending Types
// ============================================
export interface BorrowerProfile {
  id: string;
  workspace_id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  total_borrowed: number;
  total_returned: number;
  overdue_count: number;
  created_at: string;
  updated_at: string;
}

export interface LendingRecord {
  id: string;
  workspace_id: string;
  item_id: string;
  borrower_id?: string;
  borrower_name: string;
  borrower_phone?: string;
  borrower_email?: string;
  quantity_lent: number;
  lent_at: string;
  expected_return_date?: string;
  returned_at?: string;
  condition_lent?: string;
  condition_returned?: string;
  notes?: string;
  reminder_sent_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  item?: Pick<Item, 'id' | 'name' | 'main_image_url' | 'condition'>;
  borrower?: BorrowerProfile;
}

// ============================================
// Search/Filter Types
// ============================================
export type WarrantyStatus = 'valid' | 'expiring' | 'expired' | 'none';

export interface ItemFilters {
  search?: string;
  category_id?: string;
  location?: string;
  location_id?: string;
  condition?: ItemCondition;
  tag_ids?: string[];
  min_price?: number;
  max_price?: number;
  purchase_date_from?: string;
  purchase_date_to?: string;
  warranty_status?: WarrantyStatus[];
  sort_by?: 'name' | 'created_at' | 'purchase_date' | 'purchase_price' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}
