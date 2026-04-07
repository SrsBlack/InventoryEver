import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { analytics } from '../lib/analytics';
import {
  initializePurchases,
  purchaseProduct,
  restorePurchases as rcRestorePurchases,
  checkEntitlement,
} from '../lib/purchases';
import { Config } from '../constants/config';
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

  // Initialize RevenueCat once a userId is available
  useEffect(() => {
    if (!userId) return;
    initializePurchases();
  }, [userId]);

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

  const updateTierFromEntitlements = useCallback(
    async (customerInfo: Awaited<ReturnType<typeof import('../lib/purchases').getCustomerInfo>>) => {
      if (!userId || !customerInfo) return;

      let newTier: SubscriptionTier = 'free';
      if (checkEntitlement(customerInfo, Config.entitlementBusiness)) {
        newTier = 'business';
      } else if (checkEntitlement(customerInfo, Config.entitlementPro)) {
        newTier = 'pro';
      }

      await supabase
        .from('profiles')
        .update({ subscription_tier: newTier, subscription_status: newTier === 'free' ? 'inactive' : 'active' })
        .eq('id', userId);

      setTier(newTier);
    },
    [userId]
  );

  const purchasePro = useCallback(async (): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      const customerInfo = await purchaseProduct(Config.revenueCatProMonthly);
      if (!customerInfo) return false;
      if (!checkEntitlement(customerInfo, Config.entitlementPro)) {
        setError('Purchase completed but entitlement is not active yet. Try restoring purchases.');
        return false;
      }
      await updateTierFromEntitlements(customerInfo);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Purchase failed. Please try again.';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateTierFromEntitlements]);

  const purchaseBusiness = useCallback(async (): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      const customerInfo = await purchaseProduct(Config.revenueCatBusinessMonthly);
      if (!customerInfo) return false;
      if (!checkEntitlement(customerInfo, Config.entitlementBusiness)) {
        setError('Purchase completed but entitlement is not active yet. Try restoring purchases.');
        return false;
      }
      await updateTierFromEntitlements(customerInfo);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Purchase failed. Please try again.';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateTierFromEntitlements]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      const customerInfo = await rcRestorePurchases();
      if (customerInfo) {
        await updateTierFromEntitlements(customerInfo);
      } else {
        await fetchTier();
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Restore failed. Please try again.';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateTierFromEntitlements, fetchTier]);

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
