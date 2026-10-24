import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Icon from '@/components/Icon';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import { EmptyState } from '@/components/Primitives';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { Product } from '@/types';

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { products, loading: listLoading, count, toggle } = useWishlist();
  const { addToCart } = useCart();
  const config = useStoreConfig();
  const [busy, setBusy] = useState<number | null>(null);

  const moveToBag = async (product: Product) => {
    const variant = product.variants?.find((v) => v.stock > 0);
    if (!variant) {
      toast.error('Sold out in every size');
      return;
    }
    setBusy(product.id);
    try {
      await addToCart(product.id, 1, variant.id);
      if (products.some((saved) => saved.id === product.id)) await toggle(product);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-margin-mobile pb-space-3xl pt-space-lg sm:px-margin-tablet lg:px-margin-desktop">
      <div className="flex flex-wrap items-end justify-between gap-space-md">
        <div>
          <p className="eyebrow mb-space-2xs">Saved pieces</p>
          <h1 className="font-display text-headline-xl-mobile text-on-surface sm:text-headline-xl">Wishlist</h1>
        </div>
        {!authLoading && !listLoading && (
          <span className="rounded-full bg-surface-container px-space-md py-space-2xs text-label-caps uppercase tracking-wider text-primary">
            {count} {count === 1 ? 'piece' : 'pieces'}
          </span>
        )}
      </div>

      {authLoading || listLoading ? (
        <div className="mt-space-xl grid grid-cols-2 gap-space-md sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((key) => (
            <ProductCardSkeleton key={key} />
          ))}
        </div>
      ) : !user ? (
        <div className="mt-space-2xl">
          <EmptyState
            icon="favorite"
            title="Sign in to keep your list"
            body="Your saved pieces follow your account across devices, and we tell you when one is about to sell out."
            action={
              <Link to="/login" className="btn-primary">
                Sign in
              </Link>
            }
          />
        </div>
      ) : products.length === 0 ? (
        <div className="mt-space-2xl">
          <EmptyState
            icon="favorite"
            title="Nothing saved yet"
            body="Tap the heart on any piece to keep it here while you decide."
            action={
              <Link to="/products" className="btn-primary">
                Browse the collection
                <Icon name="arrow_forward" className="text-lg" />
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-space-xl grid grid-cols-2 gap-space-md sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={config.currency}
                lowStockThreshold={config.lowStockThreshold}
                showStock
                onQuickAdd={busy === product.id ? undefined : moveToBag}
              />
            ))}
          </div>
          <p className="mt-space-lg flex items-center justify-center gap-space-2xs text-body-sm text-on-surface-variant">
            <Icon name="info" className="text-base" />
            Moving a piece to your bag removes it from this list.
          </p>
        </>
      )}
    </div>
  );
}
