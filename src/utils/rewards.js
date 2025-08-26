export function applyStampAccrual(prevStamps = 0, delta = 0) {
  const start = Math.max(0, Number(prevStamps || 0));
  const inc = Math.max(0, Number(delta || 0));
  const total = start + inc;
  return {
    vouchersEarned: Math.floor(total / 8),
    stampsRemainder: total % 8,
  };
}
