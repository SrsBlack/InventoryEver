export const Colors = {
  // Primary palette
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#1D4ED8',

  // Secondary palette
  secondary: '#8B5CF6',
  secondaryLight: '#A78BFA',
  secondaryDark: '#6D28D9',

  // Accent
  accent: '#10B981',
  accentLight: '#34D399',
  accentDark: '#059669',

  // Neutrals (light mode — low number = light, high = dark)
  white: '#FFFFFF',
  black: '#020408',
  gray50: '#F9FAFB',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',

  // Background (light)
  background: '#F8FAFC',
  backgroundDark: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceDark: '#F1F5F9',
  card: '#FFFFFF',

  // Status colors
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Category colors (unchanged — same in both modes)
  electronics: '#3B82F6',
  furniture: '#8B5CF6',
  appliances: '#EC4899',
  clothing: '#F59E0B',
  tools: '#10B981',
  sports: '#EF4444',
  books: '#6366F1',
  kitchen: '#14B8A6',
  office: '#6B7280',
  vehicles: '#F97316',

  // Subscription tiers
  free: '#6B7280',
  pro: '#3B82F6',
  business: '#F59E0B',

  // Text (light mode)
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textInverse: '#F8FAFC',

  // Border (light mode)
  border: '#E2E8F0',
  borderFocus: '#3B82F6',
  divider: '#F1F5F9',

  // Gradients (same in both modes — these are brand gradients)
  gradientPrimary: ['#1D4ED8', '#3B82F6'] as string[],
  gradientSecondary: ['#6D28D9', '#8B5CF6'] as string[],
  gradientSuccess: ['#059669', '#10B981'] as string[],
  gradientWarning: ['#D97706', '#F59E0B'] as string[],
  gradientDark: ['#0F172A', '#1E293B'] as string[],
} as const;
