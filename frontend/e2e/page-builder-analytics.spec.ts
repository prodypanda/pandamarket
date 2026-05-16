import { test, expect, type APIRequestContext, type APIResponse, type BrowserContext } from '@playwright/test';
import { API_BASE } from './helpers/test-data';

const vendorEmail = 'vendor.pro@test.tn';
const vendorPassword = 'Test123!';
const storeHost = 'atelier-medina';

test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

async function expectOk(response: APIResponse, label: string) {
  expect(response.ok(), `${label} failed with ${response.status()}: ${await response.text()}`).toBeTruthy();
}

function getSetCookieValue(response: APIResponse, cookieName: string): string | null {
  for (const header of response.headersArray()) {
    if (header.name.toLowerCase() !== 'set-cookie') continue;
    const pair = header.value.split(';')[0];
    const index = pair.indexOf('=');
    if (index <= 0) continue;
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (name === cookieName) return value;
  }
  return null;
}

class VendorApiSession {
  private csrfToken = '';

  constructor(private readonly request: APIRequestContext) {}

  private absorbCsrfToken(response: APIResponse) {
    this.csrfToken = getSetCookieValue(response, 'pd_csrf') || this.csrfToken;
  }

  private headers(method: string) {
    const headers: Record<string, string> = {};
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }
    return headers;
  }

  async get(url: string) {
    const response = await this.request.get(`${API_BASE}${url}`, { headers: this.headers('GET') });
    this.absorbCsrfToken(response);
    return response;
  }

  async post(url: string, data?: unknown) {
    const response = await this.request.post(`${API_BASE}${url}`, { headers: this.headers('POST'), data });
    this.absorbCsrfToken(response);
    return response;
  }

  async put(url: string, data?: unknown) {
    const response = await this.request.put(`${API_BASE}${url}`, { headers: this.headers('PUT'), data });
    this.absorbCsrfToken(response);
    return response;
  }

  async delete(url: string) {
    const response = await this.request.delete(`${API_BASE}${url}`, { headers: this.headers('DELETE') });
    this.absorbCsrfToken(response);
    return response;
  }

  async login() {
    const csrf = await this.get('/api/pd/auth/csrf');
    await expectOk(csrf, 'CSRF request');
    const login = await this.post('/api/pd/auth/login/vendor', { email: vendorEmail, password: vendorPassword });
    await expectOk(login, 'Vendor login');
    const body = await login.json();
    expect(body.requires_2fa).not.toBeTruthy();
    expect(body.user?.store_id).toBeTruthy();
    return body.user.store_id as string;
  }

  async selectStore(subdomain: string) {
    const mine = await this.get('/api/pd/stores/mine');
    await expectOk(mine, 'Store list');
    const body = await mine.json();
    const store = body.stores?.find((item: { id: string; subdomain?: string | null }) => item.subdomain === subdomain);
    if (!store) throw new Error(`Store ${subdomain} should exist for ${vendorEmail}`);

    const select = await this.post('/api/pd/stores/select', { store_id: store.id });
    await expectOk(select, 'Store select');
    return store.id as string;
  }

  async addCookiesTo(context: BrowserContext) {
    const state = await this.request.storageState();
    await context.addCookies(state.cookies);
  }

  async dispose() {
    await this.request.dispose();
  }
}

let sharedApi: VendorApiSession;

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  sharedApi = new VendorApiSession(request);
  await sharedApi.login();
  await sharedApi.selectStore(storeHost);
});

test.afterAll(async () => {
  await sharedApi?.dispose();
});

