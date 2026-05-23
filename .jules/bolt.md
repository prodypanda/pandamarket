## 2024-05-23 - [N+1 Query in Express Routes]
**Learning:** [When importing arrays of data in Express routes (like `product.route.ts`), fetching common context data like `storeService.getById(req.user!.store_id!)` inside a `for...of` loop creates severe N+1 database queries, as `req.user.store_id` does not change during the request lifecycle.]
**Action:** [Always audit `for` loops in bulk import/update endpoints. Extract any data fetching that depends solely on `req.user` or other request-level constants outside of the loop.]
