# Guia de Deploy — FoodIME

## Passo 1: GitHub Secrets

Vá em **Settings > Secrets and variables > Actions** no repositório e adicione:

| Secret | Descrição |
|--------|-----------|
| `RAILWAY_TOKEN` | Token do Railway (Settings > Tokens no painel Railway) |
| `VERCEL_TOKEN` | Token do Vercel (Settings > Tokens no painel Vercel) |
| `VERCEL_ORG_ID` | ID da org Vercel (Settings > General) |
| `VERCEL_PROJECT_ID_WEB` | ID do projeto Vercel para web PWA |
| `VERCEL_PROJECT_ID_ADMIN` | ID do projeto Vercel para admin |
| `NEXT_PUBLIC_API_URL` | URL do backend Railway (ex: `https://foodime-backend-production.up.railway.app`) |
| `SENTRY_AUTH_TOKEN` | Auth token do Sentry (Settings > API Keys) |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN do projeto Sentry |

---

## Passo 2: Railway (Backend)

1. Acessar [railway.app](https://railway.app) e criar novo projeto
2. Conectar ao repo GitHub `foodime`
3. Configurar:
   - **Root Directory:** `backend`
   - **Builder:** Dockerfile
   - **Dockerfile Path:** `backend/Dockerfile`
4. Setar variáveis de ambiente no Railway:

```env
NODE_ENV=production
PORT=3000

# Banco (Supabase — mesmos do .env local)
DATABASE_URL=postgresql://postgres.gkwupszdlsvoejhecfhw:...@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.gkwupszdlsvoejhecfhw:...@aws-0-us-west-2.pooler.supabase.com:5432/postgres

# JWT (GERAR NOVOS para produção! Use: openssl rand -hex 32)
JWT_SECRET=<novo-valor-32-chars>
JWT_REFRESH_SECRET=<novo-valor-32-chars>

# Mercado Pago (TEST por enquanto)
MERCADOPAGO_ACCESS_TOKEN=TEST-...
MERCADOPAGO_WEBHOOK_SECRET=<do-painel-mp>

# Supabase
SUPABASE_URL=https://gkwupszdlsvoejhecfhw.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>

# CORS — atualizar depois com URLs finais do Vercel
CORS_ORIGINS=http://localhost:3001,http://localhost:3002

# Sentry
SENTRY_DSN=<dsn-do-sentry>
```

5. Fazer deploy e testar: `GET https://<railway-url>/health`

---

## Passo 3: Vercel (Web PWA)

1. Importar repo no Vercel
2. **Root Directory:** `web`
3. **Framework Preset:** Next.js
4. Variáveis:
   - `NEXT_PUBLIC_API_URL` = URL do Railway (ex: `https://foodime-backend-production.up.railway.app`)
   - `NEXT_PUBLIC_SENTRY_DSN` = DSN do Sentry
   - `SENTRY_AUTH_TOKEN` = Auth token do Sentry
5. Deploy

---

## Passo 4: Vercel (Admin)

1. Importar repo no Vercel (novo projeto)
2. **Root Directory:** `admin`
3. **Framework Preset:** Next.js
4. **Install Command:** `npm ci --legacy-peer-deps` (necessário pelo Tremor)
5. Variáveis:
   - `NEXT_PUBLIC_API_URL` = URL do Railway
   - `NEXT_PUBLIC_SENTRY_DSN` = DSN do Sentry
   - `SENTRY_AUTH_TOKEN` = Auth token do Sentry
6. Deploy

---

## Passo 5: Atualizar CORS no Railway

Depois que web e admin estiverem no ar, atualizar a variável `CORS_ORIGINS` no Railway:

```
CORS_ORIGINS=https://foodime-web.vercel.app,https://foodime-admin.vercel.app
```

(substitua pelas URLs reais)

---

## Passo 6: Webhook Mercado Pago

1. Acessar [mercadopago.com.br/developers](https://mercadopago.com.br/developers)
2. Ir em Integrações > Webhooks
3. URL: `https://<railway-url>/payments/webhook`
4. Eventos: `payment.updated`
5. Copiar o `MERCADOPAGO_WEBHOOK_SECRET` gerado e atualizar no Railway

---

## Passo 7: Validação

- [ ] `GET https://<railway-url>/health` retorna `{ status: "ok" }`
- [ ] Web PWA carrega no Vercel, login funciona
- [ ] Admin carrega no Vercel, login funciona
- [ ] Fluxo buyer: registro > login > loja > carrinho > Pix
- [ ] Fluxo seller: login > abrir loja > receber pedido > marcar pronto
- [ ] Sentry recebendo eventos (forçar um erro 404)
- [ ] CI/CD: push na main dispara workflows automaticamente

---

## Deploy Manual

Use o workflow `deploy.yml` para deploys manuais:

```
GitHub > Actions > Manual Deploy > Run workflow
```

Selecione o serviço (backend/web/admin/all) e o environment.
