import Constants from 'expo-constants';
import { markLoaded } from '../boot/loadingSignals';

const extra = (Constants?.expoConfig?.extra) || (Constants?.manifest?.extra) || {};

// Read anon key / functions URL from localStorage with env fallbacks
function getLocal(key) {
  try {
    return globalThis?.localStorage?.getItem?.(key) || '';
  } catch {
    return '';
  }
}

const anonKey = getLocal('cmsAnon') || extra.CMS_ANON || '';
const functionsBase = getLocal('cmsFunctionsUrl') ||
  extra.CMS_FUNCTIONS_URL ||
  'https://eamewialuovzguldcdcf.functions.supabase.co';

// Normalised config so future code can rely on CMS_CONFIG.*
const CMS_CONFIG = {
  functionsBase,
  anonKey,
  api: {
    list: `${functionsBase}/cms-list`,
    get: `${functionsBase}/cms-get`,
    set: `${functionsBase}/cms-set`,
    del: `${functionsBase}/cms-del`,
  }
};

// honour disableFallback=false – if network fails, return cached data
const disableFallback = false;

let cached = globalThis.preloaded?.cms || null;

// Helper to fetch all keys then each value
async function fetchAllCmsKeys(cfg) {
  const headers = cfg.anonKey
    ? { Authorization: `Bearer ${cfg.anonKey}`, apikey: cfg.anonKey }
    : {};
  const listRes = await fetch(`${cfg.api.list}?like=%25`, { headers });
  const { keys = [] } = await listRes.json().catch(() => ({}));
  const entries = await Promise.all(keys.map(async (key) => {
    const r = await fetch(`${cfg.api.get}?key=${encodeURIComponent(key)}`, { headers });
    const j = await r.json().catch(() => ({}));
    return [key, j.value ?? j.data ?? ''];
  }));
  return Object.fromEntries(entries);
}

// Fetch all CMS keys by listing then retrieving each value individually
export async function getCMS(force = false) {
  if (!force && cached) return cached;
  if (!CMS_CONFIG.functionsBase || !CMS_CONFIG.anonKey) {
    console.warn('[CMS] missing Supabase function URL or anon key');
    markLoaded('cms');
    return {};
  }
  try {
    const out = await fetchAllCmsKeys(CMS_CONFIG);
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
