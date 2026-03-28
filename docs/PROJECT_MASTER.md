# PROJECT MASTER — FoodIME
> Documento de referência completo para uso no Claude Code com MCPs e Skills.
> Leia este arquivo antes de qualquer tarefa de desenvolvimento.

---

## 1. Visão Geral do Produto

SaaS mobile de venda de comida dentro de faculdades, começando pelo IME (Instituto Militar de Engenharia). Centraliza vendedores informais de comida (doces, salgados, marmitas) e compradores (alunos) numa plataforma com pagamento in-app, split automático de comissão e gestão de estoque em tempo real.

**Três perfis de usuário:**
- **Comprador** — descobre vendedores, faz pedidos e paga pelo app
- **Vendedor** — gerencia loja, produtos, estoque e recebe pedidos em tempo real
- **Admin** — painel web com acesso total ao sistema

---

## 2. Regras de Negócio Críticas

- Cada pedido pertence a **um único vendedor** (sem carrinho multi-vendedor)
- Pagamento ocorre **antes da retirada** — comprador paga no app e mostra comprovante
- Split é **instantâneo**: no momento da liquidação, gateway retém comissão e repassa líquido ao vendedor via Pix
- Estoque é decrementado **atomicamente** via transação no banco após confirmação do webhook de pagamento
- Se estoque zerar entre o carrinho e o pagamento, pedido é recusado e valor estornado
- Produtos com **menos de 10 unidades** exibem badge "Últimas unidades" para compradores
- Produtos com estoque **zero** aparecem como indisponíveis e não podem ser adicionados ao carrinho
- Vendedor pode editar quantidade de estoque de forma rápida direto na listagem (sem entrar no produto)
- Preço é **snapshottado** no OrderItem no momento da compra (histórico não é afetado por mudanças futuras de preço)
- Webhook do gateway deve ter **assinatura validada** antes de qualquer processamento
- Cartão de crédito salvo via **card_token** — nunca armazenar dados de cartão diretamente
- Pagamento com cartão pode ser **aprovado ou rejeitado imediatamente** na resposta da API do MP — backend deve verificar `status` e `status_detail` e agir sem esperar webhook
- Rejeições de cartão devem exibir **mensagem específica** ao comprador (mapeamento de `status_detail` em `getCardRejectionMessage()`)

---

## 3. Stack Tecnológica

### Mobile
- **Framework:** React Native com Expo (SDK gerenciado)
- **Linguagem:** TypeScript
- **Navegação:** React Navigation (dois stacks: buyer e seller, carregados por role)
- **Estado global:** Zustand
- **Cache/fetching:** React Query (TanStack Query)
- **HTTP:** Axios com interceptor de refresh token JWT
- **Notificações push:** Expo Notifications + Firebase Cloud Messaging
- **Tempo real:** Socket.io client (para pedidos entrando no vendedor)

### Backend
- **Runtime:** Node.js
- **Framework:** NestJS (TypeScript)
- **ORM:** Prisma
- **Banco:** PostgreSQL via Supabase
- **Tempo real:** Socket.io integrado ao NestJS
- **Autenticação:** JWT + Refresh Token

### Painel Admin
- **Framework:** Next.js (TypeScript)
- **UI:** shadcn/ui + Tremor para dashboards
- **Hospedagem:** Vercel

### Infraestrutura
- **Backend:** Railway (Docker)
- **Banco + Storage:** Supabase
- **App mobile:** Expo EAS Build
- **CI/CD:** GitHub Actions → Railway e Vercel

### Gateway de Pagamento
- **Plataforma:** Mercado Pago
- **Modelo:** Pagamento direto (sem split) — todo dinheiro cai na conta da empresa, admin repassa vendedores manualmente
- **Métodos:** Pix (QR Code dinâmico) e Cartão de Crédito
- **Comissão:** calculada por `store.commissionRate` e registrada no Payment para controle do admin

---

## 4. MCPs Configurados

### Filesystem MCP
- Leitura e edição direta dos arquivos do projeto
- Usar para: criar arquivos, editar código, criar components, services e modules
- **Padrão:** sempre ler o arquivo antes de editar para entender o contexto existente

### Supabase MCP
- Criação de tabelas, migrations e políticas RLS
- Usar para: aplicar schema, criar políticas de segurança, consultar dados, configurar Realtime
- **Padrão:** toda tabela deve ter RLS habilitado antes de ir pra produção

### GitHub MCP
- Versionamento automático com commits e branches por feature
- **Padrão de branches:** `feature/nome-da-feature`, `fix/nome-do-bug`, `chore/nome-da-tarefa`
- **Padrão de commits:** conventional commits — `feat:`, `fix:`, `chore:`, `refactor:`

