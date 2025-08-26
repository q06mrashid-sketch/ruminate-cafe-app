import { createAdminClient } from './_supabase.js';

async function run() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('cms_texts')
    .select('key,value')
    .like('key', 'menu.%');
  if (error) throw error;

  const rows = (data || []).map(row => ({
    cms_key: row.key,
    name: row.value || null,
    base_price: 0
  }));

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
