'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/types/models.types';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  storeId: string | null;
  storeName: string | null;
  items: CartItem[];
  addItem: (product: Product, storeName: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      storeId: null,
      storeName: null,
      items: [],

      addItem: (product, storeName) => {
        if (!product.isAvailable || product.stockQty <= 0) return;

        const { items, storeId } = get();

        if (storeId && storeId !== product.storeId) {
          set({ storeId: product.storeId, storeName, items: [{ product, quantity: 1 }] });
          return;
        }

        const existing = items.find((i) => i.product.id === product.id);
        if (existing) {
          set({
            items: items.map((i) =>
              i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
            ),
          });
        } else {
          set({ storeId: product.storeId, storeName, items: [...items, { product, quantity: 1 }] });
        }
      },

      removeItem: (productId) => {
        const items = get().items.filter((i) => i.product.id !== productId);
        if (items.length === 0) {
          set({ storeId: null, storeName: null, items: [] });
        } else {
          set({ items });
        }
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        const item = get().items.find((i) => i.product.id === productId);
        if (item && quantity > item.product.stockQty) quantity = item.product.stockQty;
        set({ items: get().items.map((i) => (i.product.id === productId ? { ...i, quantity } : i)) });
      },

      clear: () => set({ storeId: null, storeName: null, items: [] }),

      getTotal: () =>
        get().items.reduce((total, item) => total + Number(item.product.price) * item.quantity, 0),

      getItemCount: () => get().items.reduce((count, item) => count + item.quantity, 0),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