---

## 5. Skills Disponíveis

### Architecture Skill
- Estrutura de pastas (ver Seção 6)
- Convenções de nomenclatura
- Bibliotecas adotadas (Zustand, React Query)
- **Consultar antes de:** criar qualquer arquivo novo, definir estrutura de módulo

### Supabase Skill
- Como fazer queries com Prisma
- Escrever políticas RLS
- Usar Supabase Realtime para atualização de pedidos
- **Consultar antes de:** criar migrations, escrever queries, configurar RLS

### Component Skill
- Criação de componentes com TypeScript
- Uso de StyleSheet.create
- Tratamento de loading/error states
- **Consultar antes de:** criar qualquer componente React Native

### Payment Skill
- Fluxo completo de pagamento via Pix e Cartão
- Implementação de webhooks
- Atualização de status do pedido
- **Consultar antes de:** qualquer tarefa relacionada ao módulo de pagamentos

---

## 6. Estrutura de Pastas

### Backend (NestJS)
```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── strategies/        ← jwt.strategy.ts, refresh.strategy.ts
│   │   │   └── dto/
│   │   ├── users/
│   │   ├── stores/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── payments/
│   │   │   ├── payments.service.ts
│   │   │   ├── webhook.controller.ts   ← endpoint do webhook Mercado Pago
│   │   │   └── mercadopago.service.ts  ← wrapper da API Mercado Pago
│   │   └── notifications/
│   │       ├── notifications.gateway.ts  ← Socket.io gateway
│   │       └── push.service.ts           ← Expo push notifications
│   ├── common/
│   │   ├── guards/                ← JwtAuthGuard, RolesGuard
│   │   ├── decorators/            ← @Roles(), @CurrentUser()
│   │   ├── interceptors/
│   │   └── pipes/
│   ├── prisma/
│   │   ├── prisma.service.ts
│   │   └── schema.prisma
│   └── main.ts
├── Dockerfile
└── .env.example
```

### Mobile (React Native + Expo)
```
mobile/
├── src/
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── buyer/
│   │   │   ├── HomeScreen.tsx         ← lista de vendedores ativos
│   │   │   ├── StoreScreen.tsx        ← produtos do vendedor
│   │   │   ├── CartScreen.tsx
│   │   │   ├── CheckoutScreen.tsx
│   │   │   ├── OrderConfirmScreen.tsx ← comprovante
│   │   │   └── OrderHistoryScreen.tsx
│   │   └── seller/
│   │       ├── DashboardScreen.tsx    ← métricas financeiras
│   │       ├── OrdersScreen.tsx       ← pedidos em tempo real
│   │       ├── ProductsScreen.tsx     ← CRUD + edição rápida de estoque
│   │       └── StoreSettingsScreen.tsx
│   ├── components/
│   │   ├── common/                ← Button, Input, Card, Badge, LoadingState, ErrorState
│   │   ├── buyer/                 ← StoreCard, ProductCard, CartItem
│   │   └── seller/                ← OrderCard, ProductRow, StockEditor
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCart.ts
│   │   └── useSocket.ts
│   ├── services/
│   │   ├── api.ts                 ← instância Axios configurada
│   │   ├── auth.service.ts
│   │   ├── store.service.ts
│   │   ├── product.service.ts
│   │   ├── order.service.ts
│   │   └── payment.service.ts
│   ├── store/
│   │   ├── authStore.ts           ← Zustand: usuário logado, tokens
│   │   ├── cartStore.ts           ← Zustand: itens do carrinho
│   │   └── notificationStore.ts
│   ├── navigation/
│   │   ├── RootNavigator.tsx      ← decide stack por role
│   │   ├── BuyerNavigator.tsx
│   │   └── SellerNavigator.tsx
│   └── types/
│       ├── api.types.ts
│       ├── models.types.ts
│       └── navigation.types.ts
├── app.json
└── .env.example
```

### Painel Admin (Next.js)
```
admin/
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── sellers/
│   │   │   └── [id]/              ← dashboard individual do vendedor
│   │   ├── buyers/
│   │   │   └── [id]/              ← histórico de compras
│   │   ├── orders/
│   │   └── payouts/
│   ├── components/
│   └── lib/
└── .env.example
```

---

## 7. Schema do Banco (Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  phone     String
  role      Role     @default(BUYER)
  store     Store?
  orders    Order[]
  createdAt DateTime @default(now())
}

