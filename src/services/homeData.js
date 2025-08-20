import { Linking } from 'react-native';
import { getCMS } from './cms';
import AsyncStorage from '@react-native-async-storage/async-storage';

function parseHHMM(s){ if(!s||typeof s!=='string') return null; const m=s.trim().match(/^(\d{1,2}):(\d{2})$/); if(!m) return null; const h=+m[1], mm=+m[2]; if(isNaN(h)||isNaN(mm)) return null; return h*60+mm; }
function hhmm(mins){ if(mins==null) return '--:--'; const h=String(Math.floor(mins/60)).padStart(2,'0'); const m=String(mins%60).padStart(2,'0'); return `${h}:${m}`; }
function statusForIntervals(iv, now){ if(!Array.isArray(iv)||!iv.length) return { openNow:false, until:'--:--', open:'--:--', close:'--:--' }; const t=now.getHours()*60+now.getMinutes(); for(const [a,b] of iv){ if(t>=a && t<b) return { openNow:true, until:hhmm(b), open:hhmm(iv[0][0]), close:hhmm(iv[iv.length-1][1]) }; } const next=iv.find(([a])=>t<a); if(next) return { openNow:false, until:hhmm(next[0]), open:hhmm(iv[0][0]), close:hhmm(iv[iv.length-1][1]) }; return { openNow:false, until:'--:--', open:hhmm(iv[0][0]), close:hhmm(iv[iv.length-1][1]) }; }
function todayStatus(cms, now=new Date()){ const key=['sun','mon','tue','wed','thu','fri','sat'][now.getDay()]; const get=k=>{ const v=cms&&cms[k]; return typeof v==='string'&&v.trim()?v.trim():null; }; if(key==='fri'){ const o1=parseHHMM(get('hours.fri.open1')), c1=parseHHMM(get('hours.fri.close1')), o2=parseHHMM(get('hours.fri.open2')), c2=parseHHMM(get('hours.fri.close2')); const iv=[]; if(o1!=null&&c1!=null&&c1>o1) iv.push([o1,c1]); if(o2!=null&&c2!=null&&c2>o2) iv.push([o2,c2]); return statusForIntervals(iv, now); } else { const o=parseHHMM(get(`hours.${key}.open`)), c=parseHHMM(get(`hours.${key}.close`)); const iv=[]; if(o!=null&&c!=null&&c>o) iv.push([o,c]); return statusForIntervals(iv, now); } }

export async function getToday(){ try{ const cms=await getCMS(); const s=todayStatus(cms||{}); const text=s.openNow?`Open until ${s.until}`:(s.until!=='--:--'?`Closed until ${s.until}`:'Closed today'); return { openNow:s.openNow, until:s.until, open:s.open, close:s.close, text, specials:[] }; } catch { return { openNow:false, until:'--:--', open:'--:--', close:'--:--', text:'Closed today', specials:[] }; } }

export async function getWeeklyHours(){ try{ const cms=await getCMS(); const days=[{k:'mon',label:'Mon'},{k:'tue',label:'Tue'},{k:'wed',label:'Wed'},{k:'thu',label:'Thu'},{k:'fri',label:'Fri'},{k:'sat',label:'Sat'},{k:'sun',label:'Sun'}]; const out=[]; for(const d of days){ if(d.k==='fri'){ const o1=parseHHMM(cms?.['hours.fri.open1']), c1=parseHHMM(cms?.['hours.fri.close1']); const o2=parseHHMM(cms?.['hours.fri.open2']), c2=parseHHMM(cms?.['hours.fri.close2']); const seg1=(o1!=null&&c1!=null&&c1>o1)?`${hhmm(o1)}–${hhmm(c1)}`:null; const seg2=(o2!=null&&c2!=null&&c2>o2)?`${hhmm(o2)}–${hhmm(c2)}`:null; const text=seg1&&seg2?`${seg1} / ${seg2}`:(seg1||seg2||'Closed'); out.push({ key:d.k, label:d.label, text }); } else { const o=parseHHMM(cms?.[`hours.${d.k}.open`]), c=parseHHMM(cms?.[`hours.${d.k}.close`]); const text=(o!=null&&c!=null&&c>o)?`${hhmm(o)}–${hhmm(c)}`:'Closed'; out.push({ key:d.k, label:d.label, text }); } } return out; } catch { return [{key:'mon',label:'Mon',text:'--:--'},{key:'tue',label:'Tue',text:'--:--'},{key:'wed',label:'Wed',text:'--:--'},{key:'thu',label:'Thu',text:'--:--'},{key:'fri',label:'Fri',text:'--:--'},{key:'sat',label:'Sat',text:'--:--'},{key:'sun',label:'Sun',text:'--:--'}]; } }

export async function getPayItForward(){ return { available:7, contributed:124 }; }
// Returns loyalty stamp progress toward the next free drink.
// The target is 8 stamps to earn a free drink.
export async function getFreeDrinkProgress(){ return { current:3, target:8 }; }

export async function openInstagramProfile(){ const app='instagram://user?username=ruminatecafe'; const web='https://www.instagram.com/ruminatecafe/'; try{ const can=await Linking.canOpenURL(app); await Linking.openURL(can?app:web); } catch { Linking.openURL(web); } }

export async function getLatestInstagramPost(){
  const cacheKey='latestIgPost';
  const endpoint=process.env.EXPO_PUBLIC_INSTAGRAM_FEED_URL;
  try{
    if(!endpoint) throw new Error('no endpoint');
    const res=await fetch(endpoint);
    if(!res.ok) throw new Error('bad status');
    const data=await res.json();

    const pickPost=payload=>{
      const item=Array.isArray(payload)?payload[0]:Array.isArray(payload?.data)?payload.data[0]:payload?.latest||payload;
      if(!item) return null;
      const image=item.image||item.image_url||item.imageUrl||item.media_url||item.url;
      const caption=item.caption||item.text||'';
      return typeof image==='string'?{image,caption}:null;
    };

    const post=pickPost(data);
    if(!post) throw new Error('bad payload');
    try{ await AsyncStorage.setItem(cacheKey, JSON.stringify(post)); }catch{}
    return post;
  }catch{
    try{ const cached=await AsyncStorage.getItem(cacheKey); if(cached) return JSON.parse(cached); }catch{}
    return { image:null, caption:'' };
  }
}
