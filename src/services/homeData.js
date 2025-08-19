import { Linking } from 'react-native';
import { getCMS } from './cms';

function parseHHMM(s) {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/^\s*(\d{1,2}):(\d{2})\s*$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (isNaN(h) || isNaN(mm)) return null;
  return h * 60 + mm;
}

function formatHHMM(mins) {
  if (mins == null) return '--:--';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hh = h.toString().padStart(2, '0');
  const mm = m.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function computeStatus(intervals, now) {
  if (!Array.isArray(intervals) || intervals.length === 0) return { openNow: false, until: '--:--' };
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  for (const [start, end] of intervals) {
    if (minutesNow >= start && minutesNow < end) return { openNow: true, until: formatHHMM(end) };
  }
  const next = intervals.find(([start]) => minutesNow < start);
  if (next) return { openNow: false, until: formatHHMM(next[0]) };
  return { openNow: false, until: '--:--' };
}

function buildTodayFromCMS(cms, now = new Date()) {
  const key = ['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];
  const get = (k) => {
    const v = cms?.[k];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  };
  if (key === 'fri') {
    const o1 = parseHHMM(get('hours.fri.open1'));
    const c1 = parseHHMM(get('hours.fri.close1'));
    const o2 = parseHHMM(get('hours.fri.open2'));
    const c2 = parseHHMM(get('hours.fri.close2'));
    const intervals = [];
    if (o1 != null && c1 != null && c1 > o1) intervals.push([o1, c1]);
    if (o2 != null && c2 != null && c2 > o2) intervals.push([o2, c2]);
    return computeStatus(intervals, now);
  } else {
    const o = parseHHMM(get(`hours.${key}.open`));
    const c = parseHHMM(get(`hours.${key}.close`));
    const intervals = [];
    if (o != null && c != null && c > o) intervals.push([o, c]);
    return computeStatus(intervals, now);
  }
}

export async function getToday() {
  try {
    const cms = await getCMS();
    const status = buildTodayFromCMS(cms || {});
    return { openNow: status.openNow, until: status.until, specials: [] };
  } catch {
    return { openNow: false, until: '--:--', specials: [] };
  }
}

export async function getPayItForward() {
  return { available: 7, contributed: 124 };
}

export async function getFreeDrinkProgress() {
  return { current: 3, target: 10 };
}

export async function openInstagramProfile() {
  const app = 'instagram://user?username=ruminatecafe';
  const web = 'https://www.instagram.com/ruminatecafe/';
  try {
    const can = await Linking.canOpenURL(app);
    await Linking.openURL(can ? app : web);
  } catch {
    Linking.openURL(web);
  }
}