model Store {
  id          String    @id @default(uuid())
  owner       User      @relation(fields: [ownerId], references: [id])
  ownerId     String    @unique
  name        String
  description String
  imageUrl    String?
  whatsapp    String
  pixKey      String
  commissionRate Decimal @default(0.10)
  isOpen      Boolean   @default(false)
  products    Product[]
  orders      Order[]
}

model Product {
  id          String      @id @default(uuid())
  store       Store       @relation(fields: [storeId], references: [id])
  storeId     String
  name        String
  imageUrl    String?
  price       Decimal
  stockQty    Int
  isAvailable Boolean     @default(true)
  orderItems  OrderItem[]
}

model Order {
  id          String      @id @default(uuid())
  buyer       User        @relation(fields: [buyerId], references: [id])
  buyerId     String
  store       Store       @relation(fields: [storeId], references: [id])
  storeId     String
  items       OrderItem[]
  payment     Payment?
  status      OrderStatus @default(PENDING)
  code        String      @unique  // comprovante exibido pro comprador
  totalAmount Decimal
  createdAt   DateTime    @default(now())
}

model OrderItem {
  id              String  @id @default(uuid())
  order           Order   @relation(fields: [orderId], references: [id])
  orderId         String
  product         Product @relation(fields: [productId], references: [id])
  productId       String
  quantity        Int
  priceAtPurchase Decimal // snapshot — não muda se vendedor alterar preço
}

model Payment {
  id           String        @id @default(uuid())
  order        Order         @relation(fields: [orderId], references: [id])
  orderId      String        @unique
  method       PaymentMethod
  gatewayTxId  String        // ID do pagamento no Mercado Pago
  grossAmount  Decimal
  commission   Decimal
  netAmount    Decimal
  status       PaymentStatus @default(PROCESSING)
  createdAt    DateTime      @default(now())
}

enum Role          { BUYER SELLER ADMIN }
enum OrderStatus   { PENDING PAID PICKED_UP CANCELLED }
enum PaymentMethod { PIX CREDIT_CARD }
enum PaymentStatus { PROCESSING PAID FAILED REFUNDED }
```

---

## 8. Fluxo Completo de Compra

```
1. Comprador confirma pedido no app
2. App → POST /orders → backend cria Order (status: PENDING)
3. Backend → Mercado Pago: cria pagamento (Pix ou Cartão)
   └── Todo valor vai para conta MP da empresa

FLUXO PIX:
4a. Mercado Pago retorna QR Code Pix (copia-e-cola + base64)
5a. Comprador efetua pagamento no app do banco
6a. Mercado Pago → webhook POST /payments/webhook
7a. Backend valida x-signature do webhook + consulta GET /v1/payments/:id
8a. Transação Prisma atômica (ver abaixo)

FLUXO CARTÃO DE CRÉDITO:
4b. Mercado Pago retorna status na resposta da API
5b. Se status = "approved" → backend confirma imediatamente (sem webhook)
    Se status = "rejected" → retorna erro específico ao mobile (ex: saldo insuficiente, CVV inválido)
    Se status = "in_process" → aguarda webhook (fluxo igual ao Pix: passos 6a-8a)

CONFIRMAÇÃO (transação Prisma atômica):
8. Verifica estoque de cada item
   └── Decrementa stockQty
   └── Atualiza Order.status = PAID
   └── Atualiza Payment.status = PAID
9. Backend emite evento Socket.io → app do vendedor
10. Backend dispara push notification (FCM) → vendedor
11. Comprador vê tela de comprovante com código único
12. Vendedor vê pedido em tempo real + notificação
13. Admin vê comissão e valor líquido → repassa vendedor manualmente via Pix
```

**Caso de falha de estoque:**
```
7b. Se stockQty insuficiente na transação:
    └── Rollback
    └── Backend chama Mercado Pago para estorno (POST /v1/payments/:id/refunds)
    └── Order.status = CANCELLED
    └── Comprador notificado do estorno
