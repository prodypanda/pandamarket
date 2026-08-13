const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../frontend/src/components/page-builder/PageBuilderEditor.tsx');
const dest = path.join(__dirname, '../frontend/src/components/page-builder/PlatformPageBuilderEditor.tsx');

let content = fs.readFileSync(src, 'utf8');

// Name
content = content.replace(/export default function PageBuilderEditor/g, 'export default function PlatformPageBuilderEditor');

// Remove storeId / storeHost props
content = content.replace(/storeId: string;/g, '');
content = content.replace(/storeHost\?: string \| null;/g, '');
content = content.replace(/storeId,/g, '');
content = content.replace(/storeHost,/g, '');

// Fix references inside
content = content.replace(/storeId/g, '"platform"');
content = content.replace(/storeHost/g, '"platform"');

// Fix "platform" || "platform" issue
content = content.replace(/\"platform\" \|\| \"platform\"/g, '"platform"');
content = content.replace(/\"platform\" \? /g, 'true ? ');
content = content.replace(/!\"platform\"/g, 'false');
content = content.replace(/if \(\"platform\"\)/g, 'if (true)');

// URLs
content = content.replace(/\/api\/pd\/page-builder\/pages/g, '/api/pd/marketplace/cms');
content = content.replace(/\/api\/pd\/stores\/me\/media/g, '/api/pd/platform-media');

// The tricky part: removing the fetch logic for store, products, categories
// We will replace the entire loadOptions body. We know it starts with `const loadOptions = async () => {`
// and ends with `void loadOptions();` (actually it ends before that).
const loadOptionsRegex = /const loadOptions = async \(\) => \{[\s\S]*?\n    };\n    void loadOptions\(\);/;
content = content.replace(loadOptionsRegex, `const loadOptions = async () => {
      setBuilderStore(null);
      setBuilderProducts([]);
      setBuilderCategories([]);
    };
    void loadOptions();`);

// Remove any lingering storeRes json accesses just in case they were outside loadOptions (they shouldn't be)
content = content.replace(/const data = await storeRes\.json\(\);/g, '');

fs.writeFileSync(dest, content);
console.log('Rebuilt PlatformPageBuilderEditor.tsx');
