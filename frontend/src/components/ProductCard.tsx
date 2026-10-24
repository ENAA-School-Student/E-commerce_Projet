import { Link } from 'react-router-dom';
import clsx from 'clsx';
import Icon from './Icon';
import SmartImage from './SmartImage';
import { Chip, PriceTag, ProductBadge, Rating, StockPill } from './Primitives';
import { Product } from '@/types';
import { useWishlist } from '@/context/WishlistContext';

function uniqueColors(product: Product) {
  const seen = new Map<string, string | null>();
  product.variants?.forEach((v) => {
    if (v.color && !seen.has(v.color)) seen.set(v.color, v.colorHex ?? null);
  });
  return [...seen.entries()].slice(0, 4);
}

function totalStock(product: Product): number {
  return (product.variants ?? []).reduce((sum, v) => sum + (v.stock ?? 0), 0);
}

interface ProductCardProps {
  product: Product;
  currency?: string;
  lowStockThreshold?: number;
  variant?: 'grid' | 'mini' | 'row';
  showStock?: boolean;
  onQuickAdd?: (product: Product) => void;
  className?: string;
}

export default function ProductCard({
  product,
  currency,
  lowStockThreshold = 5,
  variant = 'grid',
  showStock = false,
  onQuickAdd,
  className,
}: ProductCardProps) {
  const { has, toggle } = useWishlist();
  const saved = has(product.id);
  const colors = uniqueColors(product);
  const href = `/product/${product.slug}`;
  const heart = (
    <button
      type="button"
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(product);
      }}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest/85 text-on-surface backdrop-blur-md transition-all active:scale-90 hover:bg-surface-container-lowest"
    >
      <Icon name="favorite" filled={saved} className={clsx('text-lg', saved && 'text-error')} />
    </button>
  );

  if (variant === 'mini') {
    return (
      <Link
        to={href}
        className={clsx('group flex items-center gap-space-sm rounded-xl p-space-xs transition-colors hover:bg-surface-container-low', className)}
      >
        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-container">
          <SmartImage
            src={product.images?.[0]?.imageUrl}
            alt={product.images?.[0]?.altText ?? product.name}
            monogram={product.name}
            className="h-full w-full"
            imgClassName="transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow truncate">{product.brand}</p>
          <h4 className="truncate text-body-md font-medium">{product.name}</h4>
          <PriceTag price={product.price} compareAt={product.compareAtPrice} currency={currency} size="sm" className="mt-space-2xs" />
        </div>
      </Link>
    );
  }

  if (variant === 'row') {
    return (
      <Link to={href} className={clsx('group flex gap-space-md rounded-xl p-space-xs transition-colors hover:bg-surface-container-low', className)}>
        <div className="relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-lg bg-surface-container">
          <SmartImage
            src={product.images?.[0]?.imageUrl}
            alt={product.name}
            monogram={product.name}
            className="h-full w-full"
            imgClassName="transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-space-2xs">
          <div>
            <p className="eyebrow">{product.brand}</p>
            <h4 className="mt-space-2xs font-medium text-body-md leading-snug">{product.name}</h4>
            {colors.length > 0 && (
              <div className="mt-space-xs flex items-center gap-space-2xs">
                {colors.map(([color, hex]) => (
                  <span key={color} title={color} className="h-3 w-3 rounded-full border border-outline-variant" style={{ backgroundColor: hex ?? '#e2e2e2' }} />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-end justify-between gap-space-sm">
            <PriceTag price={product.price} compareAt={product.compareAtPrice} currency={currency} size="sm" />
            {heart}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <article className={clsx('group relative', className)}>
      <Link to={href} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-container">
          <SmartImage
            src={product.images?.[0]?.imageUrl}
            alt={product.images?.[0]?.altText ?? product.name}
            monogram={product.name}
            className="h-full w-full"
            imgClassName="transition-transform duration-500 group-hover:scale-105"
          />

          {product.badge && (
            <ProductBadge label={product.badge} className="absolute left-space-sm top-space-sm backdrop-blur-md" />
          )}

          <div className="absolute right-space-sm top-space-sm opacity-0 transition-opacity group-hover:opacity-100 max-sm:opacity-100">
            {heart}
          </div>

          {showStock && (
            <div className="absolute bottom-space-sm left-space-sm">
              <StockPill stock={totalStock(product)} lowStockThreshold={lowStockThreshold} className="rounded-full bg-surface-container-lowest/85 px-space-sm py-space-2xs backdrop-blur-md" />
            </div>
          )}
        </div>

        <div className="pt-space-sm">
          <p className="eyebrow">{product.brand ?? product.categoryName}</p>
          <h4 className="mt-space-2xs text-body-md font-medium leading-snug text-on-surface transition-colors group-hover:text-primary">
            {product.name}
          </h4>
          <div className="mt-space-xs flex items-center justify-between gap-space-xs">
            <PriceTag price={product.price} compareAt={product.compareAtPrice} currency={currency} size="sm" />
            {product.reviewCount > 0 && <Rating value={product.averageRating} count={product.reviewCount} />}
          </div>
        </div>
      </Link>

      {onQuickAdd && (
        <button
          type="button"
          onClick={() => onQuickAdd(product)}
          className="absolute bottom-[4.75rem] left-space-sm right-space-sm flex translate-y-2 items-center justify-center gap-space-2xs rounded-lg bg-on-surface/90 py-space-sm text-label-sm font-medium text-inverse-on-surface opacity-0 backdrop-blur-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-sm:hidden"
        >
          <Icon name="add_shopping_cart" className="text-base" />
          Quick add
        </button>
      )}
    </article>
  );
}

export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('animate-pulse', className)}>
      <div className="aspect-[3/4] rounded-xl bg-surface-container" />
      <div className="mt-space-sm h-3 w-1/3 rounded bg-surface-container" />
      <div className="mt-space-2xs h-4 w-3/4 rounded bg-surface-container" />
    </div>
  );
}

export function ColorFilterRow({ colors }: { colors: [string, string | null][] }) {
  return (
    <div className="flex flex-wrap gap-space-xs">
      {colors.map(([label, hex]) => (
        <Chip key={label} tone="tag">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hex ?? '#e2e2e2' }} />
          {label}
        </Chip>
      ))}
    </div>
  );
}
