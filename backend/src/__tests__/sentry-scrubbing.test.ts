import { describe, it, expect } from 'vitest';

describe('PLAN-B-21: Sentry Payload Scrubbing & PII Protection', () => {
  function beforeSendScrubber(event: any) {
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-pd-api-key'];
      }
    }
    return event;
  }

  it('redacts request body data and cookies from sentry events', () => {
    const rawEvent = {
      message: 'Database query failed',
      request: {
        url: 'https://api.pandamarket.tn/api/pd/auth/login',
        method: 'POST',
        data: {
          email: 'admin@pandamarket.tn',
          password: 'SecretSuperPassword123!',
        },
        cookies: {
          pd_session: 'session_secret_token',
        },
        headers: {
          authorization: 'Bearer jwt_secret_token',
          cookie: 'pd_session=token',
          'x-pd-api-key': 'vendor_api_key_456',
          'user-agent': 'Mozilla/5.0',
        },
      },
    };

    const scrubbed = beforeSendScrubber(rawEvent);

    expect(scrubbed.request.data).toBeUndefined();
    expect(scrubbed.request.cookies).toBeUndefined();
    expect(scrubbed.request.headers.authorization).toBeUndefined();
    expect(scrubbed.request.headers.cookie).toBeUndefined();
    expect(scrubbed.request.headers['x-pd-api-key']).toBeUndefined();
    expect(scrubbed.request.headers['user-agent']).toBe('Mozilla/5.0');
  });
});
