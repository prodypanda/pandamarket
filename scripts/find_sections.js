const fs = require('fs');
const content = fs.readFileSync('frontend/src/app/(admin)/settings/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('activeTab ===')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
