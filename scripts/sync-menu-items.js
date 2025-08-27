import { createAdminClient } from './_supabase.js';

async function run() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('cms_texts')
    .select('key,value');
  if (error) throw error;

  const map = new Map((data || []).map(r => [r.key, r.value]));
  const rows = [];
  for (const [key, value] of map.entries()) {
    if (!key.startsWith('menu.')) continue;
    const base = key.slice(5);
    const priceVal = map.get(`price.${base}`);
    rows.push({
      cms_key: key,
      name: value || null,
      base_price: priceVal ? parseFloat(priceVal) || 0 : 0,
    });
  }

  if (!rows.length) {
    console.log('No menu keys found.');
    return;
  }

  const { error: upsertError } = await supabase
    .from('menu_items')
    .upsert(rows, { onConflict: 'cms_key' });
  if (upsertError) throw upsertError;

  console.log(`Upserted ${rows.length} menu items.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
