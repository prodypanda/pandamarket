import { describe, it, expect } from 'vitest';
import { PLATFORM_SETTING_SECTION_KEYS } from '../services/platform-config.service';

describe('PLAN-B-15: Mandat Bank Keys in Finance Settings', () => {
  it('includes mandat bank details in finance settings section', () => {
    const financeKeys = PLATFORM_SETTING_SECTION_KEYS.finance;

    expect(financeKeys).toContain('mandat_recipient_name');
    expect(financeKeys).toContain('mandat_recipient_cin');
    expect(financeKeys).toContain('mandat_recipient_city');
    expect(financeKeys).toContain('mandat_bank_name');
    expect(financeKeys).toContain('mandat_bank_rib');
    expect(financeKeys).toContain('mandat_bank_iban');
    expect(financeKeys).toContain('mandat_recipient_phone');
    expect(financeKeys).toContain('mandat_proof_email');
  });
});
