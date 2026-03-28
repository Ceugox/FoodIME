# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

FoodIME is a mobile SaaS food marketplace for universities (starting at IME — Instituto Militar de Engenharia). It connects informal food vendors (sellers) with students (buyers) via an in-app payment system powered by Mercado Pago (Pix + Credit Card). All payments go to the company account; admin handles seller payouts manually.

**Three user roles:** Buyer, Seller, Admin.

## Monorepo Structure

```
foodime/
├── backend/     ← NestJS API (Node.js + TypeScript + Prisma)
├── mobile/      ← React Native + Expo SDK (TypeScript)
├── admin/       ← Next.js with App Router (TypeScript)
└── docs/        ← Architecture, component, payment, and Supabase skill docs
```

Each app has its own `package.json` and `.env`. Always read `docs/PROJECT_MASTER.md` for full context before starting any task.

## Key Commands

### Backend
```bash
cd backend
npm run start:dev        # start with hot reload
npm run build            # compile TypeScript
npm run test             # unit tests
npm run test:e2e         # end-to-end tests
npx prisma migrate dev --name <name>   # create + apply migration
npx prisma migrate deploy              # apply migrations in production
npx prisma studio                      # visual DB editor
```

### Mobile
```bash
cd mobile
npx expo start           # start Expo dev server
npx expo start --ios     # iOS simulator
npx expo start --android # Android emulator
npx eas build --platform android --profile preview  # EAS build
```

### Admin
```bash
cd admin
npm run dev              # Next.js dev server
npm run build            # production build
npm run lint             # ESLint
```

## Architecture

### Backend (NestJS)
- Each feature is a NestJS **module** under `src/modules/` with `controller`, `service`, `module`, and `dto/` folder
- `PrismaService` is injected into services — never use Prisma client directly elsewhere
- Guards: `JwtAuthGuard` (all protected routes) + `RolesGuard` + `@Roles()` decorator
- `@CurrentUser()` decorator extracts the authenticated user from the JWT payload
- Errors: use NestJS built-in exceptions (`NotFoundException`, `ForbiddenException`, etc.); use `findUniqueOrThrow` instead of null-checking manually
- DTOs: use `class-validator`; `UpdateDto` always extends `PartialType(CreateDto)`
- API responses: always return objects — `{ data: {...} }` for success, `{ message: '...' }` for no-data success
- Enable `rawBody: true` in `NestFactory.create` — kept for backward compatibility

### Mobile (React Native + Expo)
- Navigation: two stacks loaded by role (`BuyerNavigator`, `SellerNavigator`), selected in `RootNavigator` via Zustand auth state
- Global state: **Zustand** (auth, cart, notifications) — stores in `src/store/`, suffix `Store`
- Server data: **React Query** — hooks in `src/hooks/`, all queries/mutations go through hooks
- HTTP: **Axios** instance in `src/services/api.ts` with JWT injection interceptor and refresh token interceptor
- Every screen must handle `isLoading → <LoadingState />` and `isError → <ErrorState onRetry={refetch} />`
- Styles: always `StyleSheet.create` — never inline styles for fixed values; spacing in multiples of 4
- Colors: use `Colors` palette from `constants/colors.ts` (primary `#F97316`)

### Admin (Next.js)
- App Router (`app/` directory); Server Components by default, `'use client'` only when needed
- Route protection via Next.js middleware checking role `ADMIN`
- UI: **shadcn/ui** for components, **Tremor** for dashboards/charts

### Database (Supabase + Prisma)
- `DATABASE_URL` points to Supabase connection pooler (port 6543, with `?pgbouncer=true`)
- `DIRECT_URL` points to direct connection (port 5432) — used by Prisma migrations only
- Both URLs must be in `schema.prisma` as `url` and `directUrl`
- **Every table must have RLS enabled** before production — use Supabase MCP to apply RLS policies
- Supabase Realtime is used on the seller mobile app as a fallback for Socket.io (enable with `ALTER PUBLICATION supabase_realtime ADD TABLE "Order"`)

