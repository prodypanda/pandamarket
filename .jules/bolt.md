## 2026-05-15 - Debounce React States for Backend Search Filters
**Learning:** Implementing debouncing on search filter parameters (like price, product types, etc) before passing them to the API fetch callback significantly reduces unnecessary network requests, mitigating backend load and minimizing front-end re-renders during user input.
**Action:** Prioritize debouncing fast-changing filter states (like text inputs and rapid toggles) to optimize search and filtering performance.
