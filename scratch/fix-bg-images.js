const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../frontend/src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) walkDir(dirPath, callback);
    else callback(dirPath);
  });
}

const filesToUpdate = [];

walkDir(srcDir, (filePath) => {
  if (filePath.endsWith('.tsx')) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('backgroundImage: `url(${') || content.includes('backgroundImage: `linear-gradient')) {
      if (filePath.includes('ProductCard') || filePath.includes('ProductGallery')) return; // already done
      filesToUpdate.push(filePath);
    }
  }
});

let updatedCount = 0;

for (const file of filesToUpdate) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  const needsImport = !content.includes('getResizedImageUrl');
  
  if (needsImport) {
    const firstImportMatch = content.match(/^import /m);
    if (firstImportMatch) {
      content = content.replace(/^import /m, "import { getResizedImageUrl } from '@/lib/image-url';\nimport ");
    } else {
      if (content.includes('use client')) {
        content = content.replace(/['"]use client['"];?/, "$&\nimport { getResizedImageUrl } from '@/lib/image-url';");
      } else {
        content = "import { getResizedImageUrl } from '@/lib/image-url';\n" + content;
      }
    }
  }

  const regexes = [
    { match: /backgroundImage: `url\(\$\{([a-zA-Z0-9_\.\?]+)\}\)`/g, replace: "backgroundImage: `url(${getResizedImageUrl($1, 'large')})`" },
    { match: /backgroundImage: `url\(\$\{([a-zA-Z0-9_\.\?]+ \? [a-zA-Z0-9_\.\?]+ : [a-zA-Z0-9_\.\?]+)\}\)`/g, replace: "backgroundImage: `url(${getResizedImageUrl($1, 'large')})`" },
    { match: /backgroundImage: `url\(\$\{([a-zA-Z0-9_\.\?]+ \|\| [a-zA-Z0-9_\.\?]+)\}\)`/g, replace: "backgroundImage: `url(${getResizedImageUrl($1, 'large')})`" },
    { match: /backgroundImage: `url\(\$\{getProductImage\((.*?)\)\}\)`/g, replace: "backgroundImage: `url(${getResizedImageUrl(getProductImage($1), 'large')})`" },
    { match: /backgroundImage: `url\(\$\{([a-zA-Z0-9_\.\?]+imageUrl)\}\)`/g, replace: "backgroundImage: `url(${getResizedImageUrl($1, 'large')})`" }
  ];

  for (const {match, replace} of regexes) {
    content = content.replace(match, (fullMatch, p1) => {
      if (fullMatch.includes('getResizedImageUrl')) return fullMatch;
      if (typeof p1 === 'string' && p1.includes('(') && !fullMatch.includes('getProductImage')) return fullMatch; // skip func calls except getProductImage
      return replace.replaceAll('$1', p1);
    });
  }
  
  if (content !== original) {
    const lines = content.split('\n');
    const seenImports = new Set();
    const finalLines = [];
    for (const line of lines) {
      if (line.trim() === "import { getResizedImageUrl } from '@/lib/image-url';") {
        if (seenImports.has(line)) continue;
        seenImports.add(line);
      }
      finalLines.push(line);
    }
    
    fs.writeFileSync(file, finalLines.join('\n'), 'utf8');
    updatedCount++;
    console.log('Updated', file);
  }
}

console.log('Total background image files updated:', updatedCount);
