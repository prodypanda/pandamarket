const fs = require('fs');
const path = require('path');

const tabs = ['marketplace', 'commerce', 'finance', 'shipping', 'security', 'operations', 'integrations', 'email'];

tabs.forEach(tab => {
  const file = path.join('frontend/src/app/(admin)/settings', tab, 'page.tsx');
  if (!fs.existsSync(file)) return;

  let content = fs.readFileSync(file, 'utf8');

  // Fix .map(renderToggle)
  // Before: .map(renderToggle)
  // After: .map((t: any) => renderToggle(formProps, t))
  content = content.replace(/\.map\(renderToggle\)/g, '.map((t: any) => renderToggle(formProps, t))');

  // Fix duplicate Lucide imports by matching all lucide imports and deduplicating
  const lucideImports = Array.from(content.matchAll(/import \{([^}]+)\} from ['"]lucide-react['"]/g))
    .flatMap(m => m[1].split(',').map(s => s.trim()).filter(Boolean));
  
  const uniqueLucide = [...new Set(lucideImports)];
  
  if (uniqueLucide.length > 0) {
    // Remove all existing lucide imports
    content = content.replace(/import \{[^}]+\} from ['"]lucide-react['"];?\n?/g, '');
    // Insert one unified import after 'lucide-react' (well, just at the top after React imports)
    content = content.replace(/import \* as z from 'zod';/, `import * as z from 'zod';\nimport { ${uniqueLucide.join(', ')} } from 'lucide-react';`);
  }

  // Also fix renderColorInput missing import in marketplace
  if (tab === 'marketplace') {
    content = content.replace(/renderColorInput\((['"]\w+['"]), (['"].*?['"])\)/g, 'renderTextInput(formProps, $1, $2, "", "color")');
    
    // Fix missing custom components if any
    if (content.includes('<MarketplaceThemeSelector') && !content.includes('MarketplaceThemeSelector')) {
      content = content.replace(/import \{ SectionHeader \}/, 'import { MarketplaceThemeSelector } from "@/components/admin/MarketplaceThemeSelector";\nimport { SectionHeader }');
    }
  }

  // Fix settings object usage remaining
  content = content.replace(/settings\./g, 'form.watch("');
  // but wait, if it was `settings.maintenance_enabled`, it becomes `form.watch("maintenance_enabled"`. So we need to add `")`.
  // Actually, replacing `settings.([a-zA-Z0-9_]+)` is safer.
  content = content.replace(/settings\.([a-zA-Z0-9_]+)/g, 'form.watch("$1")');

  fs.writeFileSync(file, content);
});

console.log('Fixed imports and maps');
