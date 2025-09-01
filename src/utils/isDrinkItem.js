export const isDrinkItem = (item) => {
  const key = (item?.cms_key || item?.id || '').toLowerCase();
  if (key.includes('.drink')) return true;
  const category = (item?.category || '').toLowerCase();
  if (category === 'coffee') return true;
  if (key.startsWith('coffee:')) return true;
  if (key.startsWith('specials:')) return true;
  if (category === 'specials') return true;
  if (item?.drink || item?.metadata?.drink) return true;
  return false;
};
