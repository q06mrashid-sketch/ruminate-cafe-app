import Constants from 'expo-constants';
import { markLoaded } from '../boot/loadingSignals';

const extra = (Constants?.expoConfig?.extra) || (Constants?.manifest?.extra) || {};

// Normalised config so future code can rely on CMS_CONFIG.*
const CMS_CONFIG = {
  functionsBase: extra.CMS_FUNCTIONS_URL || 'https://eamewialuovzguldcdcf.functions.supabase.co',
  anonKey: extra.CMS_ANON || ''
};

// honour disableFallback=false – if network fails, return cached data
const disableFallback = false;

let cached = globalThis.preloaded?.cms || null;

// Fetch all CMS keys by listing then retrieving each value individually
export async function getCMS(force = false) {
  if (!force && cached) return cached;
  const headers = CMS_CONFIG.anonKey
    ? { Authorization: `Bearer ${CMS_CONFIG.anonKey}`, apikey: CMS_CONFIG.anonKey }
    : {};
  try {
    // First list all keys
    const listRes = await fetch(`${CMS_CONFIG.functionsBase}/cms-list?like=%25`, { headers });
    if (!listRes.ok) throw new Error('list failed');
    const listPayload = await listRes.json();
    const keys = Array.isArray(listPayload?.data)
      ? listPayload.data
      : Array.isArray(listPayload)
        ? listPayload
        : [];

    const out = {};
    for (const k of keys) {
      const key = typeof k === 'string' ? k : k?.key || k?.name;
      if (!key) continue;
      const res = await fetch(`${CMS_CONFIG.functionsBase}/cms-get?key=${encodeURIComponent(key)}`, { headers });
      if (!res.ok) continue;
      let value;
      try {
        const payload = await res.json();
        value = payload?.value ?? payload?.data ?? payload;
      } catch {
        value = await res.text();
      }
      out[key] = value;
    }

    cached = out;
    globalThis.preloaded = globalThis.preloaded || {};
    globalThis.preloaded.cms = out;
    console.log(`[CMS] received ${Object.keys(out || {}).length} keys`);
    markLoaded('cms');
    return out;
  } catch {
    markLoaded('cms');
    return !disableFallback && cached ? cached : {};
  }
}
