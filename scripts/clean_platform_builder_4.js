const fs = require('fs');
const path = require('path');

const dest = path.join(__dirname, '../frontend/src/components/page-builder/PlatformPageBuilderEditor.tsx');
let content = fs.readFileSync(dest, 'utf8');

// Completely rewrite loadOptions to be empty
content = content.replace(/const loadOptions = async \(\) => \{[\s\S]*?\};/m, `const loadOptions = async () => {
      try {
        setBuilderStore(null);
        setBuilderProducts([]);
        setBuilderCategories([]);
      } catch (e) {
      }
    };`);

// Check if storeRes is still in the file anywhere and remove it if it causes errors
// No, the above replacement should fix it entirely.

fs.writeFileSync(dest, content);
console.log('Cleaned loadOptions');
