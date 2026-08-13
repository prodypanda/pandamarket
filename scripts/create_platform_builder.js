const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../frontend/src/components/page-builder/PageBuilderEditor.tsx');
const dest = path.join(__dirname, '../frontend/src/components/page-builder/PlatformPageBuilderEditor.tsx');

let content = fs.readFileSync(src, 'utf8');

// Replace component name
content = content.replace(/PageBuilderEditor/g, 'PlatformPageBuilderEditor');

// Remove storeId and storeHost from props
content = content.replace(/storeId: string;/g, '');
content = content.replace(/storeHost\?: string \| null;/g, '');
content = content.replace(/storeId,/g, '');
content = content.replace(/storeHost,/g, '');

// Change APIs
content = content.replace(/\/api\/pd\/page-builder\/pages/g, '/api/pd/marketplace/cms');

// Change media API to platform-media (if it exists) or keep it if they share media
content = content.replace(/\/api\/pd\/stores\/me\/media/g, '/api/pd/platform-media'); 

fs.writeFileSync(dest, content);
console.log('Created PlatformPageBuilderEditor.tsx');
