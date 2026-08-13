import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type PlatformSettings } from '@/types/settings';
import {
  getDirtySettingsKeys,
  mergeServerSettingsPreservingDrafts,
  mergeSavedSettings,
  mergeSubmittedSettings,
  pickChangedSettings,
} from './admin-settings-save';

function settings(overrides: Partial<PlatformSettings> = {}): PlatformSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe('admin settings section saves', () => {
  it('submits only changed keys that belong to the active section', () => {
    const saved = settings();
    const normalized = settings({ marketplace_name: 'New Hub', platform_commission_rate: 12 });

    expect(
      pickChangedSettings(normalized, saved, ['marketplace_name', 'marketplace_tagline']),
    ).toEqual({ marketplace_name: 'New Hub' });
  });

  it('preserves drafts from other sections after a successful save', () => {
    const saved = settings();
    const current = settings({ marketplace_name: 'New Hub', platform_commission_rate: 12 });

    const merged = mergeSubmittedSettings(
      current,
      saved,
      { marketplace_name: 'New Hub' },
      { marketplace_name: 'New Hub' },
    );

    expect(merged.current.marketplace_name).toBe('New Hub');
    expect(merged.saved.marketplace_name).toBe('New Hub');
    expect(merged.current.platform_commission_rate).toBe(12);
    expect(merged.saved.platform_commission_rate).toBe(DEFAULT_SETTINGS.platform_commission_rate);
    expect(getDirtySettingsKeys(merged.current, merged.saved, ['platform_commission_rate'])).toEqual([
      'platform_commission_rate',
    ]);
  });

  it('merges a saved response into the latest saved snapshot', () => {
    const latestSaved = settings({ platform_commission_rate: 12 });

    expect(
      mergeSavedSettings(latestSaved, { marketplace_name: 'New Hub' }, { marketplace_name: 'New Hub' }),
    ).toMatchObject({ marketplace_name: 'New Hub', platform_commission_rate: 12 });
  });

  it('does not overwrite an edit made while the save request is in flight', () => {
    const saved = settings();
    const currentAfterClick = settings({ marketplace_name: 'Second draft' });

    const merged = mergeSubmittedSettings(
      currentAfterClick,
      saved,
      { marketplace_name: 'First draft' },
      { marketplace_name: 'First draft' },
      { marketplace_name: 'First draft' },
    );

    expect(merged.current.marketplace_name).toBe('Second draft');
    expect(merged.saved.marketplace_name).toBe('First draft');
  });

  it('does not submit a raw draft that normalizes back to the saved value', () => {
    const saved = settings({ marketplace_name: 'PandaMarket' });
    const normalized = settings({ marketplace_name: 'PandaMarket' });

    expect(pickChangedSettings(normalized, saved, ['marketplace_name'])).toEqual({});
  });

  it('refreshes clean fields from the server while retaining local drafts', () => {
    const saved = settings();
    const current = settings({ marketplace_name: 'Local draft' });

    const merged = mergeServerSettingsPreservingDrafts(current, saved, {
      marketplace_name: 'Changed by another admin',
      marketplace_tagline: 'Fresh server tagline',
    });

    expect(merged.current.marketplace_name).toBe('Local draft');
    expect(merged.saved.marketplace_name).toBe('Changed by another admin');
    expect(merged.current.marketplace_tagline).toBe('Fresh server tagline');
    expect(merged.saved.marketplace_tagline).toBe('Fresh server tagline');
  });
});
