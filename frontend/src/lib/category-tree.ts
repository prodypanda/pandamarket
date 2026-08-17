/**
 * Category Tree & Hierarchy Utilities
 *
 * Flattens nested or flat categories into strict depth-first tree order
 * and provides full breadcrumb path resolution and multi-level search.
 */

export interface BaseCategoryNode {
  id: string;
  name: string;
  slug?: string;
  parent_id?: string | null;
  parent_name?: string | null;
  position?: number;
  product_count?: number | string;
  [key: string]: any;
}

export interface HierarchicalCategory<T extends BaseCategoryNode = BaseCategoryNode> {
  category: T;
  id: string;
  name: string;
  slug?: string;
  level: number;
  path: string[];
  pathString: string;
  hasChildren: boolean;
  productCount: number;
}

/**
 * Builds a depth-first ordered hierarchical category list with level and path metadata.
 */
export function buildHierarchicalCategoryList<T extends BaseCategoryNode>(
  categories: T[]
): HierarchicalCategory<T>[] {
  if (!categories || categories.length === 0) return [];

  // Index categories by ID and collect children per parent
  const categoryMap = new Map<string, T>();
  const childrenMap = new Map<string, T[]>();
  const rootCategories: T[] = [];

  for (const cat of categories) {
    categoryMap.set(cat.id, cat);
  }

  for (const cat of categories) {
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      const existing = childrenMap.get(cat.parent_id) || [];
      existing.push(cat);
      childrenMap.set(cat.parent_id, existing);
    } else {
      rootCategories.push(cat);
    }
  }

  // Sort nodes by position ASC, then name ASC
  const sortNodes = (nodes: T[]) => {
    return nodes.sort((a, b) => {
      const posA = typeof a.position === 'number' ? a.position : 0;
      const posB = typeof b.position === 'number' ? b.position : 0;
      if (posA !== posB) return posA - posB;
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  sortNodes(rootCategories);
  for (const [parentId, children] of childrenMap.entries()) {
    childrenMap.set(parentId, sortNodes(children));
  }

  const result: HierarchicalCategory<T>[] = [];

  function traverse(node: T, level: number, currentPath: string[]) {
    const newPath = [...currentPath, node.name];
    const children = childrenMap.get(node.id) || [];
    const count = typeof node.product_count === 'number'
      ? node.product_count
      : parseInt(String(node.product_count || '0'), 10);

    result.push({
      category: node,
      id: node.id,
      name: node.name,
      slug: node.slug,
      level,
      path: newPath,
      pathString: newPath.join(' › '),
      hasChildren: children.length > 0,
      productCount: isNaN(count) ? 0 : count,
    });

    for (const child of children) {
      traverse(child, level + 1, newPath);
    }
  }

  for (const root of rootCategories) {
    traverse(root, 0, []);
  }

  return result;
}

/**
 * Filter hierarchical categories by search query.
 * Matches against category name, slug, parent names, or full breadcrumb path.
 */
export function searchHierarchicalCategories<T extends BaseCategoryNode>(
  list: HierarchicalCategory<T>[],
  query: string
): HierarchicalCategory<T>[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) return list;

  const normalizedQ = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return list.filter((item) => {
    const normName = (item.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normPath = item.pathString.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normSlug = (item.slug || '').toLowerCase();

    return normName.includes(normalizedQ) || normPath.includes(normalizedQ) || normSlug.includes(normalizedQ);
  });
}