```

---

## 9. Plano de Sprints de Desenvolvimento

### Sprint 1 — Setup e Fundação
- [x] Criar monorepo (backend + mobile + admin numa pasta raiz)
- [x] Configurar projeto NestJS com TypeScript
- [x] Configurar Prisma + conexão Supabase
- [x] Aplicar schema inicial via Supabase MCP
- [x] Configurar projeto Expo com TypeScript
- [x] Configurar React Navigation (estrutura de stacks)
- [x] Configurar Zustand e React Query no mobile
- [x] Configurar projeto Next.js para admin
- [x] Setup GitHub MCP: repositório, branches, CI/CD básico
- [x] Criar arquivos .env.example para os três projetos

### Sprint 2 — Autenticação
- [x] Backend: módulo auth com registro e login (JWT + refresh token)
- [x] Backend: guards JwtAuthGuard e RolesGuard
- [x] Backend: endpoints POST /auth/register (buyer e seller), POST /auth/login, POST /auth/refresh
- [x] Mobile: telas de Login e Registro (comprador e vendedor)
- [x] Mobile: Zustand authStore com persistência de token
- [x] Mobile: Axios interceptor de refresh token
- [x] Mobile: RootNavigator com redirecionamento por role
- [x] Admin: tela de login protegida com role ADMIN

### Sprint 3 — Lojas e Produtos
- [x] Backend: módulo stores (CRUD, toggle isOpen)
- [x] Backend: módulo products (CRUD, atualização rápida de stockQty)
- [x] Supabase: políticas RLS para stores e products (SQL em `backend/prisma/rls-store-product.sql`)
- [x] Mobile (seller): tela de configurações da loja
- [x] Mobile (seller): tela de produtos com edição rápida de estoque inline
- [x] Mobile (buyer): tela home com lista de vendedores ativos
- [x] Mobile (buyer): tela da loja com produtos, badge "Últimas unidades" (<10) e bloqueio de produto zerado

### Sprint 4 — Pedidos
- [x] Backend: módulo orders (criação, listagem por role)
- [x] Backend: geração de código único de comprovante
- [x] Mobile (buyer): tela de carrinho
- [x] Mobile (buyer): tela de checkout (seleção de método de pagamento)
- [x] Mobile (buyer): tela de comprovante com código do pedido
- [x] Mobile (buyer): histórico de pedidos
- [x] Mobile (seller): tela de pedidos do dia

### Sprint 5 — Pagamentos (Mercado Pago)
- [x] Backend: módulo payments com integração Mercado Pago
- [x] Backend: MercadoPagoService (Pix, Cartão, estorno, consulta)
- [x] Backend: WebhookController com validação x-signature + consulta status
- [x] Backend: lógica de decremento atômico de estoque na confirmação
- [x] Backend: lógica de estorno automático em caso de falha de estoque
- [x] Mobile (buyer): fluxo Pix (QR Code via react-native-qrcode-svg, copia-e-cola, timer 15min)
- [x] Mobile (buyer): fluxo cartão de crédito (token via SDK MP, aprovação imediata, mensagens de erro específicas)
- [ ] Testar fluxo completo em ambiente sandbox do Mercado Pago

### Sprint 6 — Tempo Real e Notificações
- [x] Backend: Socket.io gateway para evento de novo pedido
- [x] Backend: push notification via Expo/FCM no evento de pedido
- [x] Mobile (seller): useSocket hook conectado ao room do vendedor
- [x] Mobile (seller): atualização em tempo real da tela de pedidos
- [ ] Testar fluxo completo compra → notificação → comprovante

### Sprint 7 — Dashboard do Vendedor
- [x] Backend: endpoints de métricas (receita por dia/semana/mês, pedidos, produto mais vendido)
- [x] Mobile (seller): DashboardScreen com gráfico de receita e cards de métricas
- [x] Mobile (seller): histórico de transações com comissão detalhada

### Sprint 8 — Painel Admin
- [x] Admin: listagem e busca de compradores e vendedores
- [x] Admin: visualização e edição de qualquer usuário
- [x] Admin: exclusão de usuário
- [x] Admin: dashboard individual de cada vendedor
- [x] Admin: histórico de compras de cada comprador
- [x] Admin: visão geral de todas as transações com filtros
- [x] Admin: painel de repasses (saldo devedor por vendedor, registrar repasse, histórico)

### Sprint 9 — Polish, Testes e Beta
- [ ] Testes de integração nos fluxos críticos (compra, webhook, estoque)
- [ ] Tratamento de edge cases (timeout de pagamento, app fechado durante compra)
- [ ] UX review nas telas principais
- [x] Configurar RLS completo no Supabase MCP
- [ ] Deploy backend no Railway
- [ ] Deploy admin na Vercel
- [ ] Build do app via Expo EAS (TestFlight + APK interno)
- [ ] Beta fechado com 3–5 vendedores e grupo seleto de compradores no IME

---

## 10. Variáveis de Ambiente

### Backend (.env)
```
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
EXPO_ACCESS_TOKEN=
PORT=3000
```

### Mobile (.env)
```
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### Admin (.env)
```
NEXT_PUBLIC_API_URL=
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=
```

---

## 11. Decisões de Segurança

