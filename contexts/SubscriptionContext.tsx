import React, { createContext, useContext } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import type { SubscriptionTier, TierLimits } from '../types';

interface SubscriptionContextValue {
  tier: SubscriptionTier;
  isPro: boolean;
  isBusiness: boolean;
  limits: TierLimits;
  loading: boolean;
  error: string | null;
  checkLimit: (type: 'items' | 'ai_requests') => Promise<boolean>;
  incrementUsage: (type: 'items_count' | 'ai_requests') => Promise<void>;
  purchasePro: () => Promise<boolean>;
  purchaseBusiness: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshTier: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string | undefined;
}) {
  const subscription = useSubscription(userId);
  return (
    <SubscriptionContext.Provider value={subscription}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscriptionContext must be used within SubscriptionProvider');
  return ctx;
}
