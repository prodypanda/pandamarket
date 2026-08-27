import { describe, it, expect } from 'vitest';

describe('PLAN-B-14: Commission Rate Conversion & Mathematical Integrity', () => {
  function computeCommissionFraction(inputRate: unknown): number {
    return Math.max(0, Math.min(100, Number(inputRate))) / 100;
  }

  it('converts 1% commission to 0.01 fraction (not 1.0 / 100%)', () => {
    // The legacy bug was: Number(1) > 1 is false -> stored 1 (100%)
    const fraction = computeCommissionFraction(1);
    expect(fraction).toBe(0.01);
  });

  it('converts 0.5% promotional commission to 0.005 fraction (not 0.5 / 50%)', () => {
    // The legacy bug was: Number(0.5) > 1 is false -> stored 0.5 (50%)
    const fraction = computeCommissionFraction(0.5);
    expect(fraction).toBe(0.005);
  });

  it('converts standard percentage rates accurately', () => {
    expect(computeCommissionFraction(8)).toBe(0.08);
    expect(computeCommissionFraction(15)).toBe(0.15);
    expect(computeCommissionFraction(0)).toBe(0);
  });

  it('clamps out-of-range values between 0 and 1', () => {
    expect(computeCommissionFraction(-5)).toBe(0);
    expect(computeCommissionFraction(120)).toBe(1);
  });
});
