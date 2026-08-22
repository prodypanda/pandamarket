import React from 'react';
import { MinimalTheme } from './MinimalTheme';
import { ClassicTheme } from './ClassicTheme';
import { ModernTheme } from './ModernTheme';
import { BoutiqueTheme } from './BoutiqueTheme';
import { ArtisanTheme } from './ArtisanTheme';
import { TechHubTheme } from './TechHubTheme';
import { FlavorTheme } from './FlavorTheme';
import { EleganceTheme } from './EleganceTheme';
import { NeonTheme } from './NeonTheme';
import { SaharaTheme } from './SaharaTheme';
import { MedinaTheme } from './MedinaTheme';
import { CoastalTheme } from './CoastalTheme';
import { UrbanTheme } from './UrbanTheme';
import { GardenTheme } from './GardenTheme';
import { StudioTheme } from './StudioTheme';
import { LuxeTheme } from './LuxeTheme';
import { FreshTheme } from './FreshTheme';
import { CraftTheme } from './CraftTheme';
import { DigitalTheme } from './DigitalTheme';
import { KidsTheme } from './KidsTheme';
import { type ThemeProps } from './shared';

const themeComponents: Record<string, React.FC<ThemeProps>> = {
  minimal: MinimalTheme,
  classic: ClassicTheme,
  modern: ModernTheme,
  boutique: BoutiqueTheme,
  artisan: ArtisanTheme,
  techhub: TechHubTheme,
  flavor: FlavorTheme,
  elegance: EleganceTheme,
  neon: NeonTheme,
  sahara: SaharaTheme,
  medina: MedinaTheme,
  coastal: CoastalTheme,
  urban: UrbanTheme,
  garden: GardenTheme,
  studio: StudioTheme,
  luxe: LuxeTheme,
  fresh: FreshTheme,
  craft: CraftTheme,
  digital: DigitalTheme,
  kids: KidsTheme,
};

export function renderStorefrontTheme(props: ThemeProps) {
  const Component = themeComponents[props.theme.id] || ClassicTheme;
  return <Component {...props} />;
}

export { themeComponents };
