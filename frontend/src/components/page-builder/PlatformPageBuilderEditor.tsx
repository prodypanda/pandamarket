'use client';

/**
 * Platform CMS page builder — thin wrapper around the shared core (audit E17
 * dedup). Talks to /api/pd/marketplace/cms and previews on the Hub.
 */

import type { ComponentProps } from 'react';
import { PageBuilderEditorCore } from './PageBuilderEditorCore';

type CoreProps = ComponentProps<typeof PageBuilderEditorCore>;

export interface PlatformPageBuilderEditorProps extends Omit<CoreProps, 'mode' | 'storeId'> {
  /** Storefront-style props are not used by the platform variant. */
  storeHost?: null;
}

export function PlatformPageBuilderEditor(props: PlatformPageBuilderEditorProps) {
  return <PageBuilderEditorCore {...props} mode="platform" />;
}

/** Historic alias — the admin CMS page imports this name. */
export { PlatformPageBuilderEditor as PageBuilderEditor };
