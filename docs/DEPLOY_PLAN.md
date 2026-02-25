# Planejamento Pré-Deploy — FoodIME

> Documento criado em 24/02/2026 após auditoria completa do monorepo.
> Organizado por prioridade: o que **bloqueia** o deploy vem primeiro.

---

## Sumário

1. [Correções Críticas de Segurança](#1-correções-críticas-de-segurança)
2. [Hardening do Backend para Produção](#2-hardening-do-backend-para-produção)
3. [Banco de Dados — Índices e Performance](#3-banco-de-dados--índices-e-performance)
4. [Features Faltantes para o MVP](#4-features-faltantes-para-o-mvp)
5. [Melhorias de UX que Impactam Retenção](#5-melhorias-de-ux-que-impactam-retenção)
6. [Docker — Containerização](#6-docker--containerização)
7. [CI/CD — Pipeline Completo](#7-cicd--pipeline-completo)
8. [Deploy — Infraestrutura](#8-deploy--infraestrutura)
9. [Monitoramento e Observabilidade](#9-monitoramento-e-observabilidade)
10. [Pós-Deploy — Roadmap v1.1](#10-pós-deploy--roadmap-v11)
11. [Checklist Final de Launch](#11-checklist-final-de-launch)

---

## 1. Correções Críticas de Segurança

> **Bloqueia deploy.** Nenhuma dessas pode ir pro ar sem correção.

### 1.1 CORS aberto para qualquer origem
**Arquivo:** `backend/src/main.ts`
**Problema:** `origin: '*'` permite que qualquer site faça requests à API.
**Correção:**
```typescript
app.enableCors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
  credentials: true,
  maxAge: 3600,
});
```
Adicionar `CORS_ORIGINS` no `.env`:
```
CORS_ORIGINS=https://app.foodime.com,https://admin.foodime.com
```

### 1.2 Secrets JWT com fallback hardcoded
**Arquivos:** `backend/src/modules/auth/strategies/jwt.strategy.ts`, `jwt-refresh.strategy.ts`
**Problema:** Se `JWT_SECRET` não estiver no `.env`, o sistema aceita `'fallback-secret'`. Qualquer pessoa pode forjar tokens.
**Correção:** Remover os fallbacks e adicionar validação no startup via `ConfigModule` + Joi.

### 1.3 Sem rate limiting
**Problema:** Login pode ser brute-forced infinitamente. Webhook pode ser spamado.
**Correção:** Instalar `@nestjs/throttler` e aplicar:
- Auth (login/register): 5 requests/minuto por IP
- Webhook: 30 requests/minuto por IP
- API geral: 60 requests/minuto por IP

### 1.4 Endpoint de pagamento sem autenticação
**Arquivo:** `backend/src/modules/payments/payments.controller.ts`
**Problema:** `GET /payments/order/:orderId` não tem `@UseGuards` — qualquer um consulta qualquer pagamento.
**Correção:** Adicionar `JwtAuthGuard` + verificar que o user é o buyer ou seller do pedido.

### 1.5 WebSocket sem autenticação
**Arquivo:** `backend/src/modules/notifications/notifications.gateway.ts`
**Problema:** Qualquer pessoa pode se conectar ao Socket.io e entrar no room de qualquer vendedor.
**Correção:** Validar JWT no `handleConnection` do gateway e verificar ownership no `join-seller-room`.

### 1.6 Helmet ausente
**Problema:** Sem headers de segurança HTTP (X-Frame-Options, X-Content-Type-Options, HSTS).
**Correção:**
```bash
cd backend && npm install helmet
```
```typescript
// main.ts
import helmet from 'helmet';
app.use(helmet());
```

### 1.7 Validação de ambiente no startup
**Problema:** Se `DATABASE_URL` ou `JWT_SECRET` estiver faltando, o app inicia e falha em runtime.
**Correção:** Adicionar schema Joi no `ConfigModule`:
```typescript
ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: Joi.object({
    DATABASE_URL: Joi.string().required(),
    JWT_SECRET: Joi.string().required().min(32),
    JWT_REFRESH_SECRET: Joi.string().required().min(32),
    MERCADOPAGO_ACCESS_TOKEN: Joi.string().required(),
    MERCADOPAGO_WEBHOOK_SECRET: Joi.string().required(),
    CORS_ORIGINS: Joi.string().required(),
    NODE_ENV: Joi.string().valid('development', 'staging', 'production').default('development'),
  }),
});
```

---

## 2. Hardening do Backend para Produção

> **Bloqueia deploy.** Problemas que causam bugs sérios em produção.

### 2.1 Webhook sem proteção contra replay
**Problema:** Mesmo webhook pode ser processado 2x (pagamento duplicado, estoque decrementado 2x).
**Correção:**
- Validar timestamp `ts` do header (rejeitar se >5min de diferença)
- Armazenar `request-id` processados (cache em memória ou Redis) para deduplicação
- Alternativa sem Redis: adicionar coluna `webhookRequestId` na tabela Payment e usar unique constraint

### 2.2 Sem logout / revogação de tokens
**Problema:** Tokens roubados ficam válidos até expirar (15min access, 7d refresh).
**Correção mínima:** Endpoint `POST /auth/logout` que invalida o refresh token:
- Armazenar refresh tokens no banco (tabela `RefreshToken` com `userId`, `token`, `expiresAt`)
- No logout, deletar o refresh token
- Na renovação, verificar se o refresh token existe no banco

### 2.3 Sem tratamento de timeout de pagamento Pix
**Problema:** Se o buyer não pagar o Pix em 15min, o pedido fica PENDING para sempre (agora é deletado pelo cleanup, mas o Payment fica com status PROCESSING).
**Correção:** O cleanup de pedidos expirados já deleta (implementado hoje). Verificar que os Payments associados também são deletados (já feito na transaction).

### 2.4 Logging estruturado para produção
**Problema:** Só tem `console.log` e `console.warn`. Em produção, precisa de logs estruturados.
**Correção:** Instalar `winston` ou usar o Logger nativo do NestJS configurado para JSON em produção:
```typescript
// main.ts
if (process.env.NODE_ENV === 'production') {
  app.useLogger(['error', 'warn', 'log']);
}
```

---

## 3. Banco de Dados — Índices e Performance

> **Bloqueia deploy.** Sem índices, queries ficam lentas com poucos mil registros.

### 3.1 Índices obrigatórios
Criar uma migration Prisma com:
```prisma
model Order {
  @@index([buyerId])
  @@index([storeId])
  @@index([status])
  @@index([createdAt])
}

model Payment {
  @@index([gatewayTxId])
  @@index([status])
}

model Product {
  @@index([storeId])
  @@index([isAvailable])
}

model OrderItem {
  @@index([orderId])
  @@index([productId])
}
```

### 3.2 RLS (Row Level Security) no Supabase
Todas as tabelas precisam de RLS habilitado antes de produção. O anon key do Supabase no mobile dá acesso direto ao banco — sem RLS, qualquer pessoa lê tudo.

Políticas necessárias:
- **User**: leitura do próprio perfil
- **Store**: leitura pública (lojas abertas), escrita só pelo owner
- **Product**: leitura pública, escrita só pelo owner da store
- **Order**: leitura pelo buyer ou seller envolvido
- **Payment**: leitura pelo buyer ou seller envolvido

---

## 4. Features Faltantes para o MVP

> **Importante para o lançamento.** Sem isso, o produto funciona mas frustra o usuário.

### 4.1 Busca de lojas/produtos (Buyer)
**Estado atual:** Home mostra lista fixa de lojas abertas. Não tem busca.
**Impacto:** Com 10+ vendedores, comprador não encontra o que quer.
**Implementar:**
- Campo de busca na Home que filtra por nome de loja e nome de produto
- Backend: `GET /stores?search=termo` já existiria com um simples `where: { name: { contains: search, mode: 'insensitive' } }`

### 4.2 Notificação de pedido pronto para retirada (Buyer)
**Estado atual:** Vendedor marca "retirado" mas comprador não recebe notificação.
**Impacto:** Comprador não sabe quando ir buscar.
**Implementar:**
- Push notification quando status muda para PICKED_UP (ou criar status intermediário READY)
- Exibir notificação in-app na tela de pedidos

### 4.3 Tela "Meus Pedidos" mais informativa (Buyer)
**Estado atual:** Lista básica de pedidos com código e status.
**Implementar:**
- Botão para ver detalhes (itens do pedido, loja, valor)
- Status com timeline visual (Pedido → Pago → Pronto → Retirado)
- Comprovante compartilhável (screenshot ou PDF simples)

### 4.4 Horário de funcionamento da loja
**Estado atual:** Vendedor só tem toggle "Aberto/Fechado" manual.
**Impacto:** Comprador vê loja fechada fora do horário e não sabe quando volta.
**Implementar:**
- Campos `openTime` e `closeTime` na Store
- Exibir "Abre às XX:XX" quando fechada
- Auto-toggle baseado no horário (opcional, pode ser manual primeiro)

### 4.5 Imagens de produtos e loja
**Estado atual:** Campos `imageUrl` existem no schema mas upload não está implementado.
**Impacto:** Marketplace de comida SEM fotos é inviável. Fotos vendem.
**Implementar:**
- Upload via Supabase Storage (bucket público para imagens)
- Compressão client-side antes do upload (max 500KB)
- Fallback/placeholder para produtos sem foto

### 4.6 Página de pedidos e payouts no Admin
**Estado atual:** Sprint 8 incompleta — falta painel de splits/payouts.
**Impacto:** Admin não consegue controlar quanto deve a cada vendedor.
**Implementar:**
- Tela `/admin/payouts` com saldo devedor por vendedor
- Botão "Marcar como pago" que registra o repasse
- Histórico de repasses realizados
- Modelo: nova tabela `Payout { id, storeId, amount, paidAt, note }`

---

## 5. Melhorias de UX que Impactam Retenção

> **Não bloqueia deploy, mas afeta a experiência.** Implementar antes do beta ou logo depois.

### 5.1 Feedback de ações
- Toast/snackbar após ações importantes (pedido criado, pagamento confirmado, produto atualizado)
- Atualmente muitas ações não dão feedback visual

### 5.2 Pull-to-refresh
- Home, pedidos, dashboard — pull-to-refresh para atualizar dados
- React Query já suporta isso nativamente

### 5.3 Empty states informativos
- "Nenhuma loja aberta agora" com horários sugeridos
- "Você ainda não fez pedidos" com CTA para explorar lojas
- "Nenhum produto cadastrado" com CTA para criar

### 5.4 Confirmação antes de ações destrutivas
- Deletar produto, cancelar pedido, sair da conta
- Modal de confirmação com texto claro

### 5.5 Tratamento de erro offline
- Detectar perda de conexão e mostrar banner
- Retry automático quando conexão voltar
- PWA web já tem página offline básica, mobile precisa

### 5.6 Categoria de produtos
- Agrupar por categoria (Doces, Salgados, Bebidas, Marmitas)
- Facilita navegação com mais de 10 produtos por loja

---

## 6. Docker — Containerização

> **Necessário para deploy consistente e CI/CD.**

### 6.1 Dockerfile do Backend
```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

### 6.2 Docker Compose para desenvolvimento local
```yaml
# docker-compose.yml (raiz)
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    env_file: ./backend/.env
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: foodime
      POSTGRES_PASSWORD: foodime_dev
      POSTGRES_DB: foodime
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 6.3 .dockerignore
```
node_modules
.next
dist
.env
*.md
```

---

## 7. CI/CD — Pipeline Completo

> **Já existem workflows básicos em `.github/workflows/`.** Precisam de melhorias.

### 7.1 Estado atual dos workflows
- `backend.yml` — lint e build do backend
- `admin.yml` — build do admin
- `mobile.yml` — build check do mobile

### 7.2 Pipeline ideal

```
Push to main
  ├── Backend Pipeline
  │   ├── Lint (ESLint)
  │   ├── Type check (tsc --noEmit)
  │   ├── Unit tests (jest)
  │   ├── Build (npm run build)
  │   ├── Build Docker image
  │   ├── Push image to registry (GitHub Container Registry)
  │   └── Deploy to Railway (via railway CLI ou webhook)
  │
  ├── Admin Pipeline
  │   ├── Lint
  │   ├── Type check
  │   ├── Build (next build)
  │   └── Deploy to Vercel (automático via Vercel GitHub integration)
  │
  ├── Web Pipeline
  │   ├── Lint
  │   ├── Type check
  │   ├── Build (next build)
  │   └── Deploy to Vercel
  │
  └── Mobile Pipeline (manual trigger ou tag)
      ├── Lint
      ├── Type check
      └── EAS Build (eas build --platform all --profile production)
```

### 7.3 O que adicionar nos workflows

**backend.yml** — adicionar:
```yaml
- name: Run Prisma migrate (dry-run)
  run: npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma

- name: Build Docker image
  run: docker build -t ghcr.io/${{ github.repository }}/backend:${{ github.sha }} ./backend

- name: Push to GHCR
  run: docker push ghcr.io/${{ github.repository }}/backend:${{ github.sha }}

- name: Deploy to Railway
  run: railway up --service backend
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

**Adicionar:** workflow `deploy.yml` para deploy manual com environment approval.

### 7.4 Secrets necessários no GitHub
```
RAILWAY_TOKEN
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID_ADMIN
VERCEL_PROJECT_ID_WEB
EXPO_TOKEN
```

---

## 8. Deploy — Infraestrutura

### 8.1 Backend → Railway
- **Por quê:** Suporta Docker, PostgreSQL, variáveis de ambiente, domínio custom, SSL automático.
- **Configuração:**
  1. Criar projeto no Railway
  2. Conectar repositório GitHub
  3. Configurar Dockerfile path: `./backend/Dockerfile`
  4. Adicionar todas as variáveis de ambiente
  5. Configurar domínio: `api.foodime.com`
  6. Health check: `GET /` retornando 200
- **Custo estimado:** ~$5-10/mês (Hobby plan)

### 8.2 Web (PWA) → Vercel
- **Configuração:**
  1. Importar repo, root directory: `web/`
  2. Framework: Next.js (auto-detectado)
  3. Variáveis de ambiente: `NEXT_PUBLIC_API_URL=https://api.foodime.com`
  4. Domínio: `app.foodime.com`
- **Custo:** Free tier (suficiente para MVP)

### 8.3 Admin → Vercel
- **Configuração:**
  1. Importar repo, root directory: `admin/`
  2. Variáveis: `NEXT_PUBLIC_API_URL=https://api.foodime.com`
  3. Domínio: `admin.foodime.com`
  4. **Proteger com Vercel Authentication** (ou IP whitelist)
- **Custo:** Free tier

### 8.4 Banco de Dados → Supabase
- **Já configurado.** Verificar:
  - [ ] Connection pooling habilitado (PgBouncer)
  - [ ] Backups automáticos ativos
  - [ ] RLS em todas as tabelas
  - [ ] Monitorar uso no dashboard (Free tier: 500MB, 2 projetos)

### 8.5 Mobile → Expo EAS
- **Build de produção:**
  ```bash
  eas build --platform android --profile production
  eas build --platform ios --profile production
  ```
- **Distribuição:**
  - Android: Google Play Console (conta $25 uma vez)
  - iOS: Apple Developer ($99/ano)
  - Alternativa beta: distribuição interna via EAS + link direto

### 8.6 Domínio e DNS
- Registrar `foodime.com` (ou similar)
- Subdomínios:
  - `api.foodime.com` → Railway
  - `app.foodime.com` → Vercel (web PWA)
  - `admin.foodime.com` → Vercel (admin)

---

## 9. Monitoramento e Observabilidade

> **Configurar antes do beta.** Sem isso, você não sabe quando algo quebra.

### 9.1 Error tracking — Sentry
- Instalar `@sentry/nestjs` no backend
- Instalar `@sentry/nextjs` no web e admin
- Instalar `@sentry/react-native` no mobile
- Free tier: 5K errors/mês (suficiente para MVP)

### 9.2 Uptime monitoring
- UptimeRobot (free) ou Better Uptime
- Monitorar: `api.foodime.com/health`, `app.foodime.com`, `admin.foodime.com`
- Alertar via email/Telegram quando cair

### 9.3 Health check endpoint
Criar no backend:
```typescript
@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

### 9.4 Logs em produção
- Railway já agrega logs do stdout
- Adicionar logging estruturado (JSON) para facilitar busca
- Logar: requests HTTP (method, path, status, duration), erros com stack trace, webhooks recebidos

### 9.5 Métricas de negócio (dashboard interno)
O admin dashboard já mostra métricas básicas. Considerar adicionar:
- Gráfico de crescimento de usuários por semana
- Taxa de conversão (pedidos criados vs pagos)
- Tempo médio de retirada

---

## 10. Pós-Deploy — Roadmap v1.1

> Features para implementar **depois** do lançamento, baseado em feedback do beta.

### 10.1 Avaliações e comentários
- Buyer avalia loja/pedido após retirada (1-5 estrelas + texto)
- Exibir rating médio na listagem de lojas
- Tabela: `Review { id, orderId, buyerId, storeId, rating, comment, createdAt }`

### 10.2 Favoritos
- Buyer marca lojas como favoritas
- Aba "Favoritos" na home
- Tabela: `Favorite { userId, storeId, createdAt }` com unique constraint

### 10.3 Cupons e promoções
- Vendedor cria cupom de desconto (% ou valor fixo)
- Buyer aplica no checkout
- Tabela: `Coupon { id, storeId, code, discountType, value, maxUses, usedCount, expiresAt }`

### 10.4 Notificações por email
- Confirmação de pedido
- Recibo de pagamento
- Lembrete de retirada
- Usar Resend ou SendGrid (free tier)

### 10.5 Chat buyer-seller
- Mensagens em tempo real via Socket.io
- Para resolver dúvidas sobre pedido
- Tabela: `Message { id, orderId, senderId, text, createdAt }`

### 10.6 Relatórios exportáveis (Admin)
- Export CSV de transações, usuários, pedidos
- Relatório mensal por vendedor (PDF)

### 10.7 Multi-campus
- Expandir para outras faculdades
- Campo `campusId` na Store para filtrar por localização
- Buyer seleciona campus na home

---

## 11. Checklist Final de Launch

### Segurança (Obrigatório)
- [ ] CORS restrito a domínios conhecidos
- [ ] Fallback JWT secrets removidos
- [ ] Rate limiting (ThrottlerModule) instalado
- [ ] Helmet instalado
- [ ] Endpoint GET /payments/order/:id protegido
- [ ] WebSocket autenticado
- [ ] Validação de env vars no startup (Joi)
- [ ] Webhook com validação de timestamp e deduplicação
- [ ] Senha mínima aumentada para 8+ caracteres
- [ ] RLS habilitado em todas as tabelas Supabase

### Banco de Dados (Obrigatório)
- [ ] Migration com índices aplicada
- [ ] Backups automáticos confirmados no Supabase
- [ ] Connection pooling testado

### Infraestrutura (Obrigatório)
- [ ] Dockerfile do backend testado localmente
- [ ] Backend deployado no Railway
- [ ] Web deployado na Vercel
- [ ] Admin deployado na Vercel
- [ ] Domínio configurado com SSL
- [ ] Variáveis de ambiente de produção configuradas
- [ ] Health check respondendo
- [ ] Webhook URL do Mercado Pago atualizada para produção

### CI/CD (Obrigatório)
- [ ] GitHub Actions buildando e deployando automaticamente
- [ ] Secrets configurados no GitHub

### Monitoramento (Recomendado para launch)
- [ ] Sentry configurado (backend + web)
- [ ] Uptime monitoring ativo
- [ ] Alertas de erro configurados

### Features MVP (Recomendado para launch)
- [ ] Upload de imagem de produto (Supabase Storage)
- [ ] Busca de lojas na home
- [ ] Notificação push de pedido pronto
- [ ] Painel de payouts no admin

### App Stores (Se lançar mobile nativo)
- [ ] Conta Google Play Console criada
- [ ] Conta Apple Developer criada
- [ ] Privacy Policy publicada
- [ ] Terms of Service publicados
- [ ] Screenshots e descrição da loja
- [ ] EAS Build de produção gerado

### Testes Finais
- [ ] Fluxo completo buyer: registro → login → loja → carrinho → Pix → comprovante
- [ ] Fluxo completo buyer: mesmo com cartão de crédito
- [ ] Fluxo seller: login → abrir loja → receber pedido → marcar retirado
- [ ] Fluxo admin: dashboard → usuários → transações → detalhe seller/buyer
- [ ] Testar em mobile real (não apenas emulador)
- [ ] Testar PWA instalada (Android + iOS Safari)
- [ ] Testar webhook com pagamento real (sair do sandbox)
- [ ] Testar perda de conexão durante checkout
- [ ] Load test básico (100 requests simultâneos nas rotas críticas)

---

## Estimativa de Esforço

| Fase | Itens | Estimativa |
|------|-------|-----------|
| Segurança (Seção 1) | 7 itens | Prioridade máxima |
| Hardening (Seção 2) | 4 itens | Prioridade máxima |
| Índices DB (Seção 3) | 2 itens | Rápido |
| Features MVP (Seção 4) | 6 itens | Antes do beta |
| UX (Seção 5) | 6 itens | Paralelo ao beta |
| Docker (Seção 6) | 3 arquivos | Antes do deploy |
| CI/CD (Seção 7) | Ajustar workflows | Antes do deploy |
| Deploy (Seção 8) | 6 serviços | Dia do launch |
| Monitoring (Seção 9) | 5 itens | Antes do beta |
| Pós-deploy (Seção 10) | 7 features | Após feedback |

---

## Ordem de Execução Recomendada

```
SPRINT A — Segurança e Infra (bloqueia tudo)
├── 1. Correções de segurança (Seção 1 completa)
├── 2. Hardening do backend (Seção 2)
├── 3. Índices no banco (Seção 3)
└── 4. Dockerfile + docker-compose (Seção 6)

SPRINT B — Features MVP
├── 5. Upload de imagens (Supabase Storage)
├── 6. Busca de lojas
├── 7. Painel de payouts (Admin)
└── 8. Notificação de pedido pronto

SPRINT C — Deploy
├── 9. CI/CD atualizado (Seção 7)
├── 10. Deploy Railway + Vercel (Seção 8)
├── 11. Monitoramento (Seção 9)
├── 12. Webhook MP em produção
└── 13. Testes finais E2E

SPRINT D — Beta
├── 14. 3-5 vendedores reais no IME
├── 15. Grupo WhatsApp de beta testers
├── 16. Coletar feedback por 1-2 semanas
└── 17. Ajustes baseados no feedback

SPRINT E — Launch público
├── 18. UX improvements (Seção 5)
├── 19. App stores (se mobile nativo)
└── 20. Marketing no IME
```
