'use client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';
import { useCreateOrder } from '@/hooks/useOrders';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/hooks/useToast';

export default function CartPage() {
  const router = useRouter();
  const { items, storeId, storeName, updateQuantity, removeItem, getTotal, getItemCount } = useCartStore();
  const createOrder = useCreateOrder();

  const total = getTotal();
  const count = getItemCount();

  async function handleCheckout() {
    if (!storeId || !items.length) return;

    try {
      const order = await createOrder.mutateAsync({
        storeId,
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      });
      router.push(`/checkout/${order.id}`);
    } catch (err: any) {
      toast({ title: err?.response?.data?.message || 'Erro ao criar pedido', variant: 'error' });
    }
  }

  if (!items.length) {
    return (
      <div className="px-5 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-border hover:border-border-hover transition-colors">
            <svg className="w-4 h-4 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-lg font-serif text-text">Carrinho</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4 animate-scale-in">
          <svg className="w-14 h-14 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          <p className="text-text-secondary font-semibold">Carrinho vazio</p>
          <button onClick={() => router.push('/home')} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold shadow-warm hover:shadow-glow transition-all">
            Explorar lojas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 animate-slide-up">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-border hover:border-border-hover transition-colors">
          <svg className="w-4 h-4 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-serif text-text">Carrinho</h1>
      </div>
      <p className="text-text-secondary text-sm mb-5 ml-12">{storeName}</p>

      <div className="space-y-3 mb-6">
        {items.map(({ product, quantity }) => (
          <div key={product.id} className="flex items-center gap-3 bg-surface rounded-xl border border-border p-3 hover:border-border-hover transition-all">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-surface-2 flex-shrink-0">
              {product.imageUrl ? (
                <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text text-sm truncate">{product.name}</p>
              <p className="text-accent font-serif text-sm mt-0.5">{formatCurrency(product.price)}</p>
            </div>
            <div className="flex items-center gap-1 bg-surface-2 rounded-xl px-1">
              <button onClick={() => updateQuantity(product.id, quantity - 1)} className="w-8 h-8 flex items-center justify-center text-primary font-bold">−</button>
              <span className="text-text font-semibold text-sm w-5 text-center">{quantity}</span>
              <button onClick={() => updateQuantity(product.id, quantity + 1)} className="w-8 h-8 flex items-center justify-center text-primary font-bold">+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-4 space-y-2">
        <div className="flex justify-between text-sm text-text-secondary">
          <span>{count} {count === 1 ? 'item' : 'itens'}</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <div className="border-t border-border pt-2 flex justify-between font-bold text-text">
          <span>Total</span>
          <span className="text-accent font-serif text-lg">{formatCurrency(total)}</span>
        </div>
      </div>

      <button
        onClick={handleCheckout}
        disabled={createOrder.isPending}
        className="w-full h-13 bg-primary hover:bg-primary-light disabled:opacity-60 text-white rounded-xl font-bold text-base shadow-warm hover:shadow-glow transition-all"
      >
        {createOrder.isPending ? 'Aguarde...' : 'Fazer pedido'}
      </button>
    </div>
  );
}
