# PROJECT MASTER — FoodIME
> Documento de referência completo para uso no Claude Code com MCPs e Skills.
> Leia este arquivo antes de qualquer tarefa de desenvolvimento.

---

## 1. Visão Geral do Produto

Marketplace de comida para faculdades, começando pelo IME (Instituto Militar de Engenharia), agora consolidado na **FoodIME V3**: um app fullstack em Next.js 15 que reúne comprador, vendedor, admin e API no mesmo deploy. O app mobile Expo permanece no repositório apenas como legado congelado.

**Três perfis de usuário:**
- **Comprador** — descobre vendedores, faz pedidos e paga pelo app
- **Vendedor** — gerencia loja, produtos, estoque e recebe pedidos em tempo real
- **Admin** — painel web com acesso total ao sistema

---

## 2. Regras de Negócio Críticas

- Cada pedido pertence a **um único vendedor** (sem carrinho multi-vendedor)
- Pagamento ocorre **antes da retirada** — comprador paga no app e mostra comprovante
- **Não há split automático**: todo pagamento cai na conta da empresa e o repasse ao vendedor é registrado manualmente pelo admin
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

### Plataforma Principal
- **App:** `foodime-v3/`
- **Framework:** Next.js 15 (App Router + Route Handlers)
- **Linguagem:** TypeScript
- **UI:** React 19 + Tailwind CSS + PWA (`next-pwa`)
- **Estado global:** Zustand
- **Cache/fetching:** TanStack Query
- **ORM:** Prisma
- **Banco:** PostgreSQL via Supabase
- **Autenticação:** JWT + Refresh Token em cookies HTTP-only
- **Uploads:** Supabase Storage
- **Emails:** Nodemailer

### Aplicações Legadas
- `backend/` — API NestJS antiga, mantida apenas como referência
- `web/` — frontend Next.js antigo, substituído pela V3
- `admin/` — painel admin separado antigo, substituído pela V3
- `mobile/` — app Expo congelado; não modificar

### Infraestrutura
- **Deploy principal:** Railway (Docker) via `foodime-v3/Dockerfile`
- **Banco + Storage:** Supabase
- **CI/CD:** GitHub Actions → Railway
- **App mobile legado:** Expo EAS Build

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

### Aplicação Principal (FoodIME V3)
```
foodime-v3/
├── src/
│   ├── app/
│   │   ├── (auth)/                ← login, registro, recuperação, verificação
│   │   ├── (buyer)/               ← home, loja, carrinho, checkout, pedidos
│   │   ├── (seller)/              ← dashboard, pedidos, produtos, loja
│   │   ├── (admin)/               ← dashboard, usuários, transações, repasses
│   │   └── api/                   ← auth, stores, products, orders, payments, admin
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── schemas/
│   ├── services/
│   ├── store/
│   └── types/
├── prisma/
├── public/
└── Dockerfile
```

### Legado
- `backend/`, `web/` e `admin/` existem apenas como referência histórica da arquitetura separada
- `mobile/` permanece congelado e fora do escopo atual

---

## 7. Schema do Banco (Prisma)

**Fonte canônica:** `foodime-v3/prisma/schema.prisma`

Principais entidades da V3:
- `User` — comprador, vendedor ou admin; inclui `status`, verificação de email, OAuth Google e soft delete
- `RefreshToken` — persistência de refresh tokens no banco
- `Store` — dados da loja, horários, taxa de comissão e relação com repasses
- `Product` — estoque, disponibilidade e soft delete
- `Order` / `OrderItem` — pedido, comprovante, snapshot de preço e status (`PENDING`, `PAID`, `READY`, `PICKED_UP`, `CANCELLED`)
- `Payment` — método, gatewayTxId, comissão, líquido e motivo de estorno
- `Coupon` — cupons fixos ou percentuais
- `Payout` — repasses manuais registrados pelo admin
- `AuditLog` — trilha de ações administrativas

---

## 8. Fluxo Completo de Compra

