import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredOrders } from '@/services/orders.service';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const deleted = await cleanupExpiredOrders();
  return NextResponse.json({ data: { deletedCount: deleted } });
}
