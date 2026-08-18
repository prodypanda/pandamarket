import { describe, it, expect } from 'vitest';
import { computeBundleAvailableStock, ProductBundleItemRow } from '../services/product.service';
import { ProductType } from '@pandamarket/types';

describe('Product Bundles & Packs Logic', () => {
  it('should compute bundle stock as 0 when bundle has no items', () => {
    expect(computeBundleAvailableStock([])).toBe(0);
    expect(computeBundleAvailableStock(undefined)).toBe(0);
  });

  it('should compute bundle available stock as min(floor(stock_i / qty_i))', () => {
    const items: ProductBundleItemRow[] = [
      {
        id: 'bi_1',
        bundle_product_id: 'bundle_1',
        product_id: 'prod_1',
        variant_id: null,
        quantity: 2,
        position: 0,
        created_at: new Date(),
        updated_at: new Date(),
        product_inventory_quantity: 10, // 10 / 2 = 5 packs
      },
      {
        id: 'bi_2',
        bundle_product_id: 'bundle_1',
        product_id: 'prod_2',
        variant_id: 'var_2',
        quantity: 1,
        position: 1,
        created_at: new Date(),
        updated_at: new Date(),
        product_inventory_quantity: 50,
        variant_inventory_quantity: 3, // 3 / 1 = 3 packs
      },
    ];

    expect(computeBundleAvailableStock(items)).toBe(3);
  });

  it('should return 0 available stock if any component is out of stock', () => {
    const items: ProductBundleItemRow[] = [
      {
        id: 'bi_1',
        bundle_product_id: 'bundle_1',
        product_id: 'prod_1',
        variant_id: null,
        quantity: 1,
        position: 0,
        created_at: new Date(),
        updated_at: new Date(),
        product_inventory_quantity: 100,
      },
      {
        id: 'bi_2',
        bundle_product_id: 'bundle_1',
        product_id: 'prod_2',
        variant_id: null,
        quantity: 1,
        position: 1,
        created_at: new Date(),
        updated_at: new Date(),
        product_inventory_quantity: 0,
      },
    ];

    expect(computeBundleAvailableStock(items)).toBe(0);
  });
});
