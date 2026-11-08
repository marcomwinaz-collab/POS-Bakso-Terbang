export type DiscountInput = { type: "NOMINAL" | "PERCENT"; value: number };

export function computeTotals(
  lines: { price: number; qty: number }[],
  discount: DiscountInput,
  taxPercent: number,
  servicePercent: number,
) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  let disc =
    discount.type === "PERCENT"
      ? Math.round((subtotal * Math.min(Math.max(discount.value, 0), 100)) / 100)
      : Math.round(Math.max(discount.value, 0));
  disc = Math.min(disc, subtotal);
  const base = subtotal - disc;
  const service = Math.round((base * servicePercent) / 100);
  const tax = Math.round(((base + service) * taxPercent) / 100);
  const total = base + service + tax;
  return { subtotal, discount: disc, service, tax, total };
}
