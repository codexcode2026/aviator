export function fmt(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtMult(n: number): string {
  return `${n.toFixed(2)}x`;
}

/** Colour class for a multiplier pill based on its value tier. */
export function multTier(n: number): "low" | "mid" | "high" {
  if (n < 2) return "low";
  if (n < 10) return "mid";
  return "high";
}
