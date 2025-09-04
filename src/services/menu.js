import { supabase, hasSupabase } from '../lib/supabase';
import { getAll } from './cmsClient';

export async function getMenuItems() {
  if (!hasSupabase || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('id,name,type,base_price,options,cms_key');
    if (error) return [];
    const cms = await getAll();
    return (data || [])
      .filter(item => {
        if (!item.cms_key) return true;
        const val = cms[item.cms_key];
        return typeof val !== 'undefined' && val !== null && val !== '';
      })
      .map(item => {
        const base = item.cms_key ? item.cms_key.replace(/^menu\./, '') : null;
        const [category] = base ? base.split('.', 2) : [null];
        const price = base ? cms[`price.${base}`] : null;
        const desc = base ? cms[`desc.${base}`] : null;
        const image = base ? cms[`image.${base}`] : null;
        return {
          ...item,
          name: item.cms_key ? cms[item.cms_key] || item.name : item.name,
          base_price: price ? parseFloat(price) || item.base_price : item.base_price,
          description: desc || null,
          image: image || null,
          category,
        };
      });
  } catch {
    return [];
  }
}

