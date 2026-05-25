## 2026-05-19 - Fixing N+1 in product import
**Learning:** An N+1 query issue existed in backend/src/api/product.route.ts during bulk product import because the invariant storeService.getById(req.user.store_id) was called inside the products parsing loop. Resolving invariant DB lookups before entering loops drastically reduces load during bulk insertions.
**Action:** Always audit for loops and map operations involving database or service lookups to verify if they depend on loop variables, and hoist loop-invariant queries outside.
