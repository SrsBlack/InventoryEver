export const Config = {
  appName: 'InventoryEver',
  appVersion: '1.0.0',

  // Supabase
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',

  // AI Services
  googleVisionApiKey: process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY ?? '',
  openAiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '',
  veryfiClientId: process.env.EXPO_PUBLIC_VERYFI_CLIENT_ID ?? '',
  veryfiClientSecret: process.env.EXPO_PUBLIC_VERYFI_CLIENT_SECRET ?? '',
  veryfiUsername: process.env.EXPO_PUBLIC_VERYFI_USERNAME ?? '',
  veryfiApiKey: process.env.EXPO_PUBLIC_VERYFI_API_KEY ?? '',

  // RevenueCat
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '',
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? '',

  // Analytics (optional)
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',

  // Environment
  isDev: process.env.EXPO_PUBLIC_ENVIRONMENT === 'development',
  isProd: process.env.EXPO_PUBLIC_ENVIRONMENT === 'production',

  // Pagination
  itemsPerPage: 20,
  searchDebounceMs: 300,

  // AI
  aiConfidenceThreshold: 0.7,
  maxImageSizeMb: 5,

  // Storage
  storageBucket: 'item-images',

  // Subscription product IDs
  revenueCatProMonthly: 'pro_monthly',
  revenueCatProYearly: 'pro_yearly',
  revenueCatBusinessMonthly: 'business_monthly',
  revenueCatBusinessYearly: 'business_yearly',

  // Entitlements
  entitlementPro: 'pro',
  entitlementBusiness: 'business',
} as const;
