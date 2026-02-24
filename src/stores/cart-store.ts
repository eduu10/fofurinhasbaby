import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartProduct {
  id: string;
  title: string;
  price: number;
  compareAtPrice?: number | null;
  image: string;
  slug: string;
  stock: number;
  minQuantity: number;
  maxQuantity: number;
}

export interface CartVariation {
  id: string;
  name: string;
  value: string;
  price?: number | null;
}

export interface CartItemType {
  id: string;
  product: CartProduct;
  variation?: CartVariation | null;
  quantity: number;
}

interface CartState {
  items: CartItemType[];
  couponCode: string | null;
  discount: number;
  shipping: number;
  addItem: (product: CartProduct, quantity: number, variation?: CartVariation | null) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setCoupon: (code: string | null, discount: number) => void;
  setShipping: (value: number) => void;
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      discount: 0,
      shipping: 0,

      addItem: (product, quantity, variation) => {
        const items = get().items;
        const existingIndex = items.findIndex(
          (item) =>
            item.product.id === product.id &&
            item.variation?.id === variation?.id
        );

        if (existingIndex >= 0) {
          const updated = [...items];
          const newQty = Math.min(
            updated[existingIndex].quantity + quantity,
            product.maxQuantity
          );
          updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
          set({ items: updated });
        } else {
          const itemId = `${product.id}-${variation?.id || "default"}`;
          set({
            items: [...items, { id: itemId, product, variation, quantity }],
          });
        }
      },

      removeItem: (itemId) => {
        set({ items: get().items.filter((item) => item.id !== itemId) });
      },

      updateQuantity: (itemId, quantity) => {
        const items = get().items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: Math.max(
                  item.product.minQuantity,
                  Math.min(quantity, item.product.maxQuantity)
                ),
              }
            : item
        );
        set({ items });
      },

      clearCart: () => {
        set({ items: [], couponCode: null, discount: 0, shipping: 0 });
      },

      setCoupon: (code, discount) => {
        set({ couponCode: code, discount });
      },

      setShipping: (value) => {
        set({ shipping: value });
      },

      getSubtotal: () => {
        return get().items.reduce((total, item) => {
          const price = item.variation?.price || item.product.price;
          return total + price * item.quantity;
        }, 0);
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const { discount, shipping } = get();
        return Math.max(0, subtotal - discount + shipping);
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: "fofurinhas-cart",
    }
  )
);
