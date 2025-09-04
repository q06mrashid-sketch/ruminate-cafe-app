const ALT_MILKS = ['Skimmed','Semi-skimmed','Soy','Oat','Coconut','Almond','Lactose free'];
const CATEGORIES = ['coffee','not-coffee','pif','specials'];

export function buildMenuData(cmsMap = {}) {
  const itemsByCategory = { 'coffee': [], 'not-coffee': [], 'pif': [], 'specials': [] };
  const options = {
    altMilks: ALT_MILKS.slice(),
    syrups: [],
    coffeeBlends: [{ key: 'house', label: 'House blend' }],
  };

  for (const [key, value] of Object.entries(cmsMap)) {
    if (!value) continue;
    if (key.startsWith('syrups.')) {
      const suffix = key.split('.')[1];
      options.syrups.push({ key: suffix, label: value });
    } else if (key.startsWith('coffee.')) {
      const suffix = key.split('.')[1];
      options.coffeeBlends.push({ key: suffix, label: value });
    }
  }

  for (const [key, value] of Object.entries(cmsMap)) {
    if (!key.startsWith('menu.')) continue;
    const parts = key.split('.');
    if (parts.length < 3) continue;
    const category = parts[1];
    const suffix = parts.slice(2).join('.');
    if (!CATEGORIES.includes(category)) continue;
    if (!value) continue;
    const base = `${category}.${suffix}`;
    const priceRaw = cmsMap[`price.${base}`];
    const price = parseFloat(priceRaw);
    const desc = cmsMap[`desc.${base}`];
    const img = cmsMap[`image.${base}`];
    const item = {
      id: `${category}:${suffix}`,
      category,
      suffix,
      name: value,
      price: isNaN(price) ? 0 : price,
      desc: desc || undefined,
      imageUri: img ? `data:image/*;base64,${img}` : undefined,
      flags: {
        alt: Boolean(cmsMap[`alt.${base}`]),
        extra: Boolean(cmsMap[`extra.${base}`]),
        syrups: Boolean(cmsMap[`syrups-on.${base}`] || cmsMap[`syrup-on.${base}`]),
        coffee: Boolean(cmsMap[`coffee-on.${base}`]),
      },
    };
    itemsByCategory[category].push(item);
  }

  return { itemsByCategory, options };
}

export async function getMenuData() {
  const { getAll } = await import('./cmsClient');
  const cms = await getAll();
  return buildMenuData(cms);
}

export function computeItemTotal(basePrice, { syrupCount = 0, extraShots = 0 } = {}) {
  const base = parseFloat(basePrice) || 0;
  const total = base + syrupCount * 0.5 + extraShots * 1.49;
  return Number(total.toFixed(2));
}

