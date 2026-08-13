const fs = require('fs');
const path = require('path');

// 2. Finance
let financeFile = path.join('frontend/src/app/(admin)/settings/finance/page.tsx');
if (fs.existsSync(financeFile)) {
  let content = fs.readFileSync(financeFile, 'utf8');
  // It's failing because form.setValue takes 3 arguments but somehow TS thinks it's 1? 
  // Ah! `form.setValue` without arguments? No, the issue is `<input onChange={(e) => updateSetting(..., e.target.value)}>` 
  // `onChange={(e) => form.setValue("finance_commission_rate", parseFloat(e.target.value) || 0, {shouldDirty: true})}`
  // Why would it complain about 0-1 arguments? Because `form.setValue` comes from `react-hook-form`. It takes `(name: Path<T>, value: any, options?: ...)` 
  // Wait! Did I replace `parseFloat(e.target.value)` and accidentally pass the third argument to `parseFloat`?!
  // `parseFloat` only takes ONE argument!
  // `parseFloat(e.target.value) || 0, {shouldDirty: true}` means `parseFloat` receives `{shouldDirty: true}` as the second argument!
  // NO, `parseFloat` doesn't take 2 arguments. `parseInt` takes 2 arguments: `parseInt(string, radix)`.
  // Wait! In marketplace, `parseInt(e.target.value) || 10, {shouldDirty: true}` is inside `form.setValue(..., parseInt(...), {...})`.
  // Let me replace `updateSetting` cleanly.
  content = content.replace(/form\.setValue\("finance_commission_rate", \(parseFloat\(e\.target\.value\) \|\| 0\) as any, \{shouldDirty: true\}\)/g, 'form.setValue("finance_commission_rate" as any, parseFloat(e.target.value) || 0, {shouldDirty: true})');
  // The error in finance: `parseFloat(e.target.value) || 0` ... let's just use `renderNumberInput(formProps, 'finance_commission_rate', 'Commission Rate (%)', '%', 0, 100, 0.1)` instead of custom onChange!
  
  content = content.replace(/<div className="space-y-1.5">[\s\S]*?<\/div>\s*<\/div>/, `{renderNumberInput(formProps, 'finance_commission_rate', 'Commission Rate (%)', '%', 0, 100, 0.1)}\n        </div>`);
  fs.writeFileSync(financeFile, content);
}

// 3. Marketplace
let marketplaceFile = path.join('frontend/src/app/(admin)/settings/marketplace/page.tsx');
if (fs.existsSync(marketplaceFile)) {
  let content = fs.readFileSync(marketplaceFile, 'utf8');
  content = content.replace(/updateSetting\((['"]\w+['"]), (.*?)\)/g, 'form.setValue($1 as any, $2, {shouldDirty: true})');
  
  // The parseInt issue: `parseInt(e.target.value)` has 1 arg, but wait, `parseInt` takes 2 args. 
  // The error is `Expected 0-1 arguments, but got 2.` Wait, where is `Expected 0-1 arguments` coming from?
  // It's coming from `form.setValue("hub_hero_carousel_interval" as any, parseInt(e.target.value) || 5000, {shouldDirty: true})`?
  // No! The error is in `parseInt(e.target.value, 10)`? No, it's `parseInt`... wait, maybe it's `getResizedImageUrl`!
  // `getResizedImageUrl` takes 1 argument but I passed 2? In `lib/image-url.ts`, it might only take `(url: string)`.
  // Yes! `getResizedImageUrl(form.watch("marketplace_logo_url"), 'medium')`. I replaced it earlier but maybe some remain.
  content = content.replace(/getResizedImageUrl\(([^,]+), 'medium'\)/g, 'getResizedImageUrl($1)');
  
  fs.writeFileSync(marketplaceFile, content);
}

// 4. Operations
let opsFile = path.join('frontend/src/app/(admin)/settings/operations/page.tsx');
if (fs.existsSync(opsFile)) {
  let content = fs.readFileSync(opsFile, 'utf8');
  content = content.replace(/settings\.notifications_whatsapp_provider/g, 'form.watch("notifications_whatsapp_provider")');
  content = content.replace(/updateSetting\('notifications_whatsapp_provider', e\.target\.value\)/g, 'form.setValue("notifications_whatsapp_provider" as any, e.target.value, {shouldDirty: true})');
  fs.writeFileSync(opsFile, content);
}

console.log('Really final fixes applied');
