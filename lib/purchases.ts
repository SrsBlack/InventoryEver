/**
 * RevenueCat purchases wrapper.
 *
 * react-native-purchases is not yet installed. All functions are no-ops that
 * log a warning so the app compiles and runs without crashing.
 *
 * To activate:
 *   1. npx expo install react-native-purchases
 *   2. Set EXPO_PUBLIC_REVENUECAT_API_KEY in your .env / EAS secrets
 *   3. Remove the STUB block below and uncomment the real implementation
 */

import { Config } from '../constants/config';

// ---------------------------------------------------------------------------
// Type stubs so TypeScript is happy without the real package installed
// ---------------------------------------------------------------------------

interface CustomerInfo {
  entitlements: {
    active: Record<string, { isActive: boolean }>;
  };
}

// ---------------------------------------------------------------------------
// STUB — replace this block once react-native-purchases is installed
// ---------------------------------------------------------------------------

const WARN = '[purchases] react-native-purchases is not installed. Call npx expo install react-native-purchases.';

let _initialized = false;

export async function initializePurchases(): Promise<void> {
  if (!Config.revenueCatApiKey) {
    console.warn('[purchases] EXPO_PUBLIC_REVENUECAT_API_KEY is not set.');
    return;
  }
  if (_initialized) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Purchases = require('react-native-purchases').default;
    Purchases.configure({ apiKey: Config.revenueCatApiKey });
    _initialized = true;
  } catch {
    console.warn(WARN);
  }
}

export async function purchaseProduct(productId: string): Promise<CustomerInfo | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Purchases = require('react-native-purchases').default;
    const { customerInfo } = await Purchases.purchaseProduct(productId);
    return customerInfo as CustomerInfo;
  } catch (err: unknown) {
    // User cancelled — PurchasesError has userCancelled property
    const purchaseErr = err as { userCancelled?: boolean; message?: string };
    if (purchaseErr?.userCancelled) return null;
    console.warn(WARN, productId);
    return null;
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Purchases = require('react-native-purchases').default;
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo as CustomerInfo;
  } catch {
    console.warn(WARN);
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Purchases = require('react-native-purchases').default;
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo as CustomerInfo;
  } catch {
    console.warn(WARN);
    return null;
  }
}

export function checkEntitlement(customerInfo: CustomerInfo | null, name: string): boolean {
  if (!customerInfo) return false;
  return customerInfo.entitlements.active[name]?.isActive === true;
}
