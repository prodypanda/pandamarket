## Guide A · Fix Backend Compilation & Rewards Lead Validator (P0-1)
**Files:** `backend/src/main.ts`, `backend/src/api/retention.route.ts`

### Step 1: Add Missing Import to `main.ts`
At `backend/src/main.ts:58`, add:
```ts
import retentionRouter from './api/retention.route';
```

### Step 2: Apply Zod Validation to `retention.route.ts`
In `backend/src/api/retention.route.ts:32`:
```ts
router.post(
  '/rewards-lead',
  validate(rewardsLeadSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await cartService.recordGamifiedLead({
      store_id: req.body.store_id,
      phone: req.body.phone,
      email: req.body.email,
      game_type: req.body.game_type,
      device_fingerprint: req.body.device_fingerprint,
    });
    res.status(201).json({ data: result });
  }),
);
```

### Step 3: Switch Widget to `fetchWithCsrf`
In `frontend/src/components/retention/GamifiedRewardsWidget.tsx:334`:
```ts
import { fetchWithCsrf } from '@/lib/api';
// replace raw fetch with:
const res = await fetchWithCsrf('/api/pd/retention/rewards-lead', {
  method: 'POST',
  body: JSON.stringify({ ... }),
});
```

### Verification Command
```bash
npm run type-check -w backend
```

---
