import { STOCK_WARNING_THRESHOLD } from '@/lib/constants';

export function StockBadge({ stockQty }: { stockQty: number }) {
  if (stockQty <= 0) {
    return (
      <span className="text-[10px] font-bold bg-error/15 text-error px-2 py-0.5 rounded-full">
        Esgotado
      </span>
    );
  }

  if (stockQty < STOCK_WARNING_THRESHOLD) {
    return (
      <span className="text-[10px] font-bold bg-warning/15 text-warning px-2 py-0.5 rounded-full">
        Últimas unidades
      </span>
    );
  }

  return null;
}
