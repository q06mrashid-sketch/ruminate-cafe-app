const base = process.env.EXPO_PUBLIC_FUNCTIONS_URL || '';
const url = (base && base.endsWith('/')) ? base.slice(0,-1) + '/pif-stats' : (base ? base + '/pif-stats' : '/pif-stats');
export async function getPIFStats(){
  try{
    const res = await fetch(url,{headers:{accept:'application/json'}});
    if(!res.ok) throw new Error('bad');
    const j = await res.json();
    const available = Number(j?.available)||0;
    const purchases = Number(j?.purchases)||0;
    const redeems = Number(j?.redeems)||0;
    return { available, contributed: purchases, purchases, redeems };
  }catch{
    return { available: 0, contributed: 0, purchases: 0, redeems: 0 };
  }
}
