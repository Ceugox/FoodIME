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
- **Plataforma:** Efí Bank (migrado do Mercado Pago em 2026-03-31)
- **Modelo:** Pagamento direto (sem split) — todo dinheiro cai na conta da empresa, admin repassa vendedores manualmente
- **Métodos:** Pix (QR Code dinâmico direto no app, sem redirect) e Cartão de Crédito (formulário nativo)
- **Comissão:** calculada por `store.commissionRate` e registrada no Payment para controle do admin
- **Nota mTLS:** PIX API em produção requer certificados. Configurar `EFI_CERT_BASE64` + `EFI_KEY_BASE64` e ajustar agent no `efibank.ts`

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

### FoodIME V3 (.env local)
```
DATABASE_URL=          # Supabase pooler (port 6543, ?pgbouncer=true)
DIRECT_URL=            # Supabase direct (port 5432) — migrations only
JWT_SECRET=
JWT_REFRESH_SECRET=
EFI_CLIENT_ID=
EFI_CLIENT_SECRET=
EFI_PIX_KEY=           # Chave Pix cadastrada na conta Efí
EFI_SANDBOX=true       # false em produção
EFI_CERT_BASE64=       # mTLS cert (produção PIX obrigatório)
EFI_KEY_BASE64=        # mTLS key (produção PIX obrigatório)
NEXT_PUBLIC_EFI_PAYEE_CODE=    # ex: "896145-1"
NEXT_PUBLIC_EFI_ACCOUNT_ID=    # Identificador de Conta (painel Efí → API → Introdução)
NEXT_PUBLIC_EFI_SANDBOX=true   # false em produção
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
GMAIL_USER=
GMAIL_APP_PASSWORD=
EMAIL_FROM=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

### Railway — Variáveis de Ambiente de Produção
Configurar em Railway → Service → Variables:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Supabase pooler (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase direct (port 5432) — usado por migrate deploy |
| `JWT_SECRET` | Segredo JWT (min 32 chars) |
| `JWT_REFRESH_SECRET` | Segredo refresh token (min 32 chars) |
| `EFI_CLIENT_ID` | Client ID Efí Bank produção |
| `EFI_CLIENT_SECRET` | Client Secret Efí Bank produção |
| `EFI_PIX_KEY` | Chave Pix (CPF/CNPJ/email/aleatória) |
| `EFI_SANDBOX` | `false` |
| `EFI_CERT_BASE64` | Certificado mTLS em base64 (produção PIX) |
| `EFI_KEY_BASE64` | Chave privada mTLS em base64 (produção PIX) |
| `NEXT_PUBLIC_EFI_PAYEE_CODE` | Código do beneficiário (ex: `896145-1`) |
| `NEXT_PUBLIC_EFI_ACCOUNT_ID` | Identificador de Conta Efí |
| `NEXT_PUBLIC_EFI_SANDBOX` | `false` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key pública |
| `SUPABASE_SERVICE_KEY` | Service role key (nunca expor ao cliente) |
| `NEXT_PUBLIC_APP_URL` | URL do Railway (ex: `https://foodime.up.railway.app`) |
| `CRON_SECRET` | Token para autenticar cron jobs |
| `GMAIL_USER` | Email para envio de notificações |
| `GMAIL_APP_PASSWORD` | App Password do Gmail |
| `EMAIL_FROM` | Remetente de emails |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | OAuth Google (opcional) |

### GitHub Secrets (para CI/CD)
Configurar em GitHub → Settings → Secrets → Actions:

