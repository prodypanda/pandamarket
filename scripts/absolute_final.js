const fs = require('fs');
const path = require('path');

// 1. Fix Commerce: Since replace tool deleted lines, let's restore commerce page.
let commerceFile = path.join('frontend/src/app/(admin)/settings/commerce/page.tsx');
if (fs.existsSync(commerceFile)) {
  let content = fs.readFileSync(commerceFile, 'utf8');
  // It deleted the rewards widget prizes. Let's just restore that whole section manually.
  content = content.replace(/<div className="grid grid-cols-1 gap-6 md:grid-cols-2">\s*<\/div>\s*<\/section>\s*<section className="rounded-\[2rem\] border border-slate-200\/70 bg-white p-8 shadow-xl shadow-slate-200\/40 mb-8">/s, 
  `<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {renderTextInput(formProps, 'rewards_widget_button_label', 'Floating Trigger Button Label', "🎁 Gagnez jusqu'à 15 DT !")}
          {renderTextInput(formProps, 'rewards_widget_prizes_json', 'Wheel Prizes JSON Config', 'JSON array of wheel slices with label, coupon code, discount amount, color and description.')}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">`);
  // And fix the breakage from replace tool if it was exactly like this
  content = content.replace(/\]\.map\(\(t: any\) => renderToggle\(formProps, t\)\)\s*<\/div>\s*icon=\{<ShieldCheck/s,
  `].map((t: any) => renderToggle(formProps, t))}
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {renderTextInput(formProps, 'rewards_widget_button_label', 'Floating Trigger Button Label', "🎁 Gagnez jusqu'à 15 DT !")}
          {renderTextInput(formProps, 'rewards_widget_prizes_json', 'Wheel Prizes JSON Config', 'JSON array of wheel slices with label, coupon code, discount amount, color and description.')}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">
        <SectionHeader
          icon={<ShieldCheck`);
  fs.writeFileSync(commerceFile, content);
}

// 2. Finance
let financeFile = path.join('frontend/src/app/(admin)/settings/finance/page.tsx');
if (fs.existsSync(financeFile)) {
  let content = fs.readFileSync(financeFile, 'utf8');
  // form.setValue("finance_commission_rate" as any, parseFloat(e.target.value) || 0, {shouldDirty: true})
  // Error TS2554: Expected 0-1 arguments, but got 2. Wait, why?
  // Because setValue was not passed in formProps properly, or it's form.setValue native but it takes 3 args. 
  // Let's just use form.setValue native with 3 arguments. React hook form setValue is: `setValue(name, value, options)`. 
  // If it's saying expected 0-1 args, it's not the setValue! It's `parseFloat(e.target.value) || 0, {shouldDirty: true}`!
  // Wait, `updateSetting("finance_commission_rate", parseFloat(e.target.value) || 0)` -> replace to form.setValue!
  // Ah! `form.setValue("finance_commission_rate", (parseFloat(e.target.value) || 0), {shouldDirty: true})`
  // Maybe I missed a parenthesis! Let's just do:
  content = content.replace(/form\.setValue\("finance_commission_rate" as any, parseFloat\(e\.target\.value\) \|\| 0, \{shouldDirty: true\}\)/g, 'form.setValue("finance_commission_rate", (parseFloat(e.target.value) || 0) as any, {shouldDirty: true})');
  fs.writeFileSync(financeFile, content);
}

// 3. Marketplace
let marketplaceFile = path.join('frontend/src/app/(admin)/settings/marketplace/page.tsx');
if (fs.existsSync(marketplaceFile)) {
  let content = fs.readFileSync(marketplaceFile, 'utf8');
  content = content.replace(/updateSetting\((['"]\w+['"]), (.*?)\)/g, 'form.setValue($1 as any, $2, {shouldDirty: true})');
  // TS2554: Expected 0-1 args for parseInt!
  content = content.replace(/form\.setValue\("hub_hero_carousel_interval" as any, parseInt\(e\.target\.value\) \|\| 5000, \{shouldDirty: true\}\)/g, 'form.setValue("hub_hero_carousel_interval" as any, parseInt(e.target.value) || 5000, {shouldDirty: true})');
  content = content.replace(/form\.setValue\("hub_hero_category_sidebar_max_items" as any, parseInt\(e\.target\.value\) \|\| 10, \{shouldDirty: true\}\)/g, 'form.setValue("hub_hero_category_sidebar_max_items" as any, parseInt(e.target.value) || 10, {shouldDirty: true})');
  content = content.replace(/form\.setValue\("hub_hero_carousel_max_categories" as any, parseInt\(e\.target\.value\) \|\| 5, \{shouldDirty: true\}\)/g, 'form.setValue("hub_hero_carousel_max_categories" as any, parseInt(e.target.value) || 5, {shouldDirty: true})');
  fs.writeFileSync(marketplaceFile, content);
}

// 4. Operations
let opsFile = path.join('frontend/src/app/(admin)/settings/operations/page.tsx');
if (fs.existsSync(opsFile)) {
  let content = fs.readFileSync(opsFile, 'utf8');
  content = content.replace(/settings\./g, 'form.watch("');
  content = content.replace(/updateSetting\((['"]\w+['"]), (.*?)\)/g, 'form.setValue($1 as any, $2, {shouldDirty: true})');
  fs.writeFileSync(opsFile, content);
}

console.log('Absolute final fixes applied');
