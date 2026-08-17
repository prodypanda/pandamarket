import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { categoryService, resolveStorefrontCategoryLocale } from '../services/category.service';
import { productService } from '../services/product.service';
import { query } from '../db/pool';
import { pdId } from '../utils/crypto';
import { ProductStatus, ProductType } from '@pandamarket/types';

describe('Storefront Category Hierarchy & Subcategories', () => {
  const testStoreId = pdId('str_test_cat');
  const testUserId = pdId('usr_test_cat');
  let createdCategoryIds: string[] = [];
  let createdProductIds: string[] = [];

  beforeAll(async () => {
    // Create test user and store
    await query(
      `INSERT INTO pd_user (id, email, password_hash, role, first_name, last_name)
       VALUES ($1, $2, 'hash_test', 'seller', 'Test', 'Seller')
       ON CONFLICT (email) DO NOTHING`,
      [testUserId, `seller_${testStoreId}@test.com`],
    );

    await query(
      `INSERT INTO pd_store (id, owner_id, name, subdomain, status, is_verified, shipping_mode)
       VALUES ($1, $2, 'Test Cat Store', $3, 'verified', true, 'platform_unified')
       ON CONFLICT (id) DO NOTHING`,
      [testStoreId, testUserId, `test-cat-store-${Date.now()}`],
    );
  });

  afterAll(async () => {
    // Clean up created products, categories, store, user
    if (createdProductIds.length > 0) {
      await query('DELETE FROM pd_product WHERE id = ANY($1::text[])', [createdProductIds]);
    }
    if (createdCategoryIds.length > 0) {
      await query('DELETE FROM pd_storefront_category WHERE id = ANY($1::text[])', [createdCategoryIds]);
    }
    await query('DELETE FROM pd_storefront_category WHERE store_id = $1', [testStoreId]);
    await query('DELETE FROM pd_store WHERE id = $1', [testStoreId]);
    await query('DELETE FROM pd_user WHERE id = $1', [testUserId]);
  });

  it('creates top-level and nested subcategories with rich metadata and translations', async () => {
    // 1. Create Top-level Category
    const parentCat = await categoryService.createStorefrontCategory(testStoreId, {
      name: 'Vêtements Homme',
      name_fr: 'Vêtements Homme',
      name_ar: 'ملابس رجالية',
      name_en: "Men's Clothing",
      description: 'Collection mode homme',
      description_fr: 'Collection mode homme',
      description_ar: 'تشكيلة أزياء رجالية',
      description_en: "Men's fashion collection",
      icon: 'Shirt',
      position: 1,
      seo_title: 'Vêtements Homme Tunisie',
      seo_description: 'Achetez vos vêtements homme de qualité',
      show_in_megamenu: true,
    });

    createdCategoryIds.push(parentCat.id);
    expect(parentCat.id).toBeDefined();
    expect(parentCat.name).toBe('Vêtements Homme');
    expect(parentCat.name_ar).toBe('ملابس رجالية');
    expect(parentCat.icon).toBe('Shirt');
    expect(parentCat.parent_id).toBeNull();

    // 2. Create Level 2 Subcategory
    const subCat1 = await categoryService.createStorefrontCategory(testStoreId, {
      parent_id: parentCat.id,
      name: 'Pantalons & Jeans',
      name_fr: 'Pantalons & Jeans',
      name_ar: 'سراويل وجينز',
      name_en: 'Pants & Jeans',
      position: 1,
      icon: 'Layers',
    });
    createdCategoryIds.push(subCat1.id);
    expect(subCat1.parent_id).toBe(parentCat.id);

    // 3. Create Level 3 Nested Subcategory
    const subCat2 = await categoryService.createStorefrontCategory(testStoreId, {
      parent_id: subCat1.id,
      name: 'Jeans Slim Fit',
      name_fr: 'Jeans Slim Fit',
      name_ar: 'جينز ضيق',
      name_en: 'Slim Fit Jeans',
      position: 1,
    });
    createdCategoryIds.push(subCat2.id);
    expect(subCat2.parent_id).toBe(subCat1.id);
  });

  it('prevents circular parent-child category relationships', async () => {
    const catA = await categoryService.createStorefrontCategory(testStoreId, { name: 'Cat A' });
    const catB = await categoryService.createStorefrontCategory(testStoreId, { name: 'Cat B', parent_id: catA.id });
    createdCategoryIds.push(catA.id, catB.id);

    // Setting Cat A's parent to Cat B should throw validation error
    await expect(
      categoryService.updateStorefrontCategory(testStoreId, catA.id, { parent_id: catB.id }),
    ).rejects.toThrow(/Circular/i);

    // Setting Cat A's parent to itself should throw validation error
    await expect(
      categoryService.updateStorefrontCategory(testStoreId, catA.id, { parent_id: catA.id }),
    ).rejects.toThrow(/cannot be its own parent/i);
  });

  it('lists storefront categories as a tree and rolls up recursive product counts', async () => {
    const root = await categoryService.createStorefrontCategory(testStoreId, { name: 'High-Tech' });
    const child = await categoryService.createStorefrontCategory(testStoreId, {
      name: 'Smartphones',
      parent_id: root.id,
    });
    createdCategoryIds.push(root.id, child.id);

    // Create a product in child category
    const prod = await productService.create({
      store_id: testStoreId,
      store_plan: 'free',
      store_is_verified: true,
      type: ProductType.Physical,
      title: 'Galaxy Smartphone Test',
      price: 999.0,
      storefront_category_id: child.id,
      status: ProductStatus.Published,
    });
    createdProductIds.push(prod.id);

    // Query categories with tree = true
    const tree = await categoryService.listStorefrontCategories(testStoreId, { tree: true });
    const highTechNode = tree.find((c) => c.id === root.id);

    expect(highTechNode).toBeDefined();
    expect(highTechNode?.children).toBeDefined();
    expect(highTechNode?.children?.length).toBeGreaterThanOrEqual(1);
    // Root should aggregate product count from child (1)
    expect(parseInt(highTechNode?.product_count || '0', 10)).toBeGreaterThanOrEqual(1);
  });

  it('resolves localized storefront category fields according to locale', () => {
    const rawCat = {
      id: 'scat_1',
      store_id: 'str_1',
      parent_id: null,
      name: 'Mode',
      name_fr: 'Mode Française',
      name_ar: 'الموضة والأزياء',
      name_en: 'Fashion & Style',
      slug: 'mode',
      description: 'Desc FR',
      description_fr: 'Desc FR',
      description_ar: 'وصف بالعربي',
      description_en: 'Desc EN',
      short_description: null,
      long_description: null,
      image_url: null,
      is_default: false,
      is_active: true,
      position: 1,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const arResolved = resolveStorefrontCategoryLocale(rawCat, 'ar');
    expect(arResolved.name).toBe('الموضة والأزياء');
    expect(arResolved.description).toBe('وصف بالعربي');

    const enResolved = resolveStorefrontCategoryLocale(rawCat, 'en');
    expect(enResolved.name).toBe('Fashion & Style');
    expect(enResolved.description).toBe('Desc EN');

    const frResolved = resolveStorefrontCategoryLocale(rawCat, 'fr');
    expect(frResolved.name).toBe('Mode Française');
  });

  it('reorders and reparents storefront categories via reorderStorefrontCategories', async () => {
    const cat1 = await categoryService.createStorefrontCategory(testStoreId, { name: 'Item 1', position: 10 });
    const cat2 = await categoryService.createStorefrontCategory(testStoreId, { name: 'Item 2', position: 20 });
    createdCategoryIds.push(cat1.id, cat2.id);

    await categoryService.reorderStorefrontCategories(testStoreId, [
      { id: cat1.id, position: 20, parent_id: cat2.id },
      { id: cat2.id, position: 5, parent_id: null },
    ]);

    const updatedTree = await categoryService.listStorefrontCategories(testStoreId, { tree: true });
    const item2Node = updatedTree.find((c) => c.id === cat2.id);
    expect(item2Node).toBeDefined();
    expect(item2Node?.position).toBe(5);
    expect(item2Node?.children?.some((c) => c.id === cat1.id)).toBe(true);
  });

  it('calculates delete impact and safely deletes category with product and subcategory reassignment', async () => {
    const parent = await categoryService.createStorefrontCategory(testStoreId, { name: 'To Delete Parent' });
    const child = await categoryService.createStorefrontCategory(testStoreId, {
      name: 'To Delete Child',
      parent_id: parent.id,
    });
    createdCategoryIds.push(parent.id, child.id);

    const prod = await productService.create({
      store_id: testStoreId,
      store_plan: 'free',
      store_is_verified: true,
      type: ProductType.Physical,
      title: 'Product In Parent',
      price: 50.0,
      storefront_category_id: parent.id,
      status: ProductStatus.Published,
    });
    createdProductIds.push(prod.id);

    // 1. Get delete impact
    const impact = await categoryService.getStorefrontDeleteImpact(testStoreId, parent.id);
    expect(impact.product_count).toBe(1);
    expect(impact.subcategories_count).toBe(1);

    // 2. Attempt deletion without confirm flag -> Should throw PdConflictError
    await expect(
      categoryService.deleteStorefrontCategory(testStoreId, parent.id, false),
    ).rejects.toThrow(/contains products or subcategories/i);

    // 3. Confirm deletion -> Should succeed and reparent child to null & reassign product to fallback
    const result = await categoryService.deleteStorefrontCategory(testStoreId, parent.id, true);
    expect(result.reassigned_products).toBe(1);
    expect(result.reparented_subcategories).toBe(1);

    // Verify child subcategory was promoted
    const categories = await categoryService.listStorefrontCategories(testStoreId);
    const promotedChild = categories.find((c) => c.id === child.id);
    expect(promotedChild).toBeDefined();
    expect(promotedChild?.parent_id).toBeNull();
  });

  it('recursively filters products when filtering by a parent storefront category', async () => {
    const parent = await categoryService.createStorefrontCategory(testStoreId, { name: 'Root Category Filter' });
    const child = await categoryService.createStorefrontCategory(testStoreId, {
      name: 'Child Category Filter',
      parent_id: parent.id,
    });
    createdCategoryIds.push(parent.id, child.id);

    const prodChild = await productService.create({
      store_id: testStoreId,
      store_plan: 'free',
      store_is_verified: true,
      type: ProductType.Physical,
      title: 'Subcategory Product Search Test',
      price: 120.0,
      storefront_category_id: child.id,
      status: ProductStatus.Published,
    });
    createdProductIds.push(prodChild.id);

    // Filter by parent category ID on store
    const listResult = await productService.listPublished({
      storeId: testStoreId,
      storefrontCategoryId: parent.id,
    });

    expect(listResult.data.some((p) => p.id === prodChild.id)).toBe(true);

    // Filter by parent category slug on store
    const listBySlug = await productService.listPublished({
      storeId: testStoreId,
      category: parent.slug,
    });

    expect(listBySlug.data.some((p) => p.id === prodChild.id)).toBe(true);
  });
});
