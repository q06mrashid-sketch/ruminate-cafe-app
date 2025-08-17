import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

function getExtras() {
  const c = Constants?.expoConfig?.extra || Constants?.manifest?.extra || Constants?.manifestExtra || {};
  return c || {};
}

const extras = getExtras();

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  extras.EXPO_PUBLIC_SUPABASE_URL ||
  extras.SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  extras.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  extras.SUPABASE_ANON_KEY;

export const hasSupabase =
  typeof SUPABASE_URL === 'string' && SUPABASE_URL.length > 0 &&
  typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.length > 0;

export const supabase = hasSupabase
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storage: AsyncStorage },
    })
  : null;
