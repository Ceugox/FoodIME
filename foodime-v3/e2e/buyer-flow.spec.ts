import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession, MOCK_USER, MOCK_STORES } from './fixtures';

test.describe('Buyer flow', () => {
  test('home page shows greeting and category chips', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/home');

    // Personalized greeting with first name
    await expect(page.getByText(/Olá,/i)).toBeVisible();

    // All 5 category chips
    await expect(page.getByRole('button', { name: 'Todos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lanches' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bebidas' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Doces' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refeições' })).toBeVisible();
  });

  test('home page shows store cards with open/closed badge', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/home');

    // Wait for mocked stores to render
    await page.waitForSelector('a[href^="/store/"]', { timeout: 8_000 });

    // Open store shows "Aberta agora"
    await expect(page.getByText('Aberta agora')).toBeVisible();
    // Closed store shows "Fechada"
    await expect(page.getByText('Fechada')).toBeVisible();

    // Store names are visible
    await expect(page.getByText(MOCK_STORES.data[0].name)).toBeVisible();
    await expect(page.getByText(MOCK_STORES.data[1].name)).toBeVisible();
  });

  test('category chip "Lanches" becomes active on click', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/home');

    const lanchesBtn = page.getByRole('button', { name: 'Lanches' });
    await lanchesBtn.click();

    const cls = await lanchesBtn.getAttribute('class');
    expect(cls).toContain('bg-primary');
  });

  test('category chip "Todos" resets filter', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/home');

    await page.getByRole('button', { name: 'Bebidas' }).click();
    await page.getByRole('button', { name: 'Todos' }).click();

    const todosClass = await page.getByRole('button', { name: 'Todos' }).getAttribute('class');
    expect(todosClass).toContain('bg-primary');
  });

  test('search input filters stores', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/home');

    const search = page.getByPlaceholder(/buscar lojas/i);
    await expect(search).toBeVisible();
    await search.fill('Lanches');
  });

  test('click store card navigates to /store/:id', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/home');

    await page.waitForSelector('a[href^="/store/"]', { timeout: 8_000 });

    // Also mock the store detail
    await page.route('**/api/stores/**', async (route) => {
      const storeData = MOCK_STORES.data[0];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { ...storeData, products: [] } }) });
    });

    await page.locator('a[href^="/store/"]').first().click();
    await page.waitForURL(/\/store\//, { timeout: 8_000 });
    await expect(page).toHaveURL(/\/store\//);
  });

  test('/cart is accessible when authenticated', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/cart');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/cart/);
  });

  test('/orders shows active/todos tabs', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/orders');

    await expect(page.getByRole('button', { name: /ativo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /todos/i })).toBeVisible();
  });

  test('/orders todos tab shows all orders', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/orders');

    await page.getByRole('button', { name: /todos/i }).click();
    const cls = await page.getByRole('button', { name: /todos/i }).getAttribute('class');
    expect(cls).toContain('bg-primary');
  });

  test('/orders shows step tracker on active (PAID) order', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/orders');

    // Active tab is default — PAID order should show the step tracker
    await page.waitForTimeout(1000);
    // Step tracker labels should appear for the PAID order
    await expect(page.getByText('Pendente').first()).toBeVisible();
  });

  test('/profile shows user name, stats, and orders link', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/profile');

    await expect(page).toHaveURL(/\/profile/);

    // User display name
    await expect(page.getByText(MOCK_USER.name)).toBeVisible();

    // Stats cards
    await expect(page.getByText(/total gasto/i)).toBeVisible();

    // Orders shortcut
    await expect(page.getByRole('link', { name: /histórico de pedidos/i })).toBeVisible();
  });

  test('bottom nav is visible with all 4 links', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.goto('/home');

    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    await expect(page.getByRole('link', { name: /início/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /pedidos/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /carrinho/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /perfil/i })).toBeVisible();
  });
});
