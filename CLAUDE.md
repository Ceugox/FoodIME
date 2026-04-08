# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FoodIME is a web SaaS food marketplace for universities (starting at IME — Instituto Militar de Engenharia). It connects informal food vendors (sellers) with students (buyers) via an in-app payment system powered by **Efí Bank** (Pix + Credit Card). All payments go to the company account; admin handles seller payouts manually.

**Three user roles:** Buyer, Seller, Admin.

## Project Structure

```
foodime/
├── foodime-v3/  ← Next.js 15 full-stack app (frontend + API routes + Prisma)
├── docs/        ← Architecture, payment, and Supabase skill docs
└── railway.json ← Railway deploy config (references foodime-v3/Dockerfile)
```

All active development is in `foodime-v3/`. Always read `docs/PROJECT_MASTER.md` for full context before starting any task.

## Key Commands

```bash
cd foodime-v3
npm run dev              # Next.js dev server (port 3000)
npm run build            # production build
npm run lint             # ESLint
npx prisma migrate dev --name <name>   # create + apply migration
npx prisma migrate deploy              # apply migrations in production
npx prisma studio                      # visual DB editor
```

## Architecture (foodime-v3)

### Stack
- **Next.js 15** App Router — Server Components by default, `'use client'` only when needed
- **Prisma** ORM with Supabase PostgreSQL
- **API Routes** at `src/app/api/` — NestJS-style modules replaced by Next.js route handlers
- **Zustand** for global client state (auth, cart)
- **TanStack Query** for server data fetching
- **Tailwind CSS** with warm-orange theme

### Route Groups
- `(auth)` — `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`
- `(buyer)` — `/home`, `/store/:id`, `/cart`, `/checkout/:orderId`, `/orders`, `/profile`
- `(seller)` — `/dashboard`, `/seller/orders`, `/seller/products`, `/seller/store`, `/seller/financial`
- `(admin)` — `/admin/dashboard`, `/admin/users`, `/admin/stores`, `/admin/coupons`, `/admin/payouts`, `/admin/transactions`

### Database (Supabase + Prisma)
- `DATABASE_URL` points to Supabase connection pooler (port 6543, `?pgbouncer=true`)
- `DIRECT_URL` points to direct connection (port 5432) — used by Prisma migrations only
- Both URLs must be in `schema.prisma` as `url` and `directUrl`
- **Every table must have RLS enabled** before production — use Supabase MCP to apply RLS policies

### Payments (Efí Bank)
- **No split**: all payments go to the company's Efí Bank account. Seller payouts handled manually by admin.
- Commission calculated per order (`store.commissionRate`) and stored in the Payment record.
- **PIX**: `PUT /v2/cob/:txid` → returns `pixCopiaECola` string → QR Code rendered client-side via `qrcode.react` (no extra API scope needed)
- **Credit Card**: token via `payment-token-efi` SDK (jsDelivr CDN) → `POST /v1/charge/one-step`
- Card token: `EfiPay.CreditCard.setAccount(ACCOUNT_ID).setEnvironment(...).setCreditCardData({...}).getPaymentToken()`
- PIX QR Code expires in 15 minutes — frontend polls order status every 3 seconds with countdown timer
- Webhook: validates `txid` in DB before processing
- **Production**: PIX API requires mTLS — `EFI_CERT_BASE64` + `EFI_KEY_BASE64` mandatory

### Auth
- JWT-based (access + refresh tokens)
- Middleware at `src/middleware.ts` — reads `access_token` cookie, role-based redirect
- Google OAuth supported (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`)

## Critical Business Rules

- One order = one seller only (no multi-seller cart)
- Payment happens **before pickup** — buyer pays in-app and shows receipt
- `priceAtPurchase` is snapshotted in `OrderItem` at purchase time — price changes don't affect history
- Products with `stockQty < 10` show "Últimas unidades" badge (`STOCK_WARNING_THRESHOLD = 10`)
- Products with `stockQty == 0` appear unavailable and cannot be added to cart

## Naming Conventions

- Files/folders: `kebab-case`
- Components: `PascalCase` export from `kebab-case` file
- Hooks: prefix `use`
- Zustand stores: suffix `Store`
- Constants: `UPPER_SNAKE_CASE`

## Git / GitHub Conventions

- Branch pattern: `feature/name`, `fix/name`, `chore/name`
- Commit convention: `feat:`, `fix:`, `chore:`, `refactor:`

## Mandatory: Update PROJECT_MASTER.md on Every Change

After completing any code change, you MUST update `docs/PROJECT_MASTER.md`:
1. **Section 12 (Últimas Alterações):** Add a summary of what was changed (date, problem, solution, files). Keep only the **last 2 entries** — when adding a new one, remove the oldest.
2. **Sprint checklist:** Mark completed tasks with `[x]`.
3. **Business rules / architecture sections:** Update if the change affects documented behavior.

## Environment Variables (foodime-v3)

See `docs/PROJECT_MASTER.md` Section 10 for the full list. Key vars:

- `DATABASE_URL` — Supabase pooler (port 6543, `?pgbouncer=true`)
- `DIRECT_URL` — Supabase direct (port 5432)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `EFI_CLIENT_ID`, `EFI_CLIENT_SECRET`, `EFI_PIX_KEY`, `EFI_SANDBOX`
- `EFI_CERT_BASE64`, `EFI_KEY_BASE64` — mTLS certs (production only)
- `NEXT_PUBLIC_EFI_PAYEE_CODE`, `NEXT_PUBLIC_EFI_ACCOUNT_ID`, `NEXT_PUBLIC_EFI_SANDBOX`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `CRON_SECRET`

## MCP Servers Available

- **Filesystem MCP** — read/write project files directly
- **Supabase MCP** — apply migrations, manage RLS policies, query data
- **GitHub MCP** — create branches, commits, PRs

## Detailed Skill Docs

Before working on these areas, read the corresponding file in `docs/`:
- `PAYMENT_SKILL.md` — Efí Bank integration, webhook, PIX/card flows
- `SUPABASE_SKILL.md` — Prisma query patterns, RLS SQL policies, Storage, Realtime
