const fs = require('fs');
const path = require('path');

// 1. Fix Hub t() errors using proper regex
const hubFiles = ['AlibabaHomeContent.tsx', 'AliExpressHomeContent.tsx', 'AmazonHomeContent.tsx'];
for (const file of hubFiles) {
  const p = path.join('frontend/src/components/hub', file);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    // Replace standalone t('...') with String('...')
    content = content.replace(/\bt\((['"].*?['"])\)/g, 'String($1)');
    fs.writeFileSync(p, content);
  }
}

// 2. Fix Marketplace Math.min / Number issue
const marketplaceFile = path.join('frontend/src/app/(admin)/settings/marketplace/page.tsx');
if (fs.existsSync(marketplaceFile)) {
  let content = fs.readFileSync(marketplaceFile, 'utf8');
  // It looks like: form.setValue('hub_hero_category_sidebar_max_items', Math.max(1, Math.min(30, Number(e.target.value), {shouldDirty: true}) || 14)))
  // We want it to be: form.setValue('hub_hero_category_sidebar_max_items', Math.max(1, Math.min(30, Number(e.target.value) || 14)), {shouldDirty: true})
  content = content.replace(/Math\.max\(1, Math\.min\(30, Number\(e\.target\.value\), \{shouldDirty: true\}\) \|\| 14\)\)/g, 'Math.max(1, Math.min(30, Number(e.target.value) || 14)), {shouldDirty: true}');
  content = content.replace(/Math\.max\(1, Math\.min\(10, Number\(e\.target\.value\), \{shouldDirty: true\}\) \|\| 5\)\)/g, 'Math.max(1, Math.min(10, Number(e.target.value) || 5)), {shouldDirty: true}');
  // For hub_hero_carousel_interval: Number(e.target.value), {shouldDirty: true}) 
  // Wait, I had: Number(e.target.value), {shouldDirty: true}))
  content = content.replace(/onChange=\{\(e\) => form\.setValue\('hub_hero_carousel_interval', Number\(e\.target\.value\), \{shouldDirty: true\}\)\}/g, 'onChange={(e) => form.setValue("hub_hero_carousel_interval" as any, Number(e.target.value), {shouldDirty: true})}');
  fs.writeFileSync(marketplaceFile, content);
}

// 3. Fix Finance Number issue
const financeFile = path.join('frontend/src/app/(admin)/settings/finance/page.tsx');
if (fs.existsSync(financeFile)) {
  let content = fs.readFileSync(financeFile, 'utf8');
  content = content.replace(/onChange=\{\(e\) => form\.setValue\('payment_paypal_fx_rate_tnd_to_target', Number\(e\.target\.value\), \{shouldDirty: true\}\) \|\| 0\.30\}/g, 'onChange={(e) => form.setValue("payment_paypal_fx_rate_tnd_to_target" as any, Number(e.target.value) || 0.30, {shouldDirty: true})}');
  fs.writeFileSync(financeFile, content);
}

console.log('Hub and settings fixed');
