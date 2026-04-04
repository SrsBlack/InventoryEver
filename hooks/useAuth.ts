import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { analytics } from '../lib/analytics';
import type { Profile } from '../types';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
  });

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile;
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({ user: session.user, profile, session, loading: false, error: null });
        analytics.identify(session.user.id, { email: session.user.email });
      } else {
        setState(s => ({ ...s, loading: false }));
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setState({ user: session.user, profile, session, loading: false, error: null });
          analytics.identify(session.user.id, { email: session.user.email });
        } else {
          setState({ user: null, profile: null, session: null, loading: false, error: null });
          analytics.reset();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;

      // Create profile record
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          subscription_tier: 'free',
          subscription_status: 'inactive',
        });
        analytics.track('user_signed_up', { email });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      setState(s => ({ ...s, loading: false, error: msg }));
      throw err;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      analytics.track('user_signed_in', { email });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setState(s => ({ ...s, loading: false, error: msg }));
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      analytics.track('user_signed_out');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign out failed';
      setState(s => ({ ...s, loading: false, error: msg }));
      throw err;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState(s => ({ ...s, profile }));
  }, [state.user, fetchProfile]);

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }));
  }, []);

  return {
    user: state.user,
    profile: state.profile,
    session: state.session,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    clearError,
  };
}
