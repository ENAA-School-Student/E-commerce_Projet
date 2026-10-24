import { createContext, useCallback, useContext, useEffect, ReactNode, useState } from 'react';
import { wishlist as wishlistApi } from '@/lib/api';
import { Product } from '@/types';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface WishlistContextType {
  products: Product[];
  loading: boolean;
  count: number;
  has: (productId: number) => boolean;
  toggle: (product: Product) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    if (!user) {
      setProducts([]);
      setLoading(false);
      return;
    }
    try {
      const res = await wishlistApi.list();
      setProducts(res.data ?? []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (product: Product) => {
      if (!user) {
        toast.error('Sign in to save pieces');
        return;
      }
      const saved = products.some((p) => p.id === product.id);
      try {
        const res = saved ? await wishlistApi.remove(product.id) : await wishlistApi.add(product.id);
        setProducts(res.data ?? []);
        toast(saved ? 'Removed from wishlist' : 'Saved to wishlist', { icon: saved ? '♡' : '♥' });
      } catch {
        toast.error('Could not update wishlist');
      }
    },
    [products, user],
  );

  const has = useCallback((productId: number) => products.some((p) => p.id === productId), [products]);

  return (
    <WishlistContext.Provider value={{ products, loading, count: products.length, has, toggle }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
