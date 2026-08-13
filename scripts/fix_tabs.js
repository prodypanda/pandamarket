const fs = require('fs');
const path = require('path');
const tabs = ['marketplace', 'commerce', 'finance', 'shipping', 'security', 'operations', 'integrations', 'email'];

tabs.forEach(tab => {
  const file = path.join('frontend/src/app/(admin)/settings', tab, 'page.tsx');
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  
  // Fix section tag syntax error from our earlier script
  content = content.replace(/<section className="rounded-\[2rem\] border border-slate-200\/70 bg-white p-8 shadow-xl shadow-slate-200\/40 mb-8".*?>/g, '<section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">');
  
  // Add missing imports
  const imports = `import { Store, Wallet, ShieldCheck, Globe2, SlidersHorizontal, CreditCard, Crown, Truck, Mail, Shield, BarChart3, MessageSquare, Bell } from "lucide-react";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { MarketplaceAssetPicker } from "@/components/admin/MarketplaceAssetPicker";
import { HomepageBlocksEditor } from "@/components/admin/HomepageBlocksEditor";
import { HeroCarouselEditor } from "@/components/admin/HeroCarouselEditor";`;
  
  content = content.replace('// Import any other missing icons/components you might need, e.g. Store, MarketplaceAssetPicker etc.', imports);
  
  fs.writeFileSync(file, content);
});
console.log('Fixed tabs syntax');
