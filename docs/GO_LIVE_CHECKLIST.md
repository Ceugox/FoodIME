# FoodIME V3 Go-Live Checklist

## 1. Variáveis obrigatórias no Railway

Configure estas envs antes do deploy:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `EMAIL_FROM`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`

## 2. Pré-deploy local

Na pasta `foodime-v3/`, execute:

```bash
npm run check:env
npm run build
```

## 3. Deploy

O deploy principal usa:

- [railway.json](/C:/Users/marce/Documents/GitHub/FoodIME/railway.json)
- [foodime-v3/Dockerfile](/C:/Users/marce/Documents/GitHub/FoodIME/foodime-v3/Dockerfile)
- [.github/workflows/foodime-v3.yml](/C:/Users/marce/Documents/GitHub/FoodIME/.github/workflows/foodime-v3.yml)

## 4. Smoke test pós-deploy

Execute nesta ordem:

1. `GET /api/health` retorna `200`.
2. Cadastro comprador por email envia link e verificação conclui login.
3. Cadastro vendedor por email cria conta pendente e bloqueia acesso até aprovação.
4. Login com Google de comprador redireciona para `/home`.
5. Cadastro/login com Google de vendedor mostra mensagem de aprovação pendente.
6. Recuperação de senha envia email e redefine senha com token válido.
7. Checkout PIX gera QR code, copia código e aprova pedido após webhook.
8. Checkout cartão cria token, cobra no Mercado Pago e atualiza pedido.
9. Admin aprova seller e registra payout sem erro.
10. Upload de imagem, criação de produto e abertura/fechamento da loja funcionam.

## 5. Critérios de hoje

Podemos chamar de entregue hoje quando:

- deploy da V3 estiver no ar
- Google Auth estiver funcionando com credenciais reais
- email de verificação e reset estiverem chegando
- PIX e cartão sandbox passarem ponta a ponta
- fluxo de seller pendente/aprovado estiver validado
