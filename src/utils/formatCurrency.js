const formatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

export function formatCurrency(value) {
  return formatter.format(value);
}

export default formatCurrency;
