'use client';

/**
 * Store page builder — thin wrapper around the shared core (audit E17 dedup).
 * Talks to /api/pd/page-builder and previews on the vendor storefront.
 */

import type { ComponentProps } from 'react';
import { PageBuilderEditorCore } from './PageBuilderEditorCore';

type CoreProps = ComponentProps<typeof PageBuilderEditorCore>;

export interface PageBuilderEditorProps extends Omit<CoreProps, 'mode'> {
  storeId: string;
}

export function PageBuilderEditor(props: PageBuilderEditorProps) {
  return <PageBuilderEditorCore {...props} mode="store" />;
}
