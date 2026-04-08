import { test, expect } from '@playwright/test';

// Efí Bank sandbox rules (from dev.efipay.com.br docs):
// Last digit of card determines outcome:
//   1 → Invalid card data
//   2 → Not authorized (security)
//   3 → Not authorized (try again)
//   other → APPROVED ✅
// Card must also pass Luhn check (SDK validates client-side)
const TEST_CARD = {
  number: '4485 7856 7429 0087', // Visa — ends in 7 → APPROVED, passes Luhn
  name: 'Marcelo Teste',
  expMonth: '05',
  expYear: '2028',
  cvv: '123',
  cpf: '942.715.646-56',
};

test('credit card payment end-to-end', async ({ page }) => {
  // ── 1. Login ────────────────────────────────────────────────────────────
  await page.goto('/login');
  await page.getByPlaceholder('seu@email.com').fill('marcelo@foodime.com');
  await page.locator('input[type="password"]').fill('Senha1234');
  await page.getByRole('button', { name: /entrar/i }).click();

  // Wait for redirect to /home after successful login
  await page.waitForURL(/\/home/, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/home/);
  console.log('✅ Login OK');

  // ── 2. Navigate to store ─────────────────────────────────────────────
  await page.waitForSelector('a[href^="/store/"]', { timeout: 8_000 });
  await page.locator('a[href^="/store/"]').first().click();
  await page.waitForURL(/\/store\//, { timeout: 8_000 });
  console.log('✅ Store page OK — URL:', page.url());

  // ── 3. Add product to cart ───────────────────────────────────────────
  // Click the first "Adicionar" button
  const addBtn = page.getByRole('button', { name: /adicionar/i }).first();
  await expect(addBtn).toBeVisible({ timeout: 8_000 });
  await addBtn.click();
  console.log('✅ Product added to cart');

  // ── 4. Go to cart ─────────────────────────────────────────────────────
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: /carrinho/i })).toBeVisible({ timeout: 5_000 });
  console.log('✅ Cart page OK');

  // ── 5. Create order ───────────────────────────────────────────────────
  const checkoutBtn = page.getByRole('button', { name: /ir para pagamento/i });
  await expect(checkoutBtn).toBeVisible({ timeout: 5_000 });
  await checkoutBtn.click();

  // Wait for redirect to /checkout/:orderId
  await page.waitForURL(/\/checkout\//, { timeout: 15_000 });
  console.log('✅ Checkout page OK — URL:', page.url());

  // ── 6. Switch to card tab ─────────────────────────────────────────────
  const cardTab = page.getByRole('button', { name: /cartão de crédito/i });
  await expect(cardTab).toBeVisible({ timeout: 5_000 });
  await cardTab.click();
  console.log('✅ Card tab selected');

  // ── 7. Fill card form ─────────────────────────────────────────────────
  await page.getByPlaceholder('0000 0000 0000 0000').fill(TEST_CARD.number);
  await page.getByPlaceholder('NOME COMO NO CARTÃO').fill(TEST_CARD.name);
  await page.getByPlaceholder('MM').fill(TEST_CARD.expMonth);
  await page.getByPlaceholder('AAAA').fill(TEST_CARD.expYear);
  await page.getByPlaceholder('123').fill(TEST_CARD.cvv);
  await page.getByPlaceholder('000.000.000-00').fill(TEST_CARD.cpf);
  console.log('✅ Card form filled');

  // ── 8. Capture all network 4xx/5xx + console errors ─────────────────
  const badResponses: string[] = [];
  const consoleErrors: string[] = [];
  page.on('response', (res) => {
    if (res.status() >= 400) badResponses.push(`${res.status()} ${res.url()}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // ── 9. Start watching BEFORE click ───────────────────────────────────
  let toastMessage = '';
  let navigatedToOrders = false;
  const t0 = Date.now();

  const toastCatcher = page.locator('.fixed.top-4.right-4 p.text-sm').first()
    .waitFor({ state: 'visible', timeout: 40_000 })
    .then(async () => {
      toastMessage = await page.locator('.fixed.top-4.right-4 p.text-sm').first().textContent() ?? '';
    })
    .catch(() => { /* no toast — likely successful redirect */ });

  const redirectCatcher = page.waitForURL(/\/orders/, { timeout: 40_000 })
    .then(() => { navigatedToOrders = true; })
    .catch(() => { /* no redirect — likely error toast */ });

  // ── 10. Submit payment ────────────────────────────────────────────────
  const payBtn = page.getByRole('button', { name: /pagar com cartão/i });
  await expect(payBtn).toBeVisible({ timeout: 5_000 });
  await payBtn.click();
  console.log('⏳ Payment submitted — observing...');

  // Wait for whichever comes first: redirect to /orders OR an error toast
  await Promise.race([redirectCatcher, toastCatcher]);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`⏱️  Elapsed after click: ${elapsed}s`);
  console.log('🌐 Bad responses (4xx/5xx):', badResponses.length ? badResponses : '(none)');
  console.log('🖥️  Console errors:', consoleErrors.length ? consoleErrors.slice(0, 5) : '(none)');
  console.log('💬 Toast:', toastMessage || '(none)');
  console.log('🔀 Redirected to /orders:', navigatedToOrders);

  // Screenshot: may fail if page already navigated (success path), that's OK
  await page.screenshot({ path: 'e2e/card-result.png' }).catch(() => {});

  const isSuccessToast = /cartão aprovado|pagamento confirmado/i.test(toastMessage);

  if (navigatedToOrders) {
    console.log('✅ CARTÃO APROVADO — redirecionado para /orders!');
    expect(page.url()).toContain('/orders');
  } else if (isSuccessToast) {
    // "Cartão aprovado!" toast fires before polling confirms the order as PAID.
    // Wait up to 20s more for the /orders redirect (poll interval 3s + 1.5s redirect).
    console.log('✅ Toast de aprovação recebido — aguardando redirecionamento...');
    await page.waitForURL(/\/orders/, { timeout: 20_000 });
    console.log('✅ CARTÃO APROVADO — redirecionado para /orders!');
    expect(page.url()).toContain('/orders');
  } else if (toastMessage) {
    // Error toast without redirect = payment failed
    throw new Error(`Pagamento falhou. Toast: "${toastMessage}" | Bad responses: ${badResponses.join(', ') || '(none)'}`);
  } else {
    throw new Error(`Sem feedback visível após 40s. Bad responses: ${badResponses.join(', ') || '(none)'}`);
  }
});
