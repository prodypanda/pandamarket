/**
 * Money helpers for TND (Tunisian Dinar — 3 decimal places, "millimes").
 * Konnect API expects amounts in millimes (1 TND = 1000 millimes).
 */

const SCALE = 1000; // 3 decimal places

/**
 * Round a TND amount to 3 decimals, avoiding float drift.
 */
export function roundTnd(amount: number): number {
  return Math.round(amount * SCALE) / SCALE;
}

/**
 * Convert TND → millimes (integer).  e.g. 85.000 → 85000.
 */
export function tndToMillimes(tnd: number): number {
  return Math.round(tnd * SCALE);
}

/**
 * Convert millimes → TND.  e.g. 85000 → 85.
 */
export function millimesToTnd(millimes: number): number {
  return millimes / SCALE;
}

/**
 * Format an amount for display: "85.000 TND".
 */
export function formatTnd(amount: number): string {
  return `${roundTnd(amount).toFixed(3)} TND`;
}

/**
 * Calculate commission given an amount and a rate (0-1).
 *   calculateCommission(100, 0.15) => 15.000
 */
export function calculateCommission(amount: number, rate: number): number {
  if (rate < 0 || rate > 1) {
    throw new Error(`Invalid commission rate: ${rate}`);
  }
  return roundTnd(amount * rate);
}

/**
 * Calculate vendor net amount after platform commission.
 */
export function calculateVendorNet(amount: number, commissionRate: number): number {
  return roundTnd(amount - calculateCommission(amount, commissionRate));
}
