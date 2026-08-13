const fs = require('fs');
const path = require('path');

const tabs = ['marketplace', 'commerce', 'finance', 'shipping', 'security', 'operations', 'integrations', 'email'];

tabs.forEach(tab => {
  const file = path.join('frontend/src/app/(admin)/settings', tab, 'page.tsx');
  if (!fs.existsSync(file)) return;

  let content = fs.readFileSync(file, 'utf8');

  // Fix left-over updateSetting and settings
  content = content.replace(/updateSetting\((['"]\w+['"]), (.*?)\)/g, 'form.setValue($1, $2, {shouldDirty: true})');
  content = content.replace(/settings\.([a-zA-Z0-9_]+)/g, 'form.watch("$1")');

  // Fix MarketplaceAssetPicker props missing `open`
  content = content.replace(/<MarketplaceAssetPicker\s+onSelect/g, '<MarketplaceAssetPicker\n          open={true}\n          onSelect');

  // Fix renderColorInput missing import and definition
  if (content.includes('renderColorInput')) {
    content = content.replace(/renderColorInput\((['"]\w+['"]), (['"].*?['"])\)/g, 'renderTextInput(formProps, $1, $2)');
  }

  // Fix missing icon imports for marketplace
  content = content.replace(/import { Save, AlertTriangle, CheckCircle2 } from 'lucide-react';/, `import { Save, AlertTriangle, CheckCircle2 } from 'lucide-react';\nimport { Store, Wallet, ShieldCheck, Globe2, SlidersHorizontal, CreditCard, Crown, Truck, Mail, Shield, BarChart3, MessageSquare, Bell, Construction, UploadCloud, ImageIcon, LayoutGrid, Headphones } from "lucide-react";`);

  // Fix getResizedImageUrl for marketplace
  if (content.includes('getResizedImageUrl') && !content.includes('import { getResizedImageUrl')) {
    content = content.replace(/import \{ fetchWithCsrf \}/, `import { getResizedImageUrl } from '@/lib/image-url';\nimport { fetchWithCsrf }`);
  }

  // Fix MarketplaceAssetPicker state in marketplace if not exists
  if (tab === 'marketplace' && !content.includes('setMarketplaceLogoPickerTarget')) {
    content = content.replace(/const \[saveStatus, setSaveStatus\] = useState<'idle' | 'success' | 'error'>\('idle'\);/, `const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');\n  const [marketplaceLogoPickerTarget, setMarketplaceLogoPickerTarget] = useState<string | null>(null);`);
  }

  // Fix SectionHeader import path if needed (though we created it at the requested path, some might miss it entirely)
  if (!content.includes('import { SectionHeader }')) {
    content = content.replace(/import \{ SectionHeader \} from "@\/components\/admin\/SectionHeader";/g, ''); // clear any wrong ones
    content = content.replace(/import \{ fetchWithCsrf \}/, `import { SectionHeader } from '@/components/admin/SectionHeader';\nimport { fetchWithCsrf }`);
  }

  fs.writeFileSync(file, content);
});

console.log('Fixed all tabs');
