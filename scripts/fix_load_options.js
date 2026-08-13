const fs = require('fs');
const path = require('path');

const dest = path.join(__dirname, '../frontend/src/components/page-builder/PlatformPageBuilderEditor.tsx');
let content = fs.readFileSync(dest, 'utf8');

// Replace the entire loadOptions block
const loadOptionsRegex = /const loadOptions = async \(\) => \{[\s\S]*?\n    \};\n    void loadOptions\(\);/;
content = content.replace(loadOptionsRegex, `const loadOptions = async () => {
      setBuilderStore(null);
      setBuilderProducts([]);
      setBuilderCategories([]);
    };
    void loadOptions();`);

fs.writeFileSync(dest, content);
console.log('Fixed loadOptions');
