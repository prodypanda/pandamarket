'use client';

import { useLocale } from '../../contexts/LocaleContext';
import { getSellerTypeLabel } from '../../lib/seller-type';

interface SellerTypeTextProps {
  sellerType?: string | null;
}

export function SellerTypeText({ sellerType }: SellerTypeTextProps) {
  const { t } = useLocale();
  return <>{getSellerTypeLabel(sellerType, t)}</>;
}
