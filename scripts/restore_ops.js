const fs = require('fs');
const path = require('path');

let opsFile = path.join('frontend/src/app/(admin)/settings/operations/page.tsx');
if (fs.existsSync(opsFile)) {
  let content = fs.readFileSync(opsFile, 'utf8');
  content = content.replace(/<\/div>\s*<\/div>\s*\}\)\}\s*<\/div>\s*<\/section>/, `</div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {renderNumberInput(formProps, p.wKey, 'Width', 'px', p.minW, p.maxW)}
                {renderNumberInput(formProps, p.hKey, 'Height', 'px', p.minH, p.maxH)}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Crop Mode</label>
                  <select
                    value={form.watch(p.cropKey as any) || 'inside'}
                    onChange={(e) => form.setValue(p.cropKey as any, e.target.value, {shouldDirty: true})}
                    className="w-full rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15"
                  >
                    <option value="cover">Cover (crop to fill)</option>
                    <option value="inside">Inside (fit without crop)</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>`);
  fs.writeFileSync(opsFile, content);
}