| Secret | Descrição |
|---|---|
| `RAILWAY_TOKEN` | Token Railway para deploy via CLI |
| `DATABASE_URL` | Igual ao Railway (para `prisma migrate deploy`) |
| `DIRECT_URL` | Supabase direct (port 5432) — migrations |
| `JWT_SECRET` | Igual ao Railway |
| `JWT_REFRESH_SECRET` | Igual ao Railway |
| `EFI_CLIENT_ID` | Igual ao Railway |
| `EFI_CLIENT_SECRET` | Igual ao Railway |
| `EFI_PIX_KEY` | Igual ao Railway |
| `EFI_CERT_BASE64` | Igual ao Railway |
| `EFI_KEY_BASE64` | Igual ao Railway |
| `NEXT_PUBLIC_EFI_PAYEE_CODE` | Igual ao Railway |
| `NEXT_PUBLIC_EFI_ACCOUNT_ID` | Igual ao Railway |
| `NEXT_PUBLIC_EFI_SANDBOX` | `false` |
| `SUPABASE_SERVICE_KEY` | Igual ao Railway |
| `NEXT_PUBLIC_SUPABASE_URL` | Igual ao Railway |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Igual ao Railway |
| `CRON_SECRET` | Igual ao Railway |

**Legado:** os `.env` de `backend/`, `web/`, `admin/` e `mobile/` ficam apenas para referência histórica.

---

## 11. Decisões de Segurança

- Webhook Efí Bank: validar txid no DB antes de processar (sandwich de segurança); em produção usar mTLS para autenticar chamadas do gateway
- Cartão salvo: armazenar apenas payment_token gerado pelo efipay-js SDK, nunca dados de cartão brutos
- Admin: rotas `/admin/*` vivem no mesmo app da V3, protegidas por middleware e checagem de role ADMIN
- RLS Supabase: toda tabela com RLS habilitado — vendedor só lê/edita seus próprios produtos e pedidos, comprador só lê seus próprios pedidos
- Tokens JWT: access token com expiração curta (15min), refresh token com expiração longa (7 dias) armazenados em cookies HTTP-only + tabela `RefreshToken`

---

## 12. Últimas Alterações

> **Regra:** esta seção mantém apenas as **2 últimas alterações**. Ao adicionar uma nova, remova a mais antiga.

### 2026-04-08 — CI/CD + Produção Railway
**Problema:** CI quebrado com vars MercadoPago. `railway up --service backend` (nome errado). Sem `prisma migrate deploy` no pipeline. Health check sem ping real ao banco. Vars de ambiente não documentadas para Railway/GitHub Secrets.
**Solução:** (1) `foodime-v3.yml`: removidas vars MP, adicionadas vars Efí dummy no build, step `prisma migrate deploy` no job deploy, service name corrigido para `laudable-dedication`. (2) `deploy.yml`: mesmo fix de nome + step de migrate. (3) `Dockerfile`: copia `node_modules/prisma` + `start.sh`; CMD usa `sh start.sh`. (4) `start.sh`: roda `prisma migrate deploy` antes de `node server.js`. (5) `health/route.ts`: `SELECT 1` no banco, retorna 503 se DB inacessível. (6) `PROJECT_MASTER.md` seção 10: tabelas de Railway vars + GitHub Secrets.
**Arquivos:** `.github/workflows/foodime-v3.yml`, `.github/workflows/deploy.yml`, `foodime-v3/Dockerfile`, `foodime-v3/start.sh`, `foodime-v3/src/app/api/health/route.ts`, `docs/PROJECT_MASTER.md`

### 2026-04-08 — Playwright E2E 25/25 passando
**Problema:** 7 testes falhando: (1) strict mode em `reset-password` e `verify-email` (`getByText` ambíguo). (2) Login com credenciais erradas: API client fazia redirect para `/login` ao receber 401 (tentativa de refresh não mockada → `window.location.href = '/login'`). (3) Rota `/api/orders/buyer` sobrescrita pelo wildcard `/api/orders/**` por LIFO no Playwright. (4) Profile não mostrava nome do usuário: `useAuthStore` lê do Zustand localStorage, não da API — cookie injection não bastava.
**Solução:** (1) Seletores → `getByRole('heading', ...)`. (2) Adicionado mock de `/api/auth/refresh` retornando 200 para que o retry do login rode corretamente e lance `ApiError` (em vez de redirecionar). (3) Invertida ordem de registro das rotas de orders (wildcard primeiro, específico depois). (4) `page.addInitScript()` para semear `auth-storage` no localStorage antes da navegação.
**Arquivos:** `foodime-v3/e2e/fixtures.ts`, `foodime-v3/e2e/auth-flow.spec.ts`


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
