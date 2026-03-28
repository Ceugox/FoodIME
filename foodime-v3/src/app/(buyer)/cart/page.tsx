'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { useCreateOrder } from '@/hooks/useOrders';
import { toast } from '@/components/common/toast';

export default function CartPage() {
  const { items, storeId, storeName, updateQuantity, removeItem, clear, getTotal, getItemCount } = useCartStore();
  const createOrder = useCreateOrder();
  const router = useRouter();

  async function handleCheckout() {
    if (!storeId || items.length === 0) return;
    try {
      const result = await createOrder.mutateAsync({
        storeId,
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      });
      clear();
      router.push(`/checkout/${result.data.id}`);
    } catch (err: any) {
      toast({ title: err?.message || 'Erro ao criar pedido', variant: 'error' });
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center">
        <svg className="w-16 h-16 text-text-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
        <h2 className="text-lg font-bold text-text mb-2">Carrinho vazio</h2>
        <p className="text-text-secondary text-sm mb-4">Explore as lojas e adicione produtos.</p>
        <Link href="/home" className="text-accent font-semibold text-sm hover:underline">
          Ver lojas
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-serif text-text mb-1">Carrinho</h1>
      {storeName && <p className="text-text-secondary text-xs mb-4">{storeName}</p>}

      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <div key={item.product.id} className="bg-surface rounded-xl border border-border p-3 flex gap-3 animate-slide-up">
            {item.product.imageUrl && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-text truncate">{item.product.name}</h3>
              <p className="text-primary font-bold text-sm">R$ {Number(item.product.price).toFixed(2)}</p>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-surface-2 border border-border text-text-secondary flex items-center justify-center text-sm">−</button>
                <span className="text-xs font-bold text-text">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-surface-2 border border-border text-text-secondary flex items-center justify-center text-sm">+</button>
                <button onClick={() => removeItem(item.product.id)} className="ml-auto text-error text-xs font-semibold">Remover</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface rounded-xl border border-border p-4 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">{getItemCount()} itens</span>
          <span className="text-text font-bold">R$ {getTotal().toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={handleCheckout}
        disabled={createOrder.isPending}
        className="w-full h-12 bg-primary hover:bg-primary-light disabled:opacity-60 text-white rounded-xl font-bold shadow-warm hover:shadow-glow transition-all"
      >
        {createOrder.isPending ? 'Criando pedido...' : 'Ir para pagamento'}
      </button>
    </div>
  );
}
