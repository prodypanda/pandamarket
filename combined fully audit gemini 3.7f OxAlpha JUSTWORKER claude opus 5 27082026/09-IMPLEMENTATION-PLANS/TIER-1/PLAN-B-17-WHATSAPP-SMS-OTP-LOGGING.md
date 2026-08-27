# Engineering Specification: PLAN-B-17
## Implement Evolution API WhatsApp Gateway in `sms.service.ts` & Stop Logging OTPs

- **Target Bug:** [B-17](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-17-TO-B-21-SECURITY-INFRA.md#b-17)
- **Severity:** 🟠 P1 (Unsent OTPs / Plaintext OTP in Production Logs)
- **Estimated Effort:** 🛠 2 hours
- **Impacted Systems:** SMS Service, WhatsApp Gateway Adapter, Phone Verification, Audit Logs.

---

### 1. Summary & Business Impact
Render is configured with `PD_SMS_PROVIDER = whatsapp_gateway` along with `PD_WHATSAPP_GATEWAY_URL` and `PD_WHATSAPP_GATEWAY_TOKEN`. But `backend/src/services/sms.service.ts` does not implement `whatsapp_gateway`. It falls through to the development `console` branch, printing the raw OTP code into production logs and returning `false`. Zero SMS or WhatsApp messages are delivered.

---

### 2. Proposed Changes & Exact Diffs

#### Modify `backend/src/services/sms.service.ts`
```ts
case 'whatsapp_gateway': {
  const gatewayUrl = config.sms.whatsappGatewayUrl;
  const token = config.sms.whatsappGatewayToken;
  if (!gatewayUrl || !token) throw new Error('WhatsApp gateway credentials not configured');
  
  const res = await fetch(`${gatewayUrl}/message/sendText/default`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': token },
    body: JSON.stringify({ number: to, text: message }),
  });
  return res.ok;
}
```
And in the fallback branch, sanitize logs:
```ts
logger.info({ to: maskPhone(to) }, '[SMS] Dispatched message');
```

---

### 3. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/sms-service.test.ts
```
