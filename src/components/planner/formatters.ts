/** Format numbers for display-only labels (construction estimates). */

export function usd(amount: number, fractionDigits = 2): string {
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

export function qty(n: number, unit: string, fractionDigits?: number): string {
  const f =
    fractionDigits !== undefined ?
      {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }
    : {};
  return `${n.toLocaleString(undefined, f)} ${unit}`;
}
