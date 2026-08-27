# Engineering Specification: PLAN-T4-06
## Advanced AI Commerce Suite: Multi-Provider Fallback & Tunisian Darija Copywriter

- **Target Task:** [T4-06](../../00-MASTER-CHECKLIST/TIER-4-GROWTH-ROADMAP.md)
- **Severity:** 💡 Merchant Productivity & Localized AI
- **Estimated Effort:** 🛠 4 hours
- **Impacted Systems:** AI Service, Product Studio, Image Background Remover.

---

### 1. Summary & Business Impact
Tunisian social commerce sellers write promotional posts in Tunisian Arabic dialect (Derja/Franco-Arabe). Standard LLMs produce formal Arabic or generic French. Fine-tuning prompts for Tunisian Darija marketing copy increases engagement on social channels by over 300%. Furthermore, adding automated background removal creates studio-grade product photos from smartphone snapshots.

---

### 2. Implementation Details
1. **Multi-Provider Fallback Cascade:** Gemini 2.5 Flash → Groq Llama 3.3 70B → Mistral Large.
2. **Tunisian Darija Marketing Engine:** Generates localized Facebook/Instagram captions with emojis and phone call CTA.
3. **Automated Background Removal:** Integrates RMBG-2.0 / Rembg to isolate product subjects onto transparent/white backdrops.

---

### 3. Verification Plan
```bash
npm run test -w backend -- src/__tests__/ai-suite-advanced.test.ts
```
