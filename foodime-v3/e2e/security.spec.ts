import { test, expect } from '@playwright/test';
import { generateTestToken } from './fixtures';

async function setAccessToken(page: import('@playwright/test').Page, role: 'BUYER' | 'SELLER' | 'ADMIN') {
  const token = await generateTestToken({
    id: `security-${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@security.test`,
    role,
  });

  await page.context().addCookies([
    {
      name: 'access_token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });
}

test.describe('Security boundaries', () => {
  test('protected buyer page redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/checkout/fake-order-id');

    await expect(page).toHaveURL(/\/login/);
  });

  test('buyer token cannot access admin pages', async ({ page }) => {
    await setAccessToken(page, 'BUYER');

    await page.goto('/admin/dashboard');

    await expect(page).not.toHaveURL(/\/admin/);
    await expect(page).toHaveURL(/\/home/);
  });

  test('seller token cannot access buyer pages', async ({ page }) => {
    await setAccessToken(page, 'SELLER');

    await page.goto('/home');

    await expect(page).not.toHaveURL(/\/home/);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('protected API rejects missing access token before touching business logic', async ({ request }) => {
    const response = await request.post('/api/orders', {
      data: { storeId: 'not-a-uuid', items: [] },
    });

    expect(response.status()).toBe(401);
    await expect(await response.json()).toEqual({ message: 'Não autenticado' });
  });

  test('protected API rejects forged access token', async ({ request }) => {
    const response = await request.post('/api/orders', {
      headers: { Cookie: 'access_token=forged.invalid.token' },
      data: { storeId: 'not-a-uuid', items: [] },
    });

    expect(response.status()).toBe(401);
    await expect(await response.json()).toEqual({ message: 'Token inválido ou expirado' });
  });

  test('PIX webhook acknowledges malformed payload without confirming payment', async ({ request }) => {
    const response = await request.post('/api/payments/webhook', {
      data: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(200);
    await expect(await response.json()).toEqual({ received: true });
  });
});
