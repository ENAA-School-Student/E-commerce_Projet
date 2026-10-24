import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Cart } from '@/types';
import { cart as cartApi, wishlist as wishlistApi } from '@/lib/api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  refreshCart: () => Promise<void>;
  addToCart: (productId: number, quantity: number, variantId?: number) => Promise<void>;
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshCart = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    if (!user) {
      setCart(null);
      setLoading(false);
      return;
    }
    try {
      const res = await cartApi.get();
      setCart(res.data);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => { refreshCart(); }, [refreshCart]);

  const addToCart = useCallback(async (productId: number, quantity: number, variantId?: number) => {
    if (!user) { toast.error('Please login to add items'); return; }
    await cartApi.add({ productId, variantId, quantity });
    await refreshCart();
    toast.success('Added to bag');
  }, [user, refreshCart]);

  const updateQuantity = useCallback(async (cartItemId: number, quantity: number) => {
    await cartApi.updateQuantity(cartItemId, quantity);
    await refreshCart();
  }, [refreshCart]);

  const removeFromCart = useCallback(async (cartItemId: number) => {
    await cartApi.remove(cartItemId);
    await refreshCart();
    toast.success('Removed from bag');
  }, [refreshCart]);

  const clearCart = useCallback(async () => {
    await cartApi.clear();
    await refreshCart();
  }, [refreshCart]);

  const itemCount = cart?.itemCount ?? 0;

  return (
    <CartContext.Provider value={{ cart, loading, itemCount, refreshCart, addToCart, updateQuantity, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
