import { getCMS } from './cms';

function parseHHMM(s){if(!s||typeof s!=='string')return null;const m=s.match(/^\s*(\d{1,2}):(\d{2})\s*$/);if(!m)return null;const h=parseInt(m[1],10),mm=parseInt(m[2],10);if(isNaN(h)||isNaN(mm))return null;return h*60+mm}
function hhmm(mins){if(mins==null)return'--:--';const h=Math.floor(mins/60),m=mins%60;return`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`}
function statusForIntervals(iv,now){if(!Array.isArray(iv)||!iv.length)return{openNow:false,until:'--:--',open:'--:--',close:'--:--'};const t=now.getHours()*60+now.getMinutes();for(const [a,b]of iv){if(t>=a&&t<b)return{openNow:true,until:hhmm(b),open:hhmm(iv[0][0]),close:hhmm(iv[iv.length-1][1])}}const next=iv.find(([a])=>t<a);if(next)return{openNow:false,until:hhmm(next[0]),open:hhmm(iv[0][0]),close:hhmm(iv[iv.length-1][1])};return{openNow:false,until:'--:--',open:hhmm(iv[0][0]),close:hhmm(iv[iv.length-1][1])}}
function todayStatus(cms,now=new Date()){const key=['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];const get=k=>{const v=cms&&cms[k];return typeof v==='string'&&v.trim()?v.trim():null};if(key==='fri'){const o1=parseHHMM(get('hours.fri.open1')),c1=parseHHMM(get('hours.fri.close1')),o2=parseHHMM(get('hours.fri.open2')),c2=parseHHMM(get('hours.fri.close2'));const iv=[];if(o1!=null&&c1!=null&&c1>o1)iv.push([o1,c1]);if(o2!=null&&c2!=null&&c2>o2)iv.push([o2,c2]);return statusForIntervals(iv,now)}else{const o=parseHHMM(get(`hours.${key}.open`)),c=parseHHMM(get(`hours.${key}.close`));const iv=[];if(o!=null&&c!=null&&c>o)iv.push([o,c]);return statusForIntervals(iv,now)}}
export async function getToday(){try{const cms=await getCMS();const s=todayStatus(cms||{});const text=s.openNow?`Open until ${s.until}`:(s.until!=='--:--'?`Closed until ${s.until}`:'Closed today');return{openNow:s.openNow,until:s.until,open:s.open,close:s.close,text, specials:[]}}catch{return{openNow:false,until:'--:--',open:'--:--',close:'--:--',text:'Closed today',specials:[]}}}
export async function getPayItForward(){return{available:7,contributed:124}}
export async function getFreeDrinkProgress(){return{current:3,target:10}
export async function getWeeklyHours(){
  try{
    const cms=await getCMS();
    const days=[{k:'mon',label:'Mon'},{k:'tue',label:'Tue'},{k:'wed',label:'Wed'},{k:'thu',label:'Thu'},{k:'fri',label:'Fri'},{k:'sat',label:'Sat'},{k:'sun',label:'Sun'}];
    const out=[];
    const parse=(x)=>{if(!x||typeof x!=='string')return null;const m=x.trim().match(/^(d{1,2}):(d{2})$/);if(!m)return null;const h=+m[1],mm=+m[2];if(isNaN(h)||isNaN(mm))return null;return h*60+mm};
    const fmt=(m)=>{if(m==null)return'--:--';const h=String(Math.floor(m/60)).padStart(2,'0');const mm=String(m%60).padStart(2,'0');return h+':'+mm};
    for(const d of days){
      if(d.k==='fri'){
        const o1=parse(cms?.['hours.fri.open1']),c1=parse(cms?.['hours.fri.close1']);
        const o2=parse(cms?.['hours.fri.open2']),c2=parse(cms?.['hours.fri.close2']);
        const seg1=(o1!=null&&c1!=null&&c1>o1)?(fmt(o1)+'–'+fmt(c1)):null;
        const seg2=(o2!=null&&c2!=null&&c2>o2)?(fmt(o2)+'–'+fmt(c2)):null;
        const text=seg1&&seg2?seg1+' / '+seg2:(seg1||seg2||'Closed');
        out.push({key:d.k,label:d.label,text});
      }else{
        const o=parse(cms?.['hours.'+d.k+'.open']),c=parse(cms?.['hours.'+d.k+'.close']);
        const text=(o!=null&&c!=null&&c>o)?(fmt(o)+'–'+fmt(c)):'Closed';
        out.push({key:d.k,label:d.label,text});
      }
    }
    return out;
  }catch{
    return [{key:'mon',label:'Mon',text:'--:--'},{key:'tue',label:'Tue',text:'--:--'},{key:'wed',label:'Wed',text:'--:--'},{key:'thu',label:'Thu',text:'--:--'},{key:'fri',label:'Fri',text:'--:--'},{key:'sat',label:'Sat',text:'--:--'},{key:'sun',label:'Sun',text:'--:--'}];
  }
}
}
