const fs = require('fs');
const content = fs.readFileSync('backend/src/utils/metrics.ts', 'utf-8');
console.log(content.slice(0, 500));
