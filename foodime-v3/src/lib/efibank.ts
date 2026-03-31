import https from 'https';
import { URL } from 'url';
import { AppError } from '@/lib/api/errors';

const EFI_SANDBOX = process.env.EFI_SANDBOX === 'true';

const PIX_BASE_URL = EFI_SANDBOX
  ? 'https://pix-h.api.efipay.com.br'
  : 'https://pix.api.efipay.com.br';

const COBRANCAS_BASE_URL = EFI_SANDBOX
  ? 'https://cobrancas-h.api.efipay.com.br'
  : 'https://cobrancas.api.efipay.com.br';

// ─── mTLS agent (required by Efí PIX API in both sandbox and production) ─────

function buildPixAgent(): https.Agent {
  const cert64 = process.env.EFI_CERT_BASE64;
  const key64 = process.env.EFI_KEY_BASE64;
  if (cert64 && key64) {
    return new https.Agent({
      cert: Buffer.from(cert64, 'base64').toString('utf-8'),
      key: Buffer.from(key64, 'base64').toString('utf-8'),
      rejectUnauthorized: true,
    });
  }
  // No certificate configured — will fail on real mTLS endpoints
  return new https.Agent();
}

const pixAgent = buildPixAgent();

// Promise-based wrapper around https.request (supports https.Agent with mTLS)
async function httpsRequest<T>(
  method: string,
  urlStr: string,
  headers: Record<string, string>,
  body?: unknown,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const reqHeaders: Record<string, string> = {
      ...headers,
      'Content-Type': 'application/json',
      ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr).toString() } : {}),
    };

    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method,
        headers: reqHeaders,
        agent: url.hostname.includes('pix') ? pixAgent : undefined,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            if (res.statusCode && res.statusCode >= 400) {
              reject({ status: res.statusCode, body: parsed });
            } else {
              resolve(parsed as T);
            }
          } catch {
            reject({ status: res.statusCode, body: data });
          }
        });
      },
    );

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── OAuth token cache ───────────────────────────────────────────────────────

let pixTokenCache: { token: string; expiresAt: number } | null = null;
let cobrancasTokenCache: { token: string; expiresAt: number } | null = null;

async function getPixAccessToken(): Promise<string> {
  if (pixTokenCache && Date.now() < pixTokenCache.expiresAt) {
    return pixTokenCache.token;
  }

  const credentials = Buffer.from(
    `${process.env.EFI_CLIENT_ID}:${process.env.EFI_CLIENT_SECRET}`,
  ).toString('base64');

  const data = await httpsRequest<any>('POST', `${PIX_BASE_URL}/oauth/token`, {
    Authorization: `Basic ${credentials}`,
  }, { grant_type: 'client_credentials' });

  if (!data.access_token) {
    throw new AppError(500, `Efí PIX OAuth failed: ${data.error || 'no token'}`);
  }

  pixTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return pixTokenCache.token;
}

async function getCobrancasAccessToken(): Promise<string> {
  if (cobrancasTokenCache && Date.now() < cobrancasTokenCache.expiresAt) {
    return cobrancasTokenCache.token;
  }

  const credentials = Buffer.from(
    `${process.env.EFI_CLIENT_ID}:${process.env.EFI_CLIENT_SECRET}`,
  ).toString('base64');

  const res = await fetch(`${COBRANCAS_BASE_URL}/v1/authorize`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new AppError(500, `Efí Cobranças OAuth failed: ${err.error || res.status}`);
  }

  const data = await res.json();
  cobrancasTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cobrancasTokenCache.token;
}

// ─── PIX helpers ─────────────────────────────────────────────────────────────

async function pixRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getPixAccessToken();
  try {
    return await httpsRequest<T>(method, `${PIX_BASE_URL}${path}`, {
      Authorization: `Bearer ${token}`,
    }, body);
  } catch (err: any) {
    const status: number = err?.status ?? 500;
    const msg: string = err?.body?.mensagem || err?.body?.message || `HTTP ${status}`;
    console.error(`[Efí PIX] ${method} ${path} → ${status}: ${msg}`, JSON.stringify(err?.body));
    if (status === 400 || status === 422) throw new AppError(400, `Efí PIX: ${msg}`);
    if (status === 401 || status === 403) throw new AppError(403, `Efí PIX: ${msg}`);
    if (status === 404) throw new AppError(404, `Efí PIX: ${msg}`);
    throw new AppError(500, `Efí PIX error: ${msg}`);
  }
}

// ─── Cobranças helpers ───────────────────────────────────────────────────────

