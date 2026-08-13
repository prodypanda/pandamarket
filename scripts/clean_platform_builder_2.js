const fs = require('fs');
const path = require('path');

const dest = path.join(__dirname, '../frontend/src/components/page-builder/PlatformPageBuilderEditor.tsx');
let content = fs.readFileSync(dest, 'utf8');

// Fix storeId missing
content = content.replace(/storeId/g, '"platform"');

// Fix storeRes missing
content = content.replace(/if \(storeRes\.ok\) \{/g, 'if (false) {');
content = content.replace(/const storeData = await storeRes\.json\(\);/g, '');

// Fix json() on { ok: false }
content = content.replace(/await productsRes\.json\(\)/g, '[]');
content = content.replace(/await categoriesRes\.json\(\)/g, '[]');

// Fix storeHost missing
content = content.replace(/storeHost/g, '"platform"');

fs.writeFileSync(dest, content);
console.log('Cleaned PlatformPageBuilderEditor.tsx again');