- Webhook Mercado Pago: validar header `x-signature` com HMAC-SHA256 antes de qualquer processamento; sempre consultar GET /v1/payments/:id para confirmar status real
- Cartão salvo: armazenar apenas token do Mercado Pago SDK, nunca dados de cartão
- Admin: rota separada do app mobile, autenticação independente, role ADMIN verificado em todo endpoint sensível
- RLS Supabase: toda tabela com RLS habilitado — vendedor só lê/edita seus próprios produtos e pedidos, comprador só lê seus próprios pedidos
- Tokens JWT: access token com expiração curta (15min), refresh token com expiração longa (7 dias) armazenado em storage seguro

---

## 12. Últimas Alterações

> **Regra:** esta seção mantém apenas as **2 últimas alterações**. Ao adicionar uma nova, remova a mais antiga.

### 2026-03-17 — FoodIME V3: Fullstack Next.js 15 Rebuild
**Problema:** CORS persistente entre NestJS backend e Next.js frontend no Railway (5+ tentativas de fix falharam).
**Solução:** Rebuild completo como app fullstack Next.js 15 em `foodime-v3/`. Elimina CORS (same-origin).
**Arquivos:** 118 arquivos criados em `foodime-v3/`:
- 6 config files (package.json, next.config.ts, tailwind, Dockerfile, etc.)
- 8 lib files (prisma, jwt, email, mercadopago, supabase, api-client, constants)
- 5 API middleware wrappers (auth, roles, validate, rate-limit, errors)
- 8 services (auth, stores, products, orders, payments, admin, coupons, uploads)
- 5 Zod schemas (auth, stores, products, orders, admin/payments)
- 44 API routes (10 auth + 8 stores/products + 1 upload + 7 orders + 3 payments + 13 admin + 1 coupons + 1 cron)
- 4 React Query hooks (useAuth, useStores/Products, useOrders, usePayment, useAdmin)
- 2 Zustand stores (authStore, cartStore)
- 1 middleware (JWT + role redirect)
- 25 pages (5 auth + 7 buyer + 5 seller + 6 admin + 1 offline + 1 root)
- 5 components (toast, bottom-nav, loading-skeleton, error-state, stock-badge)
**Build:** `npm run build` passa com sucesso — 54 rotas compiladas.

### [2026-03-17] Full integration testing — All 3 profiles functional
- **Problema:** (1) Cart `addItem` silently failed — `isAvailable` missing from Prisma `select`. (2) Checkout PIX timeout (Axios 10s). (3) Seller metrics 500 — `READY` enum missing from PostgreSQL. (4) Admin CORS blocked (port 3002 not in origin list). (5) All users had broken accounts (sellers PENDING, admins missing bcrypt hash). (6) Web middleware had no ADMIN role handling.
- **Solução:** (1) Added `isAvailable: true` to store product selects. (2) Axios timeout → 30s + checkout auto-detects existing payments. (3) `ALTER TYPE "OrderStatus" ADD VALUE 'READY'` + migration tracked. (4) Added `CORS_ORIGINS=...,localhost:3002` to backend .env + code default. (5) Script fixed all users: sellers ACTIVE+emailVerified, admins bcrypt password. (6) Web middleware now redirects ADMIN→`/admin/dashboard` + protects `/admin/*` routes.
- **Arquivos:** `stores.service.ts`, `api.ts`, `checkout/[orderId]/page.tsx`, `main.ts`, `web/src/middleware.ts`, migration `20260317_add_ready_status`, `.env`


---

## 13. Instruções de Uso no Claude Code

Ao iniciar qualquer sessão de desenvolvimento:

1. Leia este arquivo (`PROJECT_MASTER.md`) via Filesystem MCP
2. Identifique a qual sprint e tarefa a instrução pertence
3. Consulte a Skill relevante para a tarefa antes de escrever código
4. Use o Supabase MCP para qualquer operação de banco (migrations, RLS, queries)
5. Ao concluir uma tarefa, commite via GitHub MCP com conventional commit
6. Marque a tarefa como concluída (`[x]`) neste arquivo via Filesystem MCP
7. **Obrigatório:** ao finalizar qualquer alteração, atualize a **Seção 12 (Últimas Alterações)** com um resumo do que foi feito, mantendo apenas as 2 últimas entradas

**Exemplo de instrução:**
> "Implementar o módulo de autenticação do backend — Sprint 2, tarefa de registro e login"
> → Claude lê PROJECT_MASTER.md → consulta Architecture Skill → cria os arquivos via Filesystem MCP → aplica migration via Supabase MCP → commita via GitHub MCP
