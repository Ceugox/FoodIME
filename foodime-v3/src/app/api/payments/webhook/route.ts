import { NextRequest, NextResponse } from 'next/server';
import { handleOrderPaid } from '@/services/payments.service';
import { prisma } from '@/lib/prisma';

// Simple deduplication cache
const processedIds = new Map<string, number>();
const DEDUP_TTL = 10 * 60 * 1000;

function cleanupDedup() {
  const now = Date.now();
  for (const [key, ts] of processedIds) {
    if (now - ts > DEDUP_TTL) processedIds.delete(key);
  }
}

/**
 * Efí Bank PIX webhook.
 *
 * Efí sends POST when a PIX payment is received:
 * { "pix": [{ "txid": "...", "endToEndId": "E...", "valor": "10.50", "horario": "..." }] }
 *
 * In production, Efí uses mTLS to authenticate the webhook caller.
 * As an additional validation we check that the txid exists in our DB before processing.
 *
 * To register the webhook URL with Efí:
 *   PUT /v2/webhook/<EFI_PIX_KEY>  { "webhookUrl": "https://your-domain/api/payments/webhook" }
 */
export async function POST(req: NextRequest) {
  let parsed: any;
  try {
    const body = await req.text();
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Efí sends either { pix: [...] } for confirmed PIX payments
  const pixList: Array<{ txid: string; endToEndId: string; valor: string; horario: string }> =
    parsed?.pix ?? [];

  if (pixList.length === 0) {
    // Could be a handshake or other event type — acknowledge silently
    return NextResponse.json({ received: true }, { status: 200 });
  }

  cleanupDedup();

  for (const pixItem of pixList) {
    const txid = pixItem.txid;
    if (!txid) continue;

    // Deduplication
    if (processedIds.has(txid)) continue;
    processedIds.set(txid, Date.now());

    try {
      // Validate txid exists in our DB before processing (replaces mTLS validation in sandbox)
      const payment = await prisma.payment.findFirst({ where: { gatewayTxId: txid } });
      if (!payment) {
        console.warn(`[webhook] Unknown txid: ${txid} — skipping`);
        continue;
      }

      if (payment.status === 'PAID' || payment.status === 'REFUNDED') {
        console.log(`[webhook] Already processed: ${txid}`);
        continue;
      }

      await handleOrderPaid(txid, 'PIX');
      console.log(`[webhook] PIX confirmed: ${txid}`);
    } catch (e) {
      console.error(`[webhook] Error processing txid ${txid}:`, e);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
