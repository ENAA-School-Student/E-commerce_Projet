import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Icon from '@/components/Icon';
import ProductCard from '@/components/ProductCard';
import SmartImage from '@/components/SmartImage';
import {
  Accordion,
  Chip,
  EmptyState,
  Eyebrow,
  PriceTag,
  ProductBadge,
  QtyStepper,
  Rating,
  Skeleton,
  StockPill,
  Swatch,
} from '@/components/Primitives';
import { products as productsApi, reviews as reviewsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { Product, ProductVariant, Review } from '@/types';
import { formatMoney, initials, relativeDate } from '@/lib/format';

const PILLARS = [
  { icon: 'local_shipping', label: 'Complimentary global shipping' },
  { icon: 'replay', label: '30-day white-glove returns' },
  { icon: 'eco', label: 'Carbon-neutral delivery' },
];

export default function ProductDetailPage() {
  const { slug = '' } = useParams();
  const config = useStoreConfig();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { has, toggle } = useWishlist();
  const { push: recordViewed } = useRecentlyViewed();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setLoading(true);
    setImageIndex(0);
    setQuantity(1);
    productsApi
      .bySlug(slug)
      .then((res) => {
        setProduct(res.data);
        recordViewed(res.data);
        const first = res.data.variants?.[0];
        setColor(first?.color ?? null);
        setSize(first?.size ?? null);
        return Promise.all([
          res.data.categoryId
            ? productsApi.list({ categoryId: res.data.categoryId, size: 6 }).then((r) =>
                r.data.content.filter((p: Product) => p.id !== res.data.id),
              )
            : Promise.resolve([]),
          reviewsApi.forProduct(res.data.id).then((r) => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
        ]);
      })
      .then(([relatedProducts, productReviews]) => {
        setRelated(relatedProducts.slice(0, 4));
        setReviews(productReviews as Review[]);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const images = useMemo(() => {
    if (!product) return [];
    const list = [...(product.images ?? [])].sort(
      (a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder,
    );
    return list.length > 0 ? list : [{ id: -1, imageUrl: '', altText: product.name, isPrimary: true, sortOrder: 0 }];
  }, [product]);

  const colorways = useMemo(() => {
    const map = new Map<string, string | null>();
    product?.variants?.forEach((variant) => {
      if (variant.color && !map.has(variant.color)) map.set(variant.color, variant.colorHex ?? null);
    });
    return [...map.entries()];
  }, [product]);

  const sizedVariants = useMemo(
    () => (product?.variants ?? []).filter((variant) => !color || variant.color === color),
    [product, color],
  );

  const activeVariant: ProductVariant | undefined = useMemo(
    () => sizedVariants.find((variant) => variant.size === size),
    [sizedVariants, size],
  );

  if (loading) {
    return (
      <div className="mx-auto grid max-w-[1400px] gap-space-2xl px-margin-mobile py-space-lg sm:px-margin-tablet lg:grid-cols-2 lg:px-margin-desktop">
        <Skeleton className="aspect-[3/4] rounded-2xl" />
        <div className="space-y-space-md">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-margin-mobile py-space-3xl">
        <EmptyState
          icon="image_not_supported"
          title="Piece not found"
          body="This reference may have left the atelier. Browse the current collection instead."
          action={
            <Link to="/products" className="btn-primary">
              Back to shop
            </Link>
          }
        />
      </div>
    );
  }

  const saved = has(product.id);
  const stock = activeVariant?.stock ?? 0;
  const points = Math.floor(product.price / 10);

  const submit = async () => {
    if (!activeVariant) {
      toast.error('Choose a colourway and size first');
      return;
    }
    await addToCart(product.id, quantity, activeVariant.id);
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    toast('Link copied', { icon: 'link' });
  };

  return (
    <div className="mx-auto max-w-[1400px] px-margin-mobile pb-space-4xl sm:px-margin-tablet lg:px-margin-desktop">
      <nav aria-label="Breadcrumb" className="flex items-center gap-space-2xs py-space-md text-label-sm text-on-surface-variant">
        <Link to="/" className="hover:text-primary">Home</Link>
        <Icon name="chevron_right" className="text-sm text-outline-variant" />
        <Link to={`/products?category=${product.categoryName?.toLowerCase() ?? ''}`} className="hover:text-primary">
          {product.categoryName ?? 'Shop'}
        </Link>
        <Icon name="chevron_right" className="text-sm text-outline-variant" />
        <span className="truncate text-on-surface">{product.name}</span>
      </nav>

      <div className="grid gap-space-2xl lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        {/* Gallery */}
        <section className="lg:sticky lg:top-28 lg:self-start">
          <div className="relative overflow-hidden rounded-2xl bg-surface-container-low">
            <div className="aspect-[3/4] w-full">
              <SmartImage
                key={images[imageIndex]?.imageUrl}
                src={images[imageIndex]?.imageUrl}
                alt={images[imageIndex]?.altText ?? product.name}
                monogram={product.name}
                eager
                className="h-full w-full bg-transparent"
                imgClassName="reveal"
              />
            </div>
            {product.badge && (
              <ProductBadge label={product.badge} className="absolute left-space-md top-space-md" />
            )}
            <button
              type="button"
              aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
              onClick={() => toggle(product)}
              className="absolute right-space-md top-space-md flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest/85 backdrop-blur-md transition-all active:scale-90"
            >
              <Icon name="favorite" filled={saved} className={clsx('text-xl', saved ? 'text-error' : 'text-on-surface')} />
            </button>
          </div>

          {images.length > 1 && (
            <div className="no-scrollbar mt-space-sm flex gap-space-xs overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  className={clsx(
                    'h-20 w-16 shrink-0 overflow-hidden rounded-lg ring-offset-2 ring-offset-surface transition-all',
                    index === imageIndex ? 'ring-2 ring-primary-container' : 'opacity-70 hover:opacity-100',
                  )}
                >
                  <SmartImage src={image.imageUrl} alt="" monogram={product.name} className="h-full w-full bg-transparent" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Purchase panel */}
        <section className="flex flex-col gap-space-md">
          <div>
            <div className="flex items-center justify-between gap-space-sm">
              <Eyebrow>{product.brand ?? 'LuxeMart Atelier'}</Eyebrow>
              {activeVariant?.sku && <span className="eyebrow text-outline">{activeVariant.sku}</span>}
            </div>
            <h1 className="mt-space-2xs font-display text-headline-lg lg:text-headline-xl-mobile">{product.name}</h1>
            <div className="mt-space-xs flex flex-wrap items-center gap-space-md">
              <PriceTag price={product.price} compareAt={product.compareAtPrice} currency={config.currency} size="lg" />
              <Rating value={product.averageRating} count={product.reviewCount} />
            </div>
            <p className="mt-space-xs text-label-sm text-on-surface-variant">
              Earn{' '}
              <strong className="font-medium text-on-surface">{points} loyalty points</strong> with this piece
            </p>
          </div>

          <div className="h-px w-full bg-surface-container-high" />

          {colorways.length > 0 && (
            <div>
              <div className="mb-space-sm flex items-center justify-between">
                <span className="eyebrow">
                  Colour: <span className="font-semibold text-on-surface">{color}</span>
                </span>
                <span className="eyebrow text-[10px] text-primary">{product.collection}</span>
              </div>
              <div className="flex items-center gap-space-sm">
                {colorways.map(([label, hex]) => (
                  <Swatch
                    key={label}
                    color={label}
                    hex={hex ?? undefined}
                    selected={label === color}
                    onClick={() => {
                      setColor(label);
                      const firstForColor = (product.variants ?? []).find((variant) => variant.color === label);
                      setSize(firstForColor?.size ?? null);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {sizedVariants.length > 0 && (
            <div>
              <div className="mb-space-sm flex items-center justify-between">
                <span className="eyebrow">
                  Size: <span className="font-semibold text-on-surface">{size ?? '—'}</span>
                </span>
                <span className="eyebrow text-[10px] text-outline">Stock shown per size</span>
              </div>
              <div className="grid grid-cols-4 gap-space-xs sm:grid-cols-5">
                {sizedVariants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={!variant.active}
                    onClick={() => setSize(variant.size ?? null)}
                    className={clsx(
                      'rounded-lg py-3 text-label-caps uppercase tracking-widest transition-all',
                      variant.size === size
                        ? 'bg-primary-container text-on-primary shadow-sm'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high',
                      variant.stock === 0 && 'line-through opacity-50',
                    )}
                  >
                    {variant.size ?? 'One size'}
                  </button>
                ))}
              </div>
              {activeVariant && (
                <div className="mt-space-sm flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-sm">
                  <StockPill
                    stock={activeVariant.stock}
                    lowStockThreshold={config.lowStockThreshold}
                    size={activeVariant.size ?? undefined}
                  />
                  {activeVariant.stock > 0 && activeVariant.stock <= config.lowStockThreshold && (
                    <span className="text-body-sm text-on-surface-variant">Ships within 48 hours</span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-sm">
              <QtyStepper value={quantity} onChange={setQuantity} max={Math.max(stock || 1, 1)} />
              <button type="button" onClick={submit} className="btn-primary h-14 flex-1 justify-center text-body-md">
                <Icon name="shopping_bag" className="text-xl" />
                Add to bag — {formatMoney(product.price * quantity, config.currency)}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-space-sm">
              <button
                type="button"
                onClick={() => toggle(product)}
                className={clsx('flex h-11 items-center justify-center gap-space-xs rounded-lg text-label-caps uppercase tracking-wider transition-colors', saved ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-low hover:bg-surface-container text-on-surface')}
              >
                <Icon name="favorite" filled={saved} className={clsx('text-lg', saved && 'text-error')} />
                {saved ? 'Saved' : 'Save'}
              </button>
              <button
                type="button"
                onClick={share}
                className="flex h-11 items-center justify-center gap-space-xs rounded-lg bg-surface-container-low text-label-caps uppercase tracking-wider text-on-surface transition-colors hover:bg-surface-container"
              >
                <Icon name="share" className="text-lg" />
                Share look
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-space-xs text-center">
            {PILLARS.map((pillar) => (
              <div key={pillar.label} className="flex flex-col items-center gap-space-2xs bg-surface-container-low p-space-sm">
                <Icon name={pillar.icon} className="text-xl text-primary" />
                <span className="text-label-caps uppercase leading-tight text-on-surface">{pillar.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-space-md">
            <Accordion title="Description & silhouette" defaultOpen>
              <p>{product.description ?? 'A considered piece from the current LuxeMart collection.'}</p>
              <ul className="mt-space-sm grid gap-space-xs sm:grid-cols-2">
                {(product.variants ?? [])
                  .filter((variant, index, all) => all.findIndex((v) => v.color === variant.color) === index)
                  .map((variant) => (
                    <li key={variant.id} className="flex items-center gap-space-sm text-body-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-container" />
                      {variant.color}
                      {variant.colorHex ? ` · ${variant.colorHex}` : ''}
                    </li>
                  ))}
              </ul>
            </Accordion>
            <Accordion title="Fabrication & atelier notes">
              <p>
                {product.collection ? `${product.collection} — ` : ''}cut and finished in limited runs. Each reference is
                numbered and stocked per colourway, so restocks follow atelier capacity rather than demand.
              </p>
            </Accordion>
            <Accordion title="Shipping & returns">
              <p>
                Complimentary shipping above {formatMoney(config.freeShippingThreshold, config.currency)}; otherwise{' '}
                {formatMoney(config.shippingCost, config.currency)}. Returns accepted within 30 days of delivery.
              </p>
            </Accordion>
          </div>

          {reviews.length > 0 && (
            <div className="mt-space-lg">
              <div className="mb-space-md flex items-end justify-between">
                <div>
                  <Eyebrow className="mb-space-2xs">Client notes</Eyebrow>
                  <h2 className="font-display text-headline-md">Reviews</h2>
                </div>
                <Rating value={product.averageRating} count={product.reviewCount} />
              </div>
              <ul className="space-y-space-md">
                {reviews.slice(0, 4).map((review) => (
                  <li key={review.id} className="rounded-xl bg-surface-container-low p-space-md">
                    <div className="flex items-center justify-between gap-space-sm">
                      <div className="flex items-center gap-space-sm">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-highest text-label-sm font-medium text-on-surface-variant">
                          {initials(review.userFirstName, review.userLastName)}
                        </span>
                        <div>
                          <p className="text-label-sm font-medium text-on-surface">
                            {review.userFirstName} {review.userLastName?.[0]}.
                          </p>
                          <p className="text-[11px] text-outline">
                            {review.verified ? 'Verified purchase · ' : ''}
                            {relativeDate(review.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Rating value={review.rating} />
                    </div>
                    {review.title && <h3 className="mt-space-sm text-body-md font-semibold">{review.title}</h3>}
                    {review.comment && <p className="mt-space-2xs text-body-md text-on-surface-variant">{review.comment}</p>}
                  </li>
                ))}
              </ul>
              {user ? (
                <WriteReview productId={product.id} onPosted={(review) => setReviews((prev) => [review, ...prev])} />
              ) : (
                <Link to="/login" className="btn-tonal mt-space-md w-full justify-center">
                  Sign in to write a review
                </Link>
              )}
            </div>
          )}
          {reviews.length === 0 && user && (
            <div className="mt-space-lg">
              <Eyebrow className="mb-space-sm">Client notes</Eyebrow>
              <WriteReview productId={product.id} onPosted={(review) => setReviews([review])} />
            </div>
          )}
        </section>
      </div>

      {related.length > 0 && (
        <section className="mt-space-3xl">
          <Eyebrow className="mb-space-2xs">Complete the look</Eyebrow>
          <h2 className="mb-space-md font-display text-headline-md">From the same house</h2>
          <div className="no-scrollbar -mx-margin-mobile flex snap-x snap-mandatory gap-space-sm overflow-x-auto px-margin-mobile pb-space-xs sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-space-lg sm:overflow-visible sm:px-0">
            {related.map((item) => (
              <div key={item.id} className="w-[200px] shrink-0 snap-start sm:w-auto sm:shrink">
                <ProductCard product={item} currency={config.currency} lowStockThreshold={config.lowStockThreshold} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mobile sticky purchase bar */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-outline-variant/50 bg-surface-container-lowest/95 px-margin-mobile py-space-sm backdrop-blur-md shadow-sticky-bar sm:hidden">
        <div className="flex items-center justify-between gap-space-md">
          <div>
            <p className="eyebrow">{product.name}</p>
            <p className="text-body-md font-semibold">{formatMoney(product.price * quantity, config.currency)}</p>
          </div>
          <button type="button" onClick={submit} className="btn-primary bg-primary-container text-on-primary-container">
            Add to bag
          </button>
        </div>
      </div>
    </div>
  );
}

function WriteReview({ productId, onPosted }: { productId: number; onPosted: (review: Review) => void }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const post = async () => {
    setSaving(true);
    try {
      const res = await reviewsApi.add(productId, { rating, title: title || undefined, comment: comment || undefined });
      onPosted(res.data);
      setTitle('');
      setComment('');
      setOpen(false);
      toast.success('Thank you for the note');
    } catch {
      toast.error('Could not save the review');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-tonal mt-space-md w-full justify-center">
        <Icon name="rate_review" className="text-lg" />
        Write a review
      </button>
    );
  }

  return (
    <div className="mt-space-md space-y-space-sm rounded-xl bg-surface-container-low p-space-md">
      <div className="flex items-center gap-space-xs">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} stars`}>
            <Icon name="star" filled={value <= rating} className={clsx('text-xl', value <= rating ? 'text-primary' : 'text-outline-variant')} />
          </button>
        ))}
      </div>
      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Headline" className="field" />
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="How does it wear?"
        rows={3}
        className="field resize-none"
      />
      <div className="flex gap-space-sm">
        <button type="button" onClick={post} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Posting…' : 'Post review'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-tonal">
          Cancel
        </button>
      </div>
    </div>
  );
}
