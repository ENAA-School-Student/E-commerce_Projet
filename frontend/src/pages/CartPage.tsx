import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Icon from '@/components/Icon';
import { EmptyState, ProgressBar, QtyStepper, Skeleton } from '@/components/Primitives';
import { ProductCardSkeleton } from '@/components/ProductCard';
import { products as productsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { Product } from '@/types';
import { formatMoney } from '@/lib/format';

export default function CartPage() {
  const { user } = useAuth();
  const { cart, loading: cartLoading, updateQuantity, removeFromCart, addToCart } = useCart();
  const config = useStoreConfig();
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;

  useEffect(() => {
    productsApi
      .featured(0, 6)
      .then((res) => setSuggestions(res.data.content))
      .finally(() => setLoadingSuggestions(false));
  }, []);

  const { shipping, tax, total } = useMemo(() => {
    const shippingCost = subtotal >= config.freeShippingThreshold ? 0 : config.shippingCost;
    const tax = Number((subtotal * config.taxRate).toFixed(2));
    return { shipping: shippingCost, tax, total: subtotal + shippingCost + tax };
  }, [subtotal, config]);

  const remainingForFreeShipping = Math.max(0, config.freeShippingThreshold - subtotal);
  const progress = (subtotal / config.freeShippingThreshold) * 100;

  const quickAdd = async (product: Product) => {
    const variant = product.variants?.find((v) => v.stock > 0);
    if (!variant) {
      toast.error('Sold out in every size');
      return;
    }
    await addToCart(product.id, 1, variant.id);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-margin-mobile pb-space-3xl sm:px-margin-tablet lg:px-margin-desktop">
      {/* Context header */}
      <div className="flex flex-col gap-space-2xs pt-space-lg">
        <nav className="flex items-center gap-space-xs text-label-caps uppercase tracking-widest text-on-surface-variant">
          <Link to="/" className="transition-colors hover:text-primary">Home</Link>
          <span>/</span>
          <span className="font-semibold text-on-surface">Bag</span>
        </nav>
        <div className="mt-space-2xs flex items-baseline justify-between gap-space-md">
          <h1 className="font-display text-headline-xl-mobile text-on-surface sm:text-headline-lg">Shopping bag</h1>
          <span className="rounded-full bg-surface-container px-space-md py-space-2xs text-label-caps uppercase tracking-wider text-primary">
            {items.length} {items.length === 1 ? 'piece' : 'pieces'}
          </span>
        </div>
      </div>

      {/* Free shipping tier */}
      <div className="mt-space-lg flex flex-col gap-space-2xs rounded-xl bg-surface-container-low p-space-md sm:flex-row sm:items-center sm:justify-between sm:gap-space-xl">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-space-md text-on-surface">
            <span className="flex items-center gap-space-xs text-label-sm font-medium">
              <Icon name="local_shipping" className="text-lg text-primary" />
              Complimentary express shipping
            </span>
            <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">
              {remainingForFreeShipping === 0 ? 'Unlocked' : `${formatMoney(remainingForFreeShipping, config.currency)} to go`}
            </span>
          </div>
          <ProgressBar className="mt-space-xs bg-surface-container-highest" value={progress} />
          <p className="mt-space-2xs text-body-sm text-on-surface-variant">
            {remainingForFreeShipping === 0
              ? 'Your order qualifies for priority door-to-door dispatch.'
              : `Spend ${formatMoney(remainingForFreeShipping, config.currency)} more to unlock carbon-neutral delivery.`}
          </p>
        </div>
      </div>

      {cartLoading && !cart ? (
        <div className="mt-space-lg flex flex-col gap-space-sm">
          {[1, 2].map((key) => (
            <Skeleton key={key} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-space-2xl">
          <EmptyState
            icon="shopping_bag"
            title="Your bag is empty"
            body={
              user
                ? 'Nothing is waiting for you yet. Every piece below is cut in small batches and restocked twice a season.'
                : 'Sign in to keep the pieces you select across devices.'
            }
            action={
              user ? (
                <Link to="/products" className="btn-primary">
                  Browse the collection
                  <Icon name="arrow_forward" className="text-lg" />
                </Link>
              ) : (
                <Link to="/login" className="btn-primary">
                  Sign in
                </Link>
              )
            }
          />
        </div>
      ) : (
        <div className="mt-space-lg grid gap-space-xl lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-space-2xl">
          {/* Line items */}
          <div className="flex flex-col gap-space-sm">
            {items.map((item) => (
              <article
                key={item.id}
                className="flex gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-card"
              >
                <Link
                  to={`/product/${item.productSlug}`}
                  className="h-32 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-container"
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover object-top" />
                  ) : null}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-space-sm">
                  <div>
                    <div className="flex items-start justify-between gap-space-xs">
                      <Link
                        to={`/product/${item.productSlug}`}
                        className="truncate text-headline-sm font-semibold text-on-surface transition-colors hover:text-primary"
                      >
                        {item.productName}
                      </Link>
                      <button
                        type="button"
                        aria-label={`Remove ${item.productName}`}
                        onClick={() => removeFromCart(item.id)}
                        className="shrink-0 p-1 text-on-surface-variant transition-colors hover:text-error"
                      >
                        <Icon name="close" className="text-lg" />
                      </button>
                    </div>
                    <p className="mt-space-2xs text-body-sm text-on-surface-variant">
                      {[item.color, item.size].filter(Boolean).join(' · ') || 'One size'}
                    </p>
                  </div>
                  <div className="flex items-end justify-between gap-space-md">
                    <span className="text-body-lg font-medium tabular-nums text-on-surface">
                      {formatMoney(item.lineTotal, config.currency)}
                    </span>
                    <QtyStepper
                      compact
                      value={item.quantity}
                      min={1}
                      onChange={(next) => updateQuantity(item.id, next)}
                    />
                  </div>
                </div>
              </article>
            ))}
            <Link
              to="/products"
              className="mt-space-xs flex items-center gap-space-2xs text-label-sm font-medium text-primary transition-colors hover:gap-space-xs"
            >
              <Icon name="arrow_back" className="text-base" />
              Continue shopping
            </Link>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-28">
            <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-low p-space-lg">
              <h2 className="text-label-caps uppercase tracking-widest text-on-surface-variant">Order summary</h2>
              <dl className="flex flex-col gap-space-xs text-body-md">
                <div className="flex items-center justify-between">
                  <dt className="text-on-surface-variant">Merchandise subtotal</dt>
                  <dd className="tabular-nums text-on-surface">{formatMoney(subtotal, config.currency)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-on-surface-variant">Delivery</dt>
                  <dd className="tabular-nums text-on-surface">
                    {shipping === 0 ? 'Complimentary' : formatMoney(shipping, config.currency)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-on-surface-variant">
                    Estimated duties &amp; taxes ({Math.round(config.taxRate * 100)}%)
                  </dt>
                  <dd className="tabular-nums text-on-surface">{formatMoney(tax, config.currency)}</dd>
                </div>
              </dl>
              <div className="h-px bg-surface-container-highest" />
              <div className="flex items-baseline justify-between">
                <span className="text-headline-sm font-semibold">Total</span>
                <span className="font-display text-headline-md tabular-nums">{formatMoney(total, config.currency)}</span>
              </div>
              <Link
                to="/checkout"
                className="btn-primary h-14 w-full justify-center rounded-xl text-label-caps uppercase tracking-widest"
              >
                <Icon name="lock" className="text-lg" />
                Proceed to secure checkout
              </Link>
              <div className="grid grid-cols-3 gap-space-2xs pt-space-2xs text-center">
                {[
                  { icon: 'restart_alt', label: '30-day returns' },
                  { icon: 'verified_user', label: 'Encrypted payment' },
                  { icon: 'eco', label: 'Carbon-neutral dispatch' },
                ].map((pillar) => (
                  <div key={pillar.label} className="flex flex-col items-center gap-space-2xs">
                    <Icon name={pillar.icon} className="text-lg text-tertiary" />
                    <span className="text-label-caps uppercase leading-tight tracking-wider text-on-surface-variant">
                      {pillar.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Complementary pieces */}
      <section className="mt-space-3xl">
        <div className="mb-space-lg flex items-baseline justify-between gap-space-md">
          <h2 className="font-display text-headline-md text-on-surface">Complementary pieces</h2>
          <span className="text-label-caps uppercase tracking-widest text-tertiary">Selected style</span>
        </div>
        <div className="grid grid-cols-2 gap-space-md sm:grid-cols-3 lg:grid-cols-4">
          {loadingSuggestions
            ? Array.from({ length: 4 }).map((_, index) => <ProductCardSkeleton key={index} />)
            : suggestions
                .filter((product) => !items.some((item) => item.productId === product.id))
                .slice(0, 4)
                .map((product) => (
                  <article key={product.id} className="group flex flex-col justify-between rounded-xl bg-surface-container-lowest p-space-xs shadow-card">
                    <Link to={`/product/${product.slug}`} className="relative aspect-[3/4] overflow-hidden rounded-lg bg-surface-container">
                      {product.images?.[0]?.imageUrl ? (
                        <img
                          src={product.images[0].imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Add ${product.name} to bag`}
                        onClick={() => quickAdd(product)}
                        className={clsx(
                          'absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-lowest/90 text-on-surface shadow-sm backdrop-blur-md transition-colors hover:bg-primary-container hover:text-on-primary',
                          !user && 'hidden',
                        )}
                      >
                        <Icon name="add" className="text-lg" />
                      </button>
                    </Link>
                    <div className="flex flex-col pt-space-xs">
                      <span className="text-label-caps uppercase tracking-wider text-tertiary">
                        {product.categoryName ?? 'Atelier'}
                      </span>
                      <Link to={`/product/${product.slug}`} className="truncate text-headline-sm font-semibold text-on-surface">
                        {product.name}
                      </Link>
                      <span className="mt-space-2xs text-body-sm font-semibold tabular-nums">
                        {formatMoney(product.price, config.currency)}
                      </span>
                    </div>
                  </article>
                ))}
        </div>
      </section>
    </div>
  );
}