```
1. Comprador confirma pedido no app web/PWA
2. Front → POST /api/orders → route handler cria Order (status: PENDING)
3. Route handler → service Prisma cria pedido e prepara checkout
4. Front → POST /api/payments/initiate → integra com Mercado Pago
   └── Todo valor vai para a conta MP da empresa

FLUXO PIX:
4a. Mercado Pago retorna QR Code Pix (copia-e-cola + base64)
5a. Comprador efetua pagamento no app do banco
6a. Mercado Pago → webhook POST /api/payments/webhook
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
9. Comprador vê tela de comprovante com código único
10. Vendedor acompanha pedidos pela interface web da V3
11. Admin vê comissão e valor líquido → registra repasse manual
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
- [x] Consolidar buyer, seller, admin e API em `foodime-v3`
- [x] Definir `foodime-v3` como stack oficial de entrega
- [x] Alinhar Railway raiz com `foodime-v3`
- [x] Criar workflow de CI/CD para `foodime-v3`
- [x] Revisar variáveis de ambiente de produção da V3
- [x] Preparar checklist de smoke test/go-live
- [ ] Testes de integração nos fluxos críticos (auth, pedido, pagamento, webhook)
- [ ] Homologação completa do Mercado Pago sandbox (Pix + cartão)
- [ ] Revisão de edge cases (timeout, email, cron, upload)
- [ ] Deploy da `foodime-v3` no Railway
- [ ] Beta fechado com 3–5 vendedores e compradores no IME

---

## 10. Variáveis de Ambiente

### FoodIME V3 (.env)
```
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
MERCADOPAGO_TEST_PAYER_EMAIL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
GMAIL_USER=
GMAIL_APP_PASSWORD=
EMAIL_FROM=
GOOGLE_CLIENT_ID=
```

**Legado:** os `.env` de `backend/`, `web/`, `admin/` e `mobile/` ficam apenas para referência histórica.

---

## 11. Decisões de Segurança

- Webhook Mercado Pago: validar header `x-signature` com HMAC-SHA256 antes de qualquer processamento; sempre consultar GET /v1/payments/:id para confirmar status real
- Cartão salvo: armazenar apenas token do Mercado Pago SDK, nunca dados de cartão
- Admin: rotas `/admin/*` vivem no mesmo app da V3, protegidas por middleware e checagem de role ADMIN
- RLS Supabase: toda tabela com RLS habilitado — vendedor só lê/edita seus próprios produtos e pedidos, comprador só lê seus próprios pedidos
- Tokens JWT: access token com expiração curta (15min), refresh token com expiração longa (7 dias) armazenados em cookies HTTP-only + tabela `RefreshToken`

---

## 12. Últimas Alterações

> **Regra:** esta seção mantém apenas as **2 últimas alterações**. Ao adicionar uma nova, remova a mais antiga.

### 2026-03-29 — Cartão migrado para Checkout Pro com retorno sincronizado
**Problema:** O fluxo de cartão via Checkout API seguia instável no sandbox, com erros recorrentes de `Invalid users involved`, bloqueando a homologação e atrasando a entrega.
**Solução:** O checkout com cartão da V3 foi migrado para Checkout Pro do Mercado Pago. O frontend agora redireciona o comprador para o checkout hospedado, o backend cria preferências com `external_reference`, e o retorno do Mercado Pago sincroniza o status do pagamento no pedido mesmo em ambiente local.
**Arquivos:** `foodime-v3/src/app/(buyer)/checkout/[orderId]/page.tsx`, `foodime-v3/src/app/api/payments/sync/route.ts`, `foodime-v3/src/app/api/payments/webhook/route.ts`, `foodime-v3/src/hooks/useOrders.ts`, `foodime-v3/src/hooks/usePayment.ts`, `foodime-v3/src/lib/mercadopago.ts`, `foodime-v3/src/schemas/payments.ts`, `foodime-v3/src/services/payments.service.ts`, `docs/PROJECT_MASTER.md`

### 2026-03-29 — Credenciais locais apontadas para a aplicação de Checkout Pro
**Problema:** Após migrar o fluxo de cartão para Checkout Pro, a V3 ainda estava com as credenciais antigas do Mercado Pago na `.env`, o que impediria validar o redirecionamento com a aplicação nova.
**Solução:** A `.env` local foi atualizada para usar a public key e o access token da aplicação configurada para Checkout Pro, alinhando o ambiente de homologação ao fluxo novo.
**Arquivos:** `foodime-v3/.env`, `docs/PROJECT_MASTER.md`


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
