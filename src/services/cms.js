import Constants from 'expo-constants';
import { markLoaded } from '../boot/loadingSignals';

const extra = (Constants?.expoConfig?.extra) || (Constants?.manifest?.extra) || {};
const FUNCTIONS_URL = extra.CMS_FUNCTIONS_URL || "https://eamewialuovzguldcdcf.functions.supabase.co";
const CMS_ANON = extra.CMS_ANON || "";

let cached = globalThis.preloaded?.cms || null;

export async function getCMS(force = false) {
  if (!force && cached) return cached;
  try {
    const res = await fetch(`${FUNCTIONS_URL}/cms-get`, {
      method: 'GET',
      headers: CMS_ANON ? { Authorization: `Bearer ${CMS_ANON}` } : {}
    });
    if (!res.ok) {
      markLoaded('cms');
      return cached || {};
    }
    const data = await res.json();
    cached = data;
    globalThis.preloaded = globalThis.preloaded || {};
    globalThis.preloaded.cms = data;
    console.log(`[CMS] received ${Object.keys(data || {}).length} keys`);
    markLoaded('cms');
    return data;
  } catch {
    markLoaded('cms');
    return cached || {};
  }
}
