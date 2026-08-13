import type { PlatformSettings, PlatformSettingsTab } from '@/types/settings';

export type SettingsSectionVersions = Partial<Record<PlatformSettingsTab, string | null>>;

export interface PlatformSettingsResponse {
  data?: Partial<PlatformSettings>;
  sections?: Partial<Record<PlatformSettingsTab, Partial<PlatformSettings>>>;
  section_versions?: SettingsSectionVersions;
  updated_keys?: Array<keyof PlatformSettings>;
}

export function getDirtySettingsKeys(
  current: PlatformSettings,
  saved: PlatformSettings,
  allowedKeys: readonly (keyof PlatformSettings)[],
): Array<keyof PlatformSettings> {
  return allowedKeys.filter((key) => current[key] !== saved[key]);
}

export function pickSettingsKeys(
  settings: PlatformSettings,
  keys: readonly (keyof PlatformSettings)[],
): Partial<PlatformSettings> {
  const picked: Partial<PlatformSettings> = {};
  for (const key of keys) {
    picked[key] = settings[key] as never;
  }
  return picked;
}

export function pickChangedSettings(
  normalized: PlatformSettings,
  saved: PlatformSettings,
  allowedKeys: readonly (keyof PlatformSettings)[],
): Partial<PlatformSettings> {
  return pickSettingsKeys(normalized, getDirtySettingsKeys(normalized, saved, allowedKeys));
}

export function mergeSubmittedSettings(
  current: PlatformSettings,
  saved: PlatformSettings,
  submitted: Partial<PlatformSettings>,
  responseData?: Partial<PlatformSettings>,
  submittedDraft: Partial<PlatformSettings> = submitted,
): { current: PlatformSettings; saved: PlatformSettings } {
  const submittedKeys = Object.keys(submitted) as Array<keyof PlatformSettings>;
  const nextCurrent = { ...current };
  const nextSaved = { ...saved };

  for (const key of submittedKeys) {
    const persistedValue = responseData?.[key] ?? submitted[key];
    if (persistedValue === undefined) continue;

    nextSaved[key] = persistedValue as never;
    if (current[key] === submittedDraft[key]) {
      nextCurrent[key] = persistedValue as never;
    }
  }

  return { current: nextCurrent, saved: nextSaved };
}

export function mergeSavedSettings(
  saved: PlatformSettings,
  submitted: Partial<PlatformSettings>,
  responseData?: Partial<PlatformSettings>,
): PlatformSettings {
  const nextSaved = { ...saved };
  for (const key of Object.keys(submitted) as Array<keyof PlatformSettings>) {
    const persistedValue = responseData?.[key] ?? submitted[key];
    if (persistedValue !== undefined) nextSaved[key] = persistedValue as never;
  }
  return nextSaved;
}

export function mergeServerSettingsPreservingDrafts(
  current: PlatformSettings,
  saved: PlatformSettings,
  server: Partial<PlatformSettings>,
): { current: PlatformSettings; saved: PlatformSettings } {
  const nextCurrent = { ...current };
  const nextSaved = { ...saved };

  for (const key of Object.keys(server) as Array<keyof PlatformSettings>) {
    const serverValue = server[key];
    if (serverValue === undefined) continue;

    if (current[key] === saved[key]) {
      nextCurrent[key] = serverValue as never;
    }
    nextSaved[key] = serverValue as never;
  }

  return { current: nextCurrent, saved: nextSaved };
}
