'use client';

import React, { useContext } from 'react';
import { themeComponents } from './ThemeWrapper';
import type { ThemeProps } from './shared';
import { StorefrontProductLoadingContext } from '../store/StorefrontProductLoadingContext';

export function StorefrontThemeRenderer(props: ThemeProps) {
  const Component = themeComponents[props.theme.id] || themeComponents.classic;
  const loading = useContext(StorefrontProductLoadingContext);
  return <Component {...props} products={loading?.products || props.products} />;
}
