import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { analytics } from '../lib/analytics';
import type { SubscriptionTier, TierLimits } from '../types';
import { TIER_LIMITS } from '../types';

export function useSubscription(userId: string | undefined) {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTier = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status')
        .eq('id', userId)
        .single();

      if (data?.subscription_tier) {
        setTier(data.subscription_tier as SubscriptionTier);
      }
    } catch {
      // silently fail — defaults to free
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTier();
  }, [fetchTier]);

  const limits: TierLimits = TIER_LIMITS[tier];

  /**
   * Check usage against tier limit.
   * Returns true if action is allowed.
   */
  const checkLimit = useCallback(
    async (type: 'items' | 'ai_requests'): Promise<boolean> => {
      if (!userId) return false;

      const month = new Date().toISOString().slice(0, 7) + '-01'; // YYYY-MM-01
      const { data } = await supabase
        .from('usage_tracking')
        .select('items_count, ai_requests')
        .eq('user_id', userId)
        .eq('month', month)
        .single();

      if (type === 'items') {
        const count = data?.items_count ?? 0;
        return count < limits.max_items;
      }
      const count = data?.ai_requests ?? 0;
      return count < limits.ai_requests_per_month;
    },
    [userId, limits]
  );

  /**
   * Increment usage counter.
   */
  const incrementUsage = useCallback(
    async (type: 'items_count' | 'ai_requests') => {
      if (!userId) return;
      const month = new Date().toISOString().slice(0, 7) + '-01';

      await supabase.rpc('increment_usage', {
        p_user_id: userId,
        p_month: month,
        p_field: type,
      });
    },
    [userId]
  );

  /**
   * Purchase Pro — requires RevenueCat SDK integration.
   * TODO: Install react-native-purchases, configure with Config.revenueCatApiKey,
   * then replace this body with:
   *   const { customerInfo } = await Purchases.purchaseProduct(Config.revenueCatProMonthly);
   *   if (customerInfo.entitlements.active[Config.entitlementPro]) { ... }
   */
  const purchasePro = useCallback(async (): Promise<boolean> => {
    setError('In-app purchases are not yet available. Please check back soon.');
    return false;
  }, []);

  const purchaseBusiness = useCallback(async (): Promise<boolean> => {
    setError('In-app purchases are not yet available. Please check back soon.');
    return false;
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    // TODO: Purchases.restorePurchases()
    await fetchTier();
    return true;
  }, [fetchTier]);

  return {
    tier,
    isPro: tier === 'pro' || tier === 'business',
    isBusiness: tier === 'business',
    limits,
    loading,
    error,
    checkLimit,
    incrementUsage,
    purchasePro,
    purchaseBusiness,
    restorePurchases,
    refreshTier: fetchTier,
  };
}
