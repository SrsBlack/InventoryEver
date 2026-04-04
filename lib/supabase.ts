import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/config';

if (!Config.supabaseUrl || !Config.supabaseAnonKey) {
  console.warn('Missing Supabase credentials. Copy .env.example to .env.local and fill in your keys.');
}

export const supabase = createClient(
  Config.supabaseUrl || 'https://placeholder.supabase.co',
  Config.supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export default supabase;
