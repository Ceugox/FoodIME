const STOCK_WARNING_THRESHOLD = 10;

interface StockBadgeProps {
  stockQty: number;
  isAvailable: boolean;
}

export function StockBadge({ stockQty, isAvailable }: StockBadgeProps) {
  if (isAvailable === false || stockQty === 0) {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-error/30 bg-error/10 text-error">
        Esgotado
      </span>
    );
  }
  if (stockQty < STOCK_WARNING_THRESHOLD) {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-warning/30 bg-warning/10 text-warning">
        Últimas unidades
      </span>
    );
  }
  return null;
}