### Payments (Mercado Pago)
- **No split**: all payments go to the company's Mercado Pago account (CPF do fundador). Seller payouts are handled manually by admin.
- Commission is calculated per order (`store.commissionRate`) and stored in the Payment record for admin visibility.
- Pix: `POST /v1/payments` with `payment_method_id: 'pix'` — returns QR code string + base64 image. Mobile renders QR via `react-native-qrcode-svg`.
- Credit Card: `POST /v1/payments` with token from MP SDK — never store raw card data.
- **Credit Card immediate resolution**: MP may return `approved` or `rejected` immediately. Backend checks `result.status` after creating card payment — if `approved`, confirms order instantly without waiting for webhook. If `rejected`, throws `BadRequestException` with mapped Portuguese error message via `getCardRejectionMessage(status_detail)`.
- Pix QR Code expires in 15 minutes — mobile polls order status every 3 seconds; shows countdown timer.
- Webhook at `POST /payments/webhook`: validate `x-signature` header (HMAC-SHA256 with `ts`, `data.id`, `request-id`). Return 200 even for invalid signatures (but do not process).
- On `payment.updated` webhook: fetch `GET /v1/payments/:id` to confirm real status. If `approved` → confirm order; if `rejected`/`cancelled` → fail order.
- Stock decrement happens inside an atomic `prisma.$transaction` after confirmation (webhook or immediate) — if stock is insufficient, automatically refund via MP API and cancel the order.
- No `gatewayId` on Store — sellers don't need Mercado Pago accounts.

## IMPORTANT: Scope Restriction

**DO NOT modify any code inside the `mobile/` directory.** All current development is focused on `backend/` and `web/` (frontend Next.js). The mobile app (React Native + Expo) is frozen and should not be touched.

## Critical Business Rules

- One order = one seller only (no multi-seller cart)
- Payment happens **before pickup** — buyer pays in-app and shows receipt
- `priceAtPurchase` is snapshotted in `OrderItem` at purchase time — price changes don't affect history
- Products with `stockQty < 10` show "Últimas unidades" badge (`STOCK_WARNING_THRESHOLD = 10`)
- Products with `stockQty == 0` appear unavailable and cannot be added to cart

## Naming Conventions

- Files/folders: `kebab-case` (`auth.service.ts`, `store-card.tsx`)
- Components: `PascalCase` export from `kebab-case` file (`store-card.tsx` exports `StoreCard`)
- Screens: suffix `Screen` (`HomeScreen.tsx`)
- Hooks: prefix `use` (`useAuth.ts`)
- Zustand stores: suffix `Store` (`authStore.ts`)
- Constants: `UPPER_SNAKE_CASE`
- REST endpoints: plural nouns, kebab-case; non-CRUD actions via verb: `POST /stores/:id/open`

## Git / GitHub Conventions

- Branch pattern: `feature/name`, `fix/name`, `chore/name`
- Commit convention: `feat:`, `fix:`, `chore:`, `refactor:`

## Mandatory: Update PROJECT_MASTER.md on Every Change

After completing any code change, you MUST update `docs/PROJECT_MASTER.md`:
1. **Section 12 (Últimas Alterações):** Add a summary of what was changed (date, problem, solution, files). Keep only the **last 2 entries** — when adding a new one, remove the oldest.
2. **Sprint checklist:** Mark completed tasks with `[x]`.
3. **Business rules / architecture sections:** Update if the change affects documented behavior.

This rule exists so that all developers (and their Codex sessions) stay aware of recent changes.

## Environment Variables

See `docs/PROJECT_MASTER.md` Section 10 for the full list. Key vars per app:
- **Backend**: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- **Mobile**: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Admin**: `NEXT_PUBLIC_API_URL`

## MCP Servers Available

- **Filesystem MCP** — read/write project files directly
- **Supabase MCP** — apply migrations, manage RLS policies, query data
- **GitHub MCP** — create branches, commits, PRs (branch/commit conventions above)

## Detailed Skill Docs

Before working on these areas, read the corresponding file in `docs/`:
- `ARCHITECTURE_SKILL.md` — full NestJS module anatomy, DTOs, React Query/Zustand patterns
- `COMPONENT_SKILL.md` — component structure, LoadingState, ErrorState, color palette, Button
- `PAYMENT_SKILL.md` — Mercado Pago integration code, webhook controller, mobile Pix/card flows
- `SUPABASE_SKILL.md` — Prisma query patterns, RLS SQL policies, Storage upload, Realtime setup
