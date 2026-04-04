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
   * Mock purchase flow — replace with react-native-purchases RevenueCat SDK.
   */
  const purchasePro = useCallback(async (): Promise<boolean> => {
    try {
      // TODO: Implement RevenueCat
      // const { customerInfo } = await Purchases.purchaseProduct(Config.revenueCatProMonthly);
      // const isActive = customerInfo.entitlements.active[Config.entitlementPro];

      // For now, update directly (remove in production):
      if (!userId) return false;
      await supabase
        .from('profiles')
        .update({ subscription_tier: 'pro', subscription_status: 'active' })
        .eq('id', userId);

      setTier('pro');
      analytics.track('subscription_upgraded', { tier: 'pro' });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
      return false;
    }
  }, [userId]);

  const purchaseBusiness = useCallback(async (): Promise<boolean> => {
    try {
      if (!userId) return false;
      await supabase
        .from('profiles')
        .update({ subscription_tier: 'business', subscription_status: 'active' })
        .eq('id', userId);

      setTier('business');
      analytics.track('subscription_upgraded', { tier: 'business' });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
      return false;
    }
  }, [userId]);

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
