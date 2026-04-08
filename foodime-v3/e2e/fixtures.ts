import fs from 'fs';
import path from 'path';
import { SignJWT } from 'jose';
import type { Page, BrowserContext } from '@playwright/test';

// Load JWT_SECRET from .env file (Playwright runs outside Next.js env)
function loadEnv(): Record<string, string> {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return {};
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  const env: Record<string, string> = {};
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

const ENV = loadEnv();
const JWT_SECRET = ENV.JWT_SECRET || 'fallback-test-secret-32-chars-minimum';

export async function generateTestToken(payload: { id: string; email: string; role: string }): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(new TextEncoder().encode(JWT_SECRET));
}

export const MOCK_USER = {
  id: 'test-user-id',
  name: 'Comprador Teste',
  email: 'buyer@test.com',
  role: 'BUYER' as const,
  status: 'ACTIVE',
  phone: '(21)99999-9999',
};

export const MOCK_STORES = {
  data: [
    {
      id: 'store-1',
      name: 'Lanches da Ana',
      description: 'Os melhores lanches do IME — lanches e salgados',
      isOpen: true,
      imageUrl: null,
      commissionRate: 0.1,
      products: [{ id: 'p1' }, { id: 'p2' }],
    },
    {
      id: 'store-2',
      name: 'Bebidas Frias',
      description: 'Bebidas geladas e refrescos naturais',
      isOpen: false,
      imageUrl: null,
      commissionRate: 0.1,
      products: [],
    },
  ],
};

export const MOCK_ORDERS = {
  data: [
    {
      id: 'order-1',
      code: 'A001',
      status: 'PAID',
      totalAmount: 25.50,
      createdAt: new Date().toISOString(),
      store: { name: 'Lanches da Ana' },
      items: [
        { id: 'i1', quantity: 2, priceAtPurchase: 12.75, product: { name: 'X-Burguer', imageUrl: null } },
      ],
    },
    {
      id: 'order-2',
      code: 'A002',
      status: 'PICKED_UP',
      totalAmount: 10.00,
      createdAt: new Date().toISOString(),
      store: { name: 'Bebidas Frias' },
      items: [
        { id: 'i2', quantity: 1, priceAtPurchase: 10.00, product: { name: 'Suco de Laranja', imageUrl: null } },
      ],
      payment: { method: 'PIX', status: 'PAID' },
    },
  ],
};

/** Inject auth cookie + mock common API routes so tests work without the DB */
export async function setupAuthenticatedSession(context: BrowserContext | Page, role: 'BUYER' | 'SELLER' | 'ADMIN' = 'BUYER') {
  const ctx = 'context' in context ? (context as Page).context() : context as BrowserContext;
  const page = context as Page;

  const token = await generateTestToken({ id: MOCK_USER.id, email: MOCK_USER.email, role });

  // Inject the access_token cookie so Next.js middleware allows access
  await ctx.addCookies([
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

  // Seed Zustand auth store in localStorage so pages that read from the store
  // (e.g. profile/page.tsx uses useAuthStore) find the user without a real login
  await page.addInitScript((user) => {
    window.localStorage.setItem('auth-storage', JSON.stringify({
      state: { user, isAuthenticated: true },
      version: 0,
    }));
  }, MOCK_USER);

  // Mock API routes so the app doesn't call the real (unavailable) DB
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: MOCK_USER }) });
  });

  await page.route('**/api/stores**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_STORES) });
  });

  // Wildcard FIRST (lower LIFO priority) — single order detail
  await page.route('**/api/orders/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: MOCK_ORDERS.data[0] }) });
  });

  // Specific route LAST (higher LIFO priority) — overrides wildcard for /buyer list
  await page.route('**/api/orders/buyer**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ORDERS) });
  });

  await page.route('**/api/auth/logout', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
  });
}
