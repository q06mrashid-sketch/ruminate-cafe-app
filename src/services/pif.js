const base = process.env.EXPO_PUBLIC_FUNCTIONS_URL || '';
const u = (p) => (base.endsWith('/') ? base.slice(0,-1) : base) + p;
export async function getPIFStats(){
  try{
    const r = await fetch(u('/pif-stats'),{headers:{accept:'application/json'}});
    if(!r.ok) throw new Error('bad');
    const j = await r.json();
    return { available:Number(j?.available)||0, purchases:Number(j?.purchases)||0, redeems:Number(j?.redeems)||0, contributed:Number(j?.purchases)||0 };
  }catch{ return { available:0, purchases:0, redeems:0, contributed:0 }; }
}
export async function getPIFByEmail(email){
  if(!email) return { total_cents:0, count:0 };
  try{
    const r = await fetch(u('/pif-by-email?email=')+encodeURIComponent(email),{headers:{accept:'application/json'}});
    if(!r.ok) throw new Error('bad');
    const j = await r.json();
    return { total_cents:Number(j?.total_cents)||0, count:Number(j?.count)||0 };
  }catch{ return { total_cents:0, count:0 }; }
}
