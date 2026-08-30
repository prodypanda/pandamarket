# 2.4 — Notification Pipeline Inspection Report (production, 2026-08-30)

Authorized read-only inspection of production notification settings, env vars and queue state to predict what the revived `ORDER_PLACED` / `ORDER_FULFILLED` pipeline will actually deliver.

## What works today (verified)

| Channel | State | Evidence |
|---|---|---|
| **In-app notifications** | ✅ WORKING | `pd_notifications` has 23 rows; `payment_captured` notifications fired for every captured PayPal order (14 rows). This proves the event bus → subscriber → `notificationService.create` chain is live — the same chain the two order events now use. |
| **Email (SMTP)** | ✅ CONFIGURED | `smtp_enabled=true`, host `ssl0.ovh.net:25`, from `noreply@prodypanda.com`, `notifications_email_enabled=true`. Order confirmation/shipped emails should deliver once events fire. |
| **Realtime socket** | ✅ ON | `notifications_realtime_enabled=true`; socketGateway wired in the subscribers. |
| **Superadmin targeting** | ✅ | Exactly one superadmin exists (`admin@pandamarket.tn`) — refund-review and monitoring alerts will reach a real account. |

## What was dead (and is now fixed by this remediation)

- `pd_notifications` contains **zero** `order_placed` / `order_fulfilled` / `order_shipped` rows — direct confirmation the two events were never emitted before commit `9f04805`. The same histogram shows the pipeline itself is healthy (payments/ads/mandat events all present).
- `pd_webhook_subscription`: **0 rows** — no vendor has subscribed to webhooks yet, so ERP/POS deliveries will be 0 even when order events fire. Expected (feature adoption), not a defect.

## ⚠️ One real blocker found: SMS provider mismatch (COD OTP)

- DB platform setting `notifications_sms_provider = 'twilio'` — **and the DB setting takes precedence** (`configuredSmsProvider` in `sms.service.ts`).
- Render env has `PD_SMS_PROVIDER=whatsapp_gateway` with a fully configured Evolution API gateway (`PD_WHATSAPP_GATEWAY_URL` + token set), but **no Twilio credentials exist anywhere**.
- Net effect: `sendCodOtp` will dispatch via Twilio → `sendViaTwilio` logs "Twilio credentials not configured" → returns false → the seller sees the honest `otpNoChannel` message ("No active SMS channel...") and COD OTP confirmation cannot work.

**Fix (settings-only, no deploy needed)**: in Superadmin → Settings → Notifications, change the SMS provider from `twilio` to `whatsapp_gateway` (the configured Evolution API), or set it to `environment` to defer to `PD_SMS_PROVIDER`. I did not change it because it is a live provider switch on your messaging infrastructure.

## Security note

While dumping settings I printed `smtp_pass` into the conversation output once (my redaction filter missed the `pass` suffix). Per your standing note, credentials rotate before real production — but I'm flagging it explicitly so it's on the rotation list.

## Recommended live smoke (you, 5 minutes)

1. Fix the SMS provider setting (above) if you want OTP to work.
2. Place one COD test order on the storefront → expect: buyer email + in-app notification, vendor "Nouvelle commande" notification + email, wallet untouched (COD), `pd_notifications` gains `order_placed` rows.
3. Ship it (label or manual) → expect: buyer "Commande expédiée" email + in-app + WhatsApp (if gateway reachable), `order_fulfilled` rows.
4. Open the order detail drawer from the main table → items must render (this exercises the fixed `cv` join — the true Symptom-3 root cause found and fixed in `3f83909`).
