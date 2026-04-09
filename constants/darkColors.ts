export const DarkColors = {
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

  // Neutrals
  white: '#F8FAFC',
  black: '#020408',
  gray50: '#0F1117',
  gray100: '#1A1D27',
  gray200: '#252836',
  gray300: '#2D3142',
  gray400: '#4B5270',
  gray500: '#6B7280',
  gray600: '#9CA3AF',
  gray700: '#D1D5DB',
  gray800: '#E5E7EB',
  gray900: '#F9FAFB',

  // Background
  background: '#0F1117',
  backgroundDark: '#020408',
  surface: '#1A1D27',
  surfaceDark: '#0F1117',
  card: '#1A1D27',

  // Status colors
  success: '#10B981',
  successLight: '#064E3B',
  warning: '#F59E0B',
  warningLight: '#451A03',
  error: '#EF4444',
  errorLight: '#450A0A',
  info: '#3B82F6',
  infoLight: '#1E3A5F',

  // Category colors
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

  // Text
  textPrimary: '#F8FAFC',
  textSecondary: '#9CA3AF',
  textTertiary: '#4B5270',
  textInverse: '#0F1117',

  // Border
  border: '#252836',
  borderFocus: '#3B82F6',
  divider: '#1A1D27',

  // Gradients
  gradientPrimary: ['#1D4ED8', '#3B82F6'] as [string, string],
  gradientSecondary: ['#6D28D9', '#8B5CF6'] as [string, string],
  gradientSuccess: ['#059669', '#10B981'] as [string, string],
  gradientWarning: ['#D97706', '#F59E0B'] as [string, string],
  gradientDark: ['#0F1117', '#1A1D27'] as [string, string],
} as const;
