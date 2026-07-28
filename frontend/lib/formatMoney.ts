export function formatMoney(value: number, opts: { withPrefix?: boolean } = {}) {
  const { withPrefix = false } = opts;
  const formatted = new Intl.NumberFormat("en-SZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  const sign = value < 0 ? "-" : "";
  return withPrefix ? `${sign}E ${formatted}` : `${sign}${formatted}`;
}

export function formatTonnes(value: number, decimals = 1) {
  return `${new Intl.NumberFormat("en-SZ", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)} t`;
}

export function formatPercent(value: number, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}
