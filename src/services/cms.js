import Constants from 'expo-constants';

const extra = (Constants?.expoConfig?.extra) || (Constants?.manifest?.extra) || {};
const FUNCTIONS_URL = extra.CMS_FUNCTIONS_URL || "https://eamewialuovzguldcdcf.functions.supabase.co";
const CMS_ANON = extra.CMS_ANON || "";

export async function getCMS() {
  try {
    const res = await fetch(`${FUNCTIONS_URL}/cms-get`, {
      method: 'GET',
      headers: CMS_ANON ? { Authorization: `Bearer ${CMS_ANON}` } : {}
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}
