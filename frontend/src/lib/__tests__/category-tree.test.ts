import { describe, it, expect } from 'vitest';
import { buildHierarchicalCategoryList, searchHierarchicalCategories } from '../category-tree';

describe('Category Tree & Hierarchy Utilities', () => {
  const mockCategories = [
    { id: 'cat-2-1', name: 'Smartphones', parent_id: 'cat-2', position: 1 },
    { id: 'cat-1', name: 'Artisanat', parent_id: null, position: 1 },
    { id: 'cat-1-1', name: 'Céramique', parent_id: 'cat-1', position: 1 },
    { id: 'cat-1-1-1', name: 'Vases de Nabeul', parent_id: 'cat-1-1', position: 1 },
    { id: 'cat-2', name: 'High-Tech', parent_id: null, position: 2 },
    { id: 'cat-1-2', name: 'Tapis', parent_id: 'cat-1', position: 2 },
  ];

  it('orders categories in strict depth-first hierarchy', () => {
    const list = buildHierarchicalCategoryList(mockCategories);

    expect(list.map((c) => c.name)).toEqual([
      'Artisanat',
      'Céramique',
      'Vases de Nabeul',
      'Tapis',
      'High-Tech',
      'Smartphones',
    ]);

    expect(list.map((c) => c.level)).toEqual([0, 1, 2, 1, 0, 1]);
    expect(list[2].pathString).toBe('Artisanat › Céramique › Vases de Nabeul');
    expect(list[5].pathString).toBe('High-Tech › Smartphones');
  });

  it('filters categories by name or breadcrumb path', () => {
    const list = buildHierarchicalCategoryList(mockCategories);
    const results = searchHierarchicalCategories(list, 'vases');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Vases de Nabeul');
    expect(results[0].pathString).toBe('Artisanat › Céramique › Vases de Nabeul');
  });

  it('handles accent-insensitive searches', () => {
    const list = buildHierarchicalCategoryList(mockCategories);
    const results = searchHierarchicalCategories(list, 'ceramique');

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].name).toBe('Céramique');
  });
});
