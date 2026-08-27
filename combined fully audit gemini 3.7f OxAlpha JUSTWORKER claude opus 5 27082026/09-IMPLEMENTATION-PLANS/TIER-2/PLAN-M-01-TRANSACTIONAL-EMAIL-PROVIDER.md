# Engineering Specification: PLAN-M-01
## Integrate Production Transactional Email Provider (Brevo with Resend Fallback)

- **Target PRD Gap:** [M-01](../../04-MISSING-WORK-PRD/M-01-TO-M-06-CORE-COMMERCE.md#m-01)
- **Severity:** 🟡 PRD Gap / Essential Commerce Infrastructure
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Email Worker, Auth Service, Order Notifications, KYC Alerts.

---

### 1. Summary & Business Impact
Currently, transactional emails rely on a development Nodemailer transport that logs to console or fails in production when SMTP credentials are incomplete. To support customer password resets, order confirmations, vendor sale notifications, and KYC updates, the platform requires an enterprise transactional email provider. Brevo (formerly Sendinblue) is selected as the primary provider with Resend as an automatic failover provider.

---

### 2. Technical Architecture & Flow
1. **Email Adapter Interface:** Define `EmailProvider` interface with `send({ to, subject, html, templateId, params })`.
2. **Brevo Adapter:** Uses Brevo HTTP API v3 (`https://api.brevo.com/v3/smtp/email`) with `PD_BREVO_API_KEY`.
3. **Resend Fallback Adapter:** Automatically triggers if Brevo returns a 5xx error or rate limit.
4. **BullMQ Integration:** The existing `email.worker.ts` consumes jobs from the `email` queue and dispatches via the active provider.

---

### 3. Proposed Changes & Code Implementation

#### A. Install SDK
```bash
npm install @getbrevo/brevo resend -w backend
```

#### B. Create Provider Service (`backend/src/services/email-provider.service.ts`)
```ts
import { Resend } from 'resend';
import * as Brevo from '@getbrevo/brevo';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  templateName?: string;
  variables?: Record<string, unknown>;
}

export class EmailProviderService {
  private resend: Resend | null = null;
  private brevoApi: Brevo.TransactionalEmailsApi | null = null;

  constructor() {
    if (config.email.brevoApiKey) {
      this.brevoApi = new Brevo.TransactionalEmailsApi();
      this.brevoApi.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, config.email.brevoApiKey);
    }
    if (config.email.resendApiKey) {
      this.resend = new Resend(config.email.resendApiKey);
    }
  }

  async send(payload: EmailPayload): Promise<{ success: boolean; messageId?: string }> {
    // 1. Try Brevo Primary
    if (this.brevoApi) {
      try {
        const sendSmtpEmail = new Brevo.SendSmtpEmail();
        sendSmtpEmail.subject = payload.subject;
        sendSmtpEmail.htmlContent = payload.html;
        sendSmtpEmail.sender = { name: config.email.fromName, email: config.email.fromEmail };
        sendSmtpEmail.to = [{ email: payload.to }];
        const data = await this.brevoApi.sendTransacEmail(sendSmtpEmail);
        return { success: true, messageId: data.body.messageId };
      } catch (err: any) {
        logger.error({ err: err.message }, '[EmailProvider] Brevo send failed, trying fallback');
      }
    }

    // 2. Try Resend Fallback
    if (this.resend) {
      try {
        const res = await this.resend.emails.send({
          from: `${config.email.fromName} <${config.email.fromEmail}>`,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
        });
        return { success: true, messageId: res.data?.id };
      } catch (fallbackErr: any) {
        logger.error({ err: fallbackErr.message }, '[EmailProvider] Resend fallback failed');
      }
    }

    throw new Error('All transactional email providers failed');
  }
}

export const emailProvider = new EmailProviderService();
```

---

### 4. Verification Plan
```bash
npm run test -w backend -- src/__tests__/email-provider.test.ts
```
