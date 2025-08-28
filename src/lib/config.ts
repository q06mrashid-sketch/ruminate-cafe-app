import Constants from 'expo-constants';

// Prefer public Expo envs; fall back to app config extras; then derive from Supabase URL; finally a safe default.
const fromEnv = (process as any)?.env?.EXPO_PUBLIC_FUNCTIONS_URL as string | undefined;

const supabaseUrl = (
  (process as any)?.env?.EXPO_PUBLIC_SUPABASE_URL ||
  (Constants as any)?.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
  (Constants as any)?.manifest?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
  (Constants as any)?.manifestExtra?.EXPO_PUBLIC_SUPABASE_URL
) as string | undefined;

const fromSupabaseUrl = supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1` : undefined;

// Last-resort default; replace with your project or remove to force env-driven config.
const DEFAULT_FUNCTIONS_URL = 'https://eamewialuovzguldcdcf.functions.supabase.co';

export function getFunctionsUrl(): string {
  return (
    fromEnv ||
    (Constants as any)?.expoConfig?.extra?.EXPO_PUBLIC_FUNCTIONS_URL ||
    (Constants as any)?.manifest?.extra?.EXPO_PUBLIC_FUNCTIONS_URL ||
    (Constants as any)?.manifestExtra?.EXPO_PUBLIC_FUNCTIONS_URL ||
    fromSupabaseUrl ||
    DEFAULT_FUNCTIONS_URL
  );
}

