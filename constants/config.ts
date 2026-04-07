export const Config = {
  appName: 'InventoryEver',
  appVersion: '1.0.0',

  // Supabase
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',

  // AI Services — keys are server-side only, set as Supabase Edge Function secrets.
  // Do NOT add EXPO_PUBLIC_ AI keys here; they would be exposed in the client bundle.
  // Deploy: supabase secrets set OPENAI_API_KEY=... GOOGLE_VISION_API_KEY=... VERYFI_CLIENT_ID=... VERYFI_API_KEY=... VERYFI_USERNAME=... --project-ref senmpagpravittvayecz

  // RevenueCat
  revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '',
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
  revenueCatProMonthly: 'inventoryever_pro_monthly',
  revenueCatProAnnual: 'inventoryever_pro_annual',
  revenueCatBusinessMonthly: 'inventoryever_business_monthly',
  revenueCatBusinessAnnual: 'inventoryever_business_annual',
  // Legacy aliases (kept for backward compatibility)
  revenueCatProYearly: 'inventoryever_pro_annual',
  revenueCatBusinessYearly: 'inventoryever_business_annual',

  // Entitlements
  entitlementPro: 'pro',
  entitlementBusiness: 'business',
} as const;
