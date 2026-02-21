# Payment Skill — FoodIME

> Consulte este documento antes de qualquer tarefa relacionada a pagamentos:
> integração Mercado Pago, comissão, webhooks, Pix, cartão de crédito e estornos.

---

## 1. Visão Geral do Fluxo de Pagamento

```
[Comprador confirma pedido]
        ↓
[Backend cria Order PENDING]
        ↓
[Backend cria pagamento no Mercado Pago (Pix ou Cartão)]
        ↓
[MP retorna QR Code Pix (copia-e-cola + base64) ou processa cartão]
        ↓
[Comprador paga]
        ↓
[MP dispara webhook → POST /payments/webhook]
        ↓
[Backend valida x-signature HMAC-SHA256]
        ↓
[Backend consulta GET /v1/payments/:id para confirmar status]
        ↓
[Transação Prisma: decrementa estoque + Order PAID]
        ↓
[Socket.io notifica vendedor em tempo real]
        ↓
[Todo dinheiro cai na conta MP da empresa → admin repassa vendedores manualmente]
```

---

## 2. Configuração do Mercado Pago

### Credenciais no .env
```
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxx-placeholder
MERCADOPAGO_WEBHOOK_SECRET=placeholder
```

### MercadoPagoService — wrapper base
```typescript
// modules/payments/mercadopago.service.ts
@Injectable()
export class MercadoPagoService {
  private readonly baseUrl = 'https://api.mercadopago.com';

  // Header: Authorization: Bearer ACCESS_TOKEN
  // Pix: POST /v1/payments com payment_method_id: 'pix'
  //   → retorna point_of_interaction.transaction_data.qr_code (string)
  //   → retorna point_of_interaction.transaction_data.qr_code_base64 (imagem)
  // Cartão: POST /v1/payments com payment_method_id: 'credit_card' + token
  // Consultar: GET /v1/payments/:id → status
  // Estornar: POST /v1/payments/:id/refunds

  // Valores em BRL (não centavos) — a conversão de centavos → BRL é feita no service
}
```

---

## 3. Webhook Controller

```typescript
// modules/payments/webhook.controller.ts
// Mercado Pago envia webhook POST com:
// - Header: x-signature (formato: ts=xxx,v1=hash)
// - Header: x-request-id
// - Query: data.id (payment ID)
// - Body: { action: 'payment.updated', data: { id: paymentId } }

// Validação:
// manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
// expectedHash = HMAC-SHA256(MERCADOPAGO_WEBHOOK_SECRET, manifest)
// Comparar hash com v1 do x-signature

// Após validação: GET /v1/payments/:id para confirmar status real
// Se approved → handleOrderPaid()
// Se rejected/cancelled → handlePaymentFailed()
```

---

## 4. PaymentsService — lógica de negócio

- `initiatePayment()`: chama `mercadopago.createPixPayment()` ou `createCardPayment()`
- Salva `gatewayTxId` (ID do pagamento no MP) no Payment record
- Para Pix: retorna `pixQrCode` (string copia-e-cola) e `pixQrCodeBase64` (imagem)
- Comissão calculada pela `store.commissionRate` (salva no Payment, sem split automático)
- `handleOrderPaid(gatewayTxId)`: busca Payment por gatewayTxId → confirma pedido
- `handlePaymentFailed(gatewayTxId)`: busca Payment por gatewayTxId → cancela pedido
- Estorno: `mercadopago.refundPayment(paymentId)` quando estoque insuficiente

---

## 5. Fluxo Mobile — Pix

```typescript
// screens/buyer/CheckoutScreen.tsx
// 1. initiatePayment com method='PIX'
// 2. Recebe { gatewayTxId, pixQrCode, pixQrCodeBase64 }
// 3. Exibe QR Code via react-native-qrcode-svg
// 4. Mostra código copia-e-cola com botão "Copiar" (expo-clipboard)
// 5. Timer de 15 minutos (countdown visual)
// 6. Polling a cada 3 segundos via usePaymentByOrder hook
// 7. Quando status === 'PAID' → navega para OrderConfirm
```

---

## 6. Fluxo Mobile — Cartão de Crédito

```typescript
// Token de cartão é gerado pelo SDK do Mercado Pago no frontend
// Nunca trafegar dados de cartão para o backend
// Enviar apenas o token via cardToken no initiatePayment
```

---

## 7. Cadastro do Vendedor

Não é mais necessário criar recebedor no gateway. Ao criar loja, basta salvar `pixKey` — o `gatewayId` foi removido do schema. Todo dinheiro vai para a conta MP da empresa, e o admin repassa manualmente.

---

## 8. Checklist antes de implementar algo relacionado a pagamentos

- [ ] Webhook está validando x-signature HMAC-SHA256?
- [ ] Webhook consulta GET /v1/payments/:id para confirmar status real?
- [ ] Comissão calculada por store.commissionRate?
- [ ] Decremento de estoque acontece dentro de transação Prisma atômica?
- [ ] Estorno automático está implementado para falha de estoque?
- [ ] Card token é o único dado de cartão armazenado?
- [ ] Mobile exibe QR Code e código copia-e-cola para Pix?
- [ ] Polling de status Pix tem timeout de 15 minutos?
- [ ] Variáveis de ambiente sensíveis estão no .env?
- [ ] Testou o fluxo completo no ambiente sandbox do MP antes de produção?

---

## 9. Ambiente Sandbox

Para testes, usar Access Token de teste:
```
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxx
```

Consultar documentação MP para cartões de teste e simulação de Pix.
