const fs = require('fs');
const path = require('path');

const dest = path.join(__dirname, '../frontend/src/components/page-builder/PlatformPageBuilderEditor.tsx');

let content = fs.readFileSync(dest, 'utf8');

// Remove the Promise.all for stores/me, products, categories
content = content.replace(/const \[storeRes, productsRes, categoriesRes\] = await Promise\.all\(\[\s+fetchWithCsrf\('\/api\/pd\/stores\/me', \{ credentials: 'include' \}\),\s+fetchWithCsrf\('\/api\/pd\/stores\/me\/products\?limit=100&status=published', \{ credentials: 'include' \}\),\s+fetchWithCsrf\('\/api\/pd\/stores\/me\/categories', \{ credentials: 'include' \}\),\s+\]\);/g, 'const productsRes = { ok: false }; const categoriesRes = { ok: false };');

// Also the json parsing
content = content.replace(/if \(productsRes\.ok\) {/g, 'if (false) {');
content = content.replace(/if \(categoriesRes\.ok\) {/g, 'if (false) {');
content = content.replace(/const storeData = await storeRes\.json\(\);/g, '');
content = content.replace(/setHasProductBlocks\(true\);/g, '');

fs.writeFileSync(dest, content);
console.log('Cleaned PlatformPageBuilderEditor.tsx');