test.describe('Page Builder analytics browser flow', () => {
  test('records page view and product click from a published product-grid page', async ({ page }) => {
    const api = sharedApi;
    const slug = `qa-pb-browser-${Date.now().toString(36)}`;
    let pageId = '';

    try {
      const create = await api.post('/api/pd/page-builder/pages', {
        slug,
        title: `QA Product Grid ${slug}`,
        builder_data: { source: 'playwright-page-builder-analytics' },
        html: '<section data-pd-block="product-grid" data-pd-title="QA Products" data-pd-limit="2"></section>',
        css: '',
        show_in_navigation: false,
        show_in_footer: false,
      });
      expect(create.ok()).toBeTruthy();
      pageId = (await create.json()).page.id;

      const publish = await api.put(`/api/pd/page-builder/pages/${pageId}`, { is_published: true });
      expect(publish.ok()).toBeTruthy();

      const pageViewResponse = page.waitForResponse(async (response) => {
        if (!response.url().includes('/api/pd/analytics/page-builder/event')) return false;
        const body = response.request().postData() || '';
        return body.includes('"page_view"') && response.status() === 202;
      });

      await page.goto(`/store/${storeHost}/pages/${slug}`);
      await expect(page.getByRole('heading', { name: /qa products/i })).toBeVisible({ timeout: 20_000 });
      await pageViewResponse;

      const productLink = page.locator('a[data-pd-analytics="product_click"][data-pd-product-id]').first();
      await expect(productLink).toBeVisible({ timeout: 20_000 });

      const productClickResponse = page.waitForResponse(async (response) => {
        if (!response.url().includes('/api/pd/analytics/page-builder/event')) return false;
        const body = response.request().postData() || '';
        return body.includes('"product_click"') && response.status() === 202;
      });

      await productLink.click();
      await productClickResponse;
      await expect(page).toHaveURL(/\/products\//, { timeout: 20_000 });

      const list = await api.get('/api/pd/page-builder/pages');
      expect(list.ok()).toBeTruthy();
      const listBody = await list.json();
      const qaPage = listBody.data.find((item: { id: string }) => item.id === pageId);
      expect(qaPage).toBeTruthy();
      expect(qaPage.views_30d).toBeGreaterThanOrEqual(1);
      expect(qaPage.product_clicks_30d).toBeGreaterThanOrEqual(1);
    } finally {
      if (pageId) {
        await api.put(`/api/pd/page-builder/pages/${pageId}`, { is_published: false }).catch(() => undefined);
        await api.delete(`/api/pd/page-builder/pages/${pageId}`).catch(() => undefined);
      }
    }
  });
});

test.describe('Page Builder editor browser flow', () => {
  test('adds quick sections by click and drag-and-drop in the editor', async ({ page }) => {
    const api = sharedApi;
    const slug = `qa-pb-editor-${Date.now().toString(36)}`;
    const title = `QA Editor ${slug}`;
    let pageId = '';

    try {
      const create = await api.post('/api/pd/page-builder/pages', {
        slug,
        title,
        builder_data: { source: 'playwright-page-builder-editor' },
        html: '<section><h1>QA editor starter</h1></section>',
        css: '',
        show_in_navigation: false,
        show_in_footer: false,
      });
      expect(create.ok()).toBeTruthy();
      pageId = (await create.json()).page.id;

      await api.addCookiesTo(page.context());
      await page.goto('/hub/dashboard/page-builder');
      await expect(page).toHaveURL(/\/hub\/dashboard\/page-builder/);
      await expect(page.getByTestId(`page-builder-page-card-${pageId}`)).toContainText(title, { timeout: 20_000 });
      await page.getByTestId(`page-builder-edit-page-${pageId}`).click();

      await expect(page.getByTestId('page-builder-editor')).toBeVisible({ timeout: 30_000 });
      await page.getByTestId('page-builder-sections-toggle').click();

      const heroSection = page.getByTestId('page-builder-section-store-hero');
      const productsSection = page.getByTestId('page-builder-section-featured-products');
      const canvasDropTarget = page.getByTestId('page-builder-canvas-drop-target');

      await expect(heroSection).toBeEnabled({ timeout: 30_000 });
      await heroSection.click();
      await expect(page.getByText(/section "hero boutique dynamique" ajoutée au brouillon/i)).toBeVisible({ timeout: 10_000 });

      await expect(productsSection).toBeEnabled({ timeout: 30_000 });
      await productsSection.dragTo(canvasDropTarget);
      await expect(page.getByText(/section "produits sélectionnés" déposée dans le brouillon/i)).toBeVisible({ timeout: 10_000 });

      const saveResponse = page.waitForResponse((response) =>
        response.url().includes(`/api/pd/page-builder/pages/${pageId}`) &&
        response.request().method() === 'PUT' &&
        response.ok(),
      );
      await page.getByRole('button', { name: /sauvegarder brouillon/i }).click();
      await saveResponse;

      const saved = await api.get(`/api/pd/page-builder/pages/${pageId}`);
      expect(saved.ok()).toBeTruthy();
      const savedBody = await saved.json();
      expect(savedBody.page.html).toContain('data-pd-block="store-hero"');
      expect(savedBody.page.html).toContain('data-pd-block="featured-products"');
    } finally {
      if (pageId) {
        await api.put(`/api/pd/page-builder/pages/${pageId}`, { is_published: false }).catch(() => undefined);
        await api.delete(`/api/pd/page-builder/pages/${pageId}`).catch(() => undefined);
      }
    }
  });
});

