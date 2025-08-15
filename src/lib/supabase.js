import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const extras = (Constants?.expoConfig?.extra) || (Constants?.manifest?.extra) || {};
export const SUPABASE_URL = extras.SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = extras.SUPABASE_ANON_KEY || '';

export const hasSupabase = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase = hasSupabase ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