async function cobrancasRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getCobrancasAccessToken();
  const res = await fetch(`${COBRANCAS_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.mensagem || err.message || `HTTP ${res.status}`;
    console.error(`[Efí Cobranças] ${method} ${path} → ${res.status}: ${msg}`);
    if (res.status === 400 || res.status === 422) throw new AppError(400, `Efí Cobranças: ${msg}`);
    if (res.status === 401 || res.status === 403) throw new AppError(403, `Efí Cobranças: ${msg}`);
    if (res.status === 404) throw new AppError(404, `Efí Cobranças: ${msg}`);
    throw new AppError(500, `Efí Cobranças error: ${msg}`);
  }

  return res.json();
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Creates a dynamic PIX charge.
 * txid must be alphanumeric, 26–35 chars. We use orderId without hyphens (32 chars).
 *
 * NOTE: In production, Efí Bank PIX API requires mTLS client certificates.
 * Set EFI_CERT_BASE64 + EFI_KEY_BASE64 env vars and configure a custom agent.
 * For sandbox, mTLS is relaxed — plain HTTPS works.
 */
export async function createPixCharge(params: {
  amount: number; // in cents
  orderId: string;
  payerName?: string;
  orderCode?: string;
}) {
  const txid = params.orderId.replace(/-/g, ''); // 32-char hex UUID

  const chargeBody = {
    calendario: { expiracao: 900 }, // 15 minutes
    valor: { original: (params.amount / 100).toFixed(2) },
    chave: process.env.EFI_PIX_KEY,
    solicitacaoPagador: params.orderCode
      ? `Pedido #${params.orderCode} FoodIME`
      : 'Pedido FoodIME',
  };

  const charge = await pixRequest<any>('PUT', `/v2/cob/${txid}`, chargeBody);
  // GET the charge to retrieve pixCopiaECola
  const chargeDetails = await pixRequest<any>('GET', `/v2/cob/${txid}`);
  const pixCopiaECola: string = chargeDetails.pixCopiaECola || '';

  if (!pixCopiaECola) {
    throw new AppError(500, 'Efí PIX: pixCopiaECola não retornado');
  }

  // QR code image is rendered client-side from pixCopiaECola (via qrcode.react)
  return {
    txid,
    pixCopiaECola,
  };
}

export async function getPixCharge(txid: string) {
  const data = await pixRequest<any>('GET', `/v2/cob/${txid}`);
  return {
    txid: data.txid as string,
    status: data.status as 'ATIVA' | 'CONCLUIDA' | 'REMOVIDA_PELO_PSP' | 'REMOVIDA_PELO_USUARIO_RECEBEDOR',
    valor: data.valor?.original as string | undefined,
  };
}

export async function refundPix(txid: string, amount: number) {
  const charge = await pixRequest<any>('GET', `/v2/cob/${txid}`);
  const endToEndId: string | undefined = charge.pix?.[0]?.endToEndId;

  if (!endToEndId) {
    console.warn(`[Efí] refundPix: no endToEndId found for txid ${txid}`);
    return;
  }

  const devolucaoId = crypto.randomUUID().replace(/-/g, '').slice(0, 35);
  await pixRequest('PUT', `/v2/pix/${endToEndId}/devolucao/${devolucaoId}`, {
    valor: (amount / 100).toFixed(2),
  });
}

/**
 * Creates a card charge using Efí Bank's Cobranças API (one-step).
 * cardHash is the payment_token generated client-side by efipay-js.
 */
export async function createCardCharge(params: {
  amount: number; // in cents
  orderId: string;
  cardHash: string;
  customer: {
    name: string;
    email: string;
    cpf: string;
    phone: string;
  };
  orderCode?: string;
}) {
  const body = {
    items: [
      {
        name: params.orderCode ? `Pedido #${params.orderCode} FoodIME` : 'Pedido FoodIME',
        value: params.amount,
        amount: 1,
      },
    ],
    payment: {
      credit_card: {
        installments: 1,
        payment_token: params.cardHash,
        billing_address: {
          street: 'Rua FoodIME',
          number: '0',
          neighborhood: 'Campus',
          zipcode: '20000000',
          city: 'Rio de Janeiro',
          state: 'RJ',
        },
        customer: {
          name: params.customer.name,
          email: params.customer.email,
          cpf: params.customer.cpf.replace(/\D/g, ''),
          phone_number: params.customer.phone.replace(/\D/g, ''),
        },
      },
    },
  };

  const res = await cobrancasRequest<any>('POST', '/v1/charge/one-step', body);
  const chargeData = res.data;

  return {
    chargeId: String(chargeData.charge_id),
    status: chargeData.status as 'approved' | 'waiting' | 'unpaid' | 'rejected',
  };
}

export async function refundCard(chargeId: string) {
  await cobrancasRequest('POST', `/v1/charge/${chargeId}/refund`);
}
