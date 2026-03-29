import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import * as mp from '@/lib/mercadopago';
import { handleOrderPaid, handlePaymentFailed } from '@/services/payments.service';

const WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET || '';
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

// Simple deduplication cache
const processedIds = new Map<string, number>();
const DEDUP_TTL = 10 * 60 * 1000;

function cleanupDedup() {
  const now = Date.now();
  for (const [key, ts] of processedIds) {
    if (now - ts > DEDUP_TTL) processedIds.delete(key);
  }
}

function verifySignature(req: NextRequest, body: string): boolean {
  if (!WEBHOOK_SECRET) return true; // skip in dev

  const xSignature = req.headers.get('x-signature') || '';
  const xRequestId = req.headers.get('x-request-id') || '';

  const parts = Object.fromEntries(xSignature.split(',').map((p) => {
    const [k, v] = p.split('=');
    return [k.trim(), v?.trim()];
  }));

  const ts = parts['ts'];
  const hash = parts['v1'];
  if (!ts || !hash) return false;

  const tsNum = parseInt(ts, 10);
  if (Math.abs(Date.now() - tsNum * 1000) > TIMESTAMP_TOLERANCE_MS) return false;

  let dataId = '';
  try {
    const parsed = JSON.parse(body);
    dataId = parsed?.data?.id?.toString() || '';
  } catch { /* ignore */ }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(manifest).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  if (!verifySignature(req, body)) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  let parsed: any;
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const action = parsed?.action;
  const dataId = parsed?.data?.id?.toString();

  if (!dataId || (action !== 'payment.updated' && action !== 'payment.created')) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Deduplication
  cleanupDedup();
  const dedupKey = `${action}:${dataId}`;
  if (processedIds.has(dedupKey)) {
    return NextResponse.json({ received: true }, { status: 200 });
  }
  processedIds.set(dedupKey, Date.now());

  try {
    const payment = await mp.getPayment(dataId);
    const status = payment.status;

    if (status === 'approved') {
      await handleOrderPaid(payment);
    } else if (status === 'rejected' || status === 'cancelled') {
      await handlePaymentFailed(payment);
    }
  } catch (e) {
    console.error('Webhook processing error:', e);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
