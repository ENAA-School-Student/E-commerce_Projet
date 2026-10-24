import { useCallback, useState } from 'react';
import { Product } from '@/types';

const KEY = 'luxemar…wged';
const MAX = 8;

function read(): Product[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Product[];
  } catch {
    return [];
  }
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<Product[]>(read);

  const push = useCallback((product: Product) => {
    setItems((prev) => {
      const next = [product, ...prev.filter((p) => p.id !== product.id)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(KEY);
    setItems([]);
  }, []);

  return { items, push, clear };
}
