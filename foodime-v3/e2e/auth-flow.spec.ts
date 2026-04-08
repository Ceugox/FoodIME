import { test, expect } from '@playwright/test';

// Auth routes mock (no DB needed)
async function mockAuthRoutes(page: any) {
  await page.route('**/api/auth/register', async (route: any) => {
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ message: 'Conta criada. Verifique seu email.' }) });
  });

  await page.route('**/api/auth/forgot-password', async (route: any) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Email enviado' }) });
  });

  // The API client retries on 401 after calling /refresh, so we mock refresh to
  // return 200 (preventing the window.location redirect) and let the login retry
  // return 401 again, which causes a proper throw back to handleSubmit.
  await page.route('**/api/auth/refresh', async (route: any) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
  });

  await page.route('**/api/auth/login', async (route: any) => {
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.email === 'buyer@test.com' && body.password === 'senha123') {
      // Return success — BUT we can't set HTTP-only cookie from mock.
      // So login redirect tests are done via cookie injection (buyer-flow.spec.ts).
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
    } else {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Credenciais inválidas' }) });
    }
  });

  await page.route('**/api/auth/verify-email', async (route: any) => {
    await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Token inválido ou expirado.' }) });
  });
}

test.describe('Auth flow', () => {
  // ── Page rendering tests ────────────────────────────────────────────────

  test('login page renders form correctly', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('FoodIME')).toBeVisible();
    await expect(page.getByPlaceholder('seu@email.com')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();
  });

  test('login page has link to register (Cadastre-se)', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /cadastre-se/i })).toBeVisible();
  });

  test('login page has forgot-password link', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /esqueceu a senha/i })).toBeVisible();
  });

  test('register page renders form with role selector', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByRole('button', { name: /comprador/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /vendedor/i })).toBeVisible();
    await expect(page.getByPlaceholder('João Silva')).toBeVisible();
    await expect(page.getByPlaceholder('seu@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('(21) 99999-9999')).toBeVisible();
    await expect(page.getByPlaceholder('Mín. 8 caracteres')).toBeVisible();
    await expect(page.getByRole('button', { name: /criar conta/i })).toBeVisible();
  });

  test('register page has link back to login (Entrar)', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('link', { name: /entrar/i })).toBeVisible();
  });

  test('forgot-password page renders correctly', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.getByText(/esqueceu a senha/i)).toBeVisible();
    await expect(page.getByPlaceholder('seu@email.com')).toBeVisible();
    await expect(page.getByRole('button', { name: /enviar link/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /voltar para login/i })).toBeVisible();
  });

  // ── Interaction tests ───────────────────────────────────────────────────

  test('register seller role toggles selection', async ({ page }) => {
    await page.goto('/register');

    const sellerBtn = page.getByRole('button', { name: /vendedor/i });
    await sellerBtn.click();

    const cls = await sellerBtn.getAttribute('class');
    expect(cls).toContain('border-primary');
  });

  test('register form submits and shows email-sent state', async ({ page }) => {
    await mockAuthRoutes(page);
    await page.goto('/register');

    await page.getByPlaceholder('João Silva').fill('Usuário Teste');
    await page.getByPlaceholder('seu@email.com').fill('novo@example.com');
    await page.getByPlaceholder('(21) 99999-9999').fill('(21) 99999-9999');
    await page.getByPlaceholder('Mín. 8 caracteres').fill('senha12345');
    await page.getByRole('button', { name: /criar conta/i }).click();

    await expect(page.getByText(/verifique seu email/i)).toBeVisible({ timeout: 8_000 });
  });

  test('register seller shows pending approval info', async ({ page }) => {
    await mockAuthRoutes(page);
    await page.goto('/register');

    await page.getByRole('button', { name: /vendedor/i }).click();
    await page.getByPlaceholder('João Silva').fill('Vendedor Teste');
    await page.getByPlaceholder('seu@email.com').fill('vendedor@example.com');
    await page.getByPlaceholder('(21) 99999-9999').fill('(21) 99999-9999');
    await page.getByPlaceholder('Mín. 8 caracteres').fill('senha12345');
    await page.getByRole('button', { name: /criar conta/i }).click();

    await expect(page.getByText(/verifique seu email/i)).toBeVisible({ timeout: 8_000 });
    // Seller sees approval notice
    await expect(page.getByText(/analisada por um administrador/i)).toBeVisible();
  });

  test('forgot-password shows success state after submit', async ({ page }) => {
    await mockAuthRoutes(page);
    await page.goto('/forgot-password');

    await page.getByPlaceholder('seu@email.com').fill('alguem@example.com');
    await page.getByRole('button', { name: /enviar link/i }).click();

    await expect(page.getByText(/email enviado/i)).toBeVisible({ timeout: 8_000 });
  });

  test('reset-password page reads token from URL', async ({ page }) => {
    await page.goto('/reset-password?token=mock-token-xyz');

    // Use heading role to avoid strict-mode conflict with the submit button text
    await expect(page.getByRole('heading', { name: /redefinir senha/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('verify-email without token shows error state', async ({ page }) => {
    await mockAuthRoutes(page);
    await page.goto('/verify-email');

    // Loading → error (no token in URL); use heading role to avoid strict-mode
    // conflict with the error message paragraph that also contains "token"
    await expect(page.getByRole('heading', { name: /erro na verificação/i })).toBeVisible({ timeout: 8_000 });
  });

  test('login with wrong credentials shows inline error', async ({ page }) => {
    await mockAuthRoutes(page);
    await page.goto('/login');

    await page.getByPlaceholder('seu@email.com').fill('errado@example.com');
    await page.locator('input[type="password"]').fill('senhaerrada');
    await page.getByRole('button', { name: /entrar/i }).click();

    // The error div wraps a <p class="text-error text-xs">; use text content match
    // to avoid issues with CSS class selector edge cases
    await expect(page.getByText(/credenciais inválidas/i)).toBeVisible({ timeout: 8_000 });
  });
});
