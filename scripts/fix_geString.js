const fs = require('fs');
const path = require('path');

const hubFiles = ['AlibabaHomeContent.tsx', 'AliExpressHomeContent.tsx', 'AmazonHomeContent.tsx'];
for (const file of hubFiles) {
  const p = path.join('frontend/src/components/hub', file);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/geString\(/g, 'get(');
    content = content.replace(/t\((['"].*?['"])\)/g, 'String($1)');
    fs.writeFileSync(p, content);
  }
}
console.log('Fixed geString in hub');
