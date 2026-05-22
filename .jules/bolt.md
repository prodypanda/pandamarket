## 2024-05-22 - Prevent HubHomeContent ProductCard unnecessary renders
**Learning:** In list rendering components like `HubHomeContent` where the list relies on parent data updates, inline sub-components (like `ProductCard`) that receive primitive or memoized props can trigger expensive rendering trees. Wrapping them in `React.memo` effectively isolates these renders.
**Action:** Always verify if list items like `ProductCard` are being recreated on parent state changes, and wrap them in `React.memo` if their props are stable or simply primitives.
