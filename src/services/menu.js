import { supabase, hasSupabase } from '../lib/supabase';
import { getCMS } from './cms';

export async function getMenuItems() {
  if (!hasSupabase || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('id,name,type,base_price,options,cms_key');
    if (error) return [];
    const cms = await getCMS();
    return (data || [])
      .filter(item => {
        if (!item.cms_key) return true;
        const val = cms[item.cms_key];
        return typeof val !== 'undefined' && val !== null && val !== '';
      })
      .map(item => ({
        ...item,
        name: cms[item.cms_key] || item.name,
      }));
  } catch {
    return [];
  }
}

