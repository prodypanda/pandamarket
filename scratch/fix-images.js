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
    if (content.includes('<img') || content.includes('<LazyBlurImage') || content.includes('<Image')) {
      if (filePath.includes('ProductCard') || filePath.includes('ProductGallery')) return; // already done
      filesToUpdate.push(filePath);
    }
  }
});

let updatedCount = 0;

for (const file of filesToUpdate) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Add import if needed
  const needsImport = /<img|<LazyBlurImage|<Image/.test(content) && /(image_url|url|thumbnail|image|bannerImage|logoUrl|creative\.image_url|product\.thumbnail|asset\.url)/.test(content) && !content.includes('getResizedImageUrl');
  
  if (needsImport) {
    const firstImportMatch = content.match(/^import /m);
    if (firstImportMatch) {
      content = content.replace(/^import /m, "import { getResizedImageUrl } from '@/lib/image-url';\nimport ");
    } else {
      // Maybe there's a 'use client'
      if (content.includes('use client')) {
        content = content.replace(/['"]use client['"];?/, "$&\nimport { getResizedImageUrl } from '@/lib/image-url';");
      } else {
        content = "import { getResizedImageUrl } from '@/lib/image-url';\n" + content;
      }
    }
  }

  // Very naive replacements for specific variables we know exist
  // We will try to replace specific props
  
  const replacements = [
    // src={cat.image_url} -> src={cat.image_url ? getResizedImageUrl(cat.image_url, 'small') : ''}
    // But it's easier to just do regex on src={...}
  ];

  // Actually, string replacement is safer if I manually script the common patterns
  const regexes = [
    { match: /src=\{([a-zA-Z0-9_\.\?]+image_url)\}/g, replace: "src={$1 ? getResizedImageUrl($1, 'medium') : ''}" },
    { match: /src=\{([a-zA-Z0-9_\.\?]+url)\}/g, replace: "src={$1 ? getResizedImageUrl($1, 'medium') : ''}" },
    { match: /src=\{([a-zA-Z0-9_\.\?]+thumbnail)\}/g, replace: "src={$1 ? getResizedImageUrl($1, 'medium') : ''}" },
    { match: /src=\{image\}/g, replace: "src={image ? getResizedImageUrl(image, 'large') : ''}" },
    { match: /src=\{bannerImage\}/g, replace: "src={bannerImage ? getResizedImageUrl(bannerImage, 'large') : ''}" },
    { match: /src=\{logoUrl\}/g, replace: "src={logoUrl ? getResizedImageUrl(logoUrl, 'small') : ''}" },
    { match: /src=\{logoDarkUrl\}/g, replace: "src={logoDarkUrl ? getResizedImageUrl(logoDarkUrl, 'small') : ''}" },
    { match: /src=\{primaryCreative\.image_url\}/g, replace: "src={primaryCreative.image_url ? getResizedImageUrl(primaryCreative.image_url, 'small') : ''}" },
  ];

  for (const {match, replace} of regexes) {
    content = content.replace(match, (fullMatch, p1) => {
      // Check if it already has getResizedImageUrl
      if (fullMatch.includes('getResizedImageUrl')) return fullMatch;
      // Check if p1 is a string before using includes
      if (typeof p1 === 'string' && p1.includes('(')) return fullMatch; // skip
      
      // We can manually apply logic here
      return replace.replaceAll('$1', p1);
    });
  }
  
  // Custom complex ones
  content = content.replace(/src=\{normalizePublicAssetUrl\((.*?)\)\}/g, "src={$1 ? getResizedImageUrl(normalizePublicAssetUrl($1), 'medium') : ''}");
  content = content.replace(/src=\{getProductImage\((.*?)\)\}/g, "src={getProductImage($1) ? getResizedImageUrl(getProductImage($1), 'medium') : ''}");
  
  if (content !== original) {
    // If we have duplicate imports, let's deduplicate
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

console.log('Total files updated:', updatedCount);
