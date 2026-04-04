import { Ionicons } from '@expo/vector-icons';

// Icon component type helper
export type IconName = keyof typeof Ionicons.glyphMap;

// Tab bar icons
export const TabIcons = {
  home: 'home' as IconName,
  homeOutline: 'home-outline' as IconName,
  inventory: 'cube' as IconName,
  inventoryOutline: 'cube-outline' as IconName,
  add: 'add' as IconName,
  alerts: 'notifications' as IconName,
  alertsOutline: 'notifications-outline' as IconName,
  profile: 'person' as IconName,
  profileOutline: 'person-outline' as IconName,
};

// Quick action icons
export const ActionIcons = {
  camera: 'camera' as IconName,
  gallery: 'images' as IconName,
  receipt: 'receipt' as IconName,
  manual: 'create' as IconName,
  voice: 'mic' as IconName,
  search: 'search' as IconName,
  filter: 'options' as IconName,
  settings: 'settings' as IconName,
  edit: 'pencil' as IconName,
  delete: 'trash' as IconName,
  close: 'close' as IconName,
  check: 'checkmark' as IconName,
  back: 'chevron-back' as IconName,
  forward: 'chevron-forward' as IconName,
  add: 'add-circle' as IconName,
  share: 'share-outline' as IconName,
  export: 'download-outline' as IconName,
};

// Item-related icons
export const ItemIcons = {
  location: 'location' as IconName,
  calendar: 'calendar' as IconName,
  price: 'pricetag' as IconName,
  quantity: 'layers' as IconName,
  warranty: 'shield-checkmark' as IconName,
  maintenance: 'build' as IconName,
  barcode: 'barcode' as IconName,
  tag: 'pricetags' as IconName,
  image: 'image' as IconName,
  list: 'list' as IconName,
  grid: 'grid' as IconName,
};

// Alert type icons
export const AlertIcons = {
  warranty_expiring: 'shield' as IconName,
  maintenance_due: 'build' as IconName,
  low_stock: 'trending-down' as IconName,
  custom: 'alert-circle' as IconName,
};

// Category icons (using Ionicons names)
export const CategoryIcons: Record<string, IconName> = {
  'Electronics': 'laptop' as IconName,
  'Furniture': 'bed' as IconName,
  'Appliances': 'tv' as IconName,
  'Clothing': 'shirt' as IconName,
  'Tools': 'hammer' as IconName,
  'Sports': 'football' as IconName,
  'Books': 'book' as IconName,
  'Kitchen': 'restaurant' as IconName,
  'Office': 'briefcase' as IconName,
  'Vehicles': 'car' as IconName,
  'Jewelry': 'diamond' as IconName,
  'Art': 'color-palette' as IconName,
  'Garden': 'leaf' as IconName,
  'Toys': 'game-controller' as IconName,
  'Music': 'musical-notes' as IconName,
  'Health': 'medkit' as IconName,
  'Pets': 'paw' as IconName,
  'Other': 'ellipsis-horizontal' as IconName,
};

// Condition icons
export const ConditionIcons: Record<string, IconName> = {
  'new': 'sparkles' as IconName,
  'excellent': 'star' as IconName,
  'good': 'thumbs-up' as IconName,
  'fair': 'remove-circle' as IconName,
  'poor': 'warning' as IconName,
  'damaged': 'heart-dislike' as IconName,
};

// Profile/Settings icons
export const SettingsIcons = {
  notification: 'notifications' as IconName,
  privacy: 'lock-closed' as IconName,
  exportData: 'cloud-download' as IconName,
  help: 'help-circle' as IconName,
  rate: 'star' as IconName,
  signOut: 'log-out' as IconName,
  workspace: 'business' as IconName,
  subscription: 'card' as IconName,
};

// Auth icons
export const AuthIcons = {
  email: 'mail' as IconName,
  password: 'lock-closed' as IconName,
  passwordVisible: 'eye' as IconName,
  passwordHidden: 'eye-off' as IconName,
  person: 'person' as IconName,
  logo: 'cube' as IconName,
};
