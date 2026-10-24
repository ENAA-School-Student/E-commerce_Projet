import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Icon from '@/components/Icon';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import { Chip, Eyebrow, ProgressBar } from '@/components/Primitives';
import { categories as categoriesApi, products as productsApi } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { Category, PageResponse, Product } from '@/types';

const SORTS: Record<string, string> = {
  featured: 'createdAt,desc',
  'price-asc': 'price,asc',
  'price-desc': 'price,desc',
  name: 'name,asc',
};

const PRICE_BANDS = [
  { label: 'Under 100', min: 0, max: 100 },
  { label: '100 — 200', min: 100, max: 200 },
  { label: 'Over 200', min: 200, max: undefined },
];

export default function ProductListingPage() {
  const [params, setParams] = useSearchParams();
  const config = useStoreConfig();
  const { addToCart } = useCart();

  const categorySlug = params.get('category') ?? '';
  const search = params.get('search') ?? '';
  const sort = params.get('sort') ?? 'featured';
  const bandIndex = params.get('band');

  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState<PageResponse<Product> | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);

  useEffect(() => {
    categoriesApi.list().then((res) => setCategories(res.data));
  }, []);

  const category = useMemo(
    () => categories.find((c) => c.slug === categorySlug),
    [categories, categorySlug],
  );
  const band = bandIndex === null || bandIndex === undefined ? null : PRICE_BANDS[Number(bandIndex)];

  const load = useCallback(
    async (next: number, replace: boolean) => {
      setLoading(true);
      try {
        const res = await productsApi.list({
          page: next,
          size: 12,
          sort: SORTS[sort] ?? SORTS.featured,
          categoryId: category?.id,
          search: search || undefined,
          minPrice: band?.min,
          maxPrice: band?.max,
        });
        setItems((prev) => (replace ? res.data.content : [...prev, ...res.data.content]));
        setPage(res.data);
      } finally {
        setLoading(false);
      }
    },
    [band?.max, band?.min, category?.id, search, sort],
  );

  useEffect(() => {
    setItems([]);
    load(0, true);
  }, [load]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [categorySlug, search, sort, bandIndex]);

  const visible = items.filter((product) => {
    const okSize = sizes.length === 0 || product.variants?.some((v) => v.size && sizes.includes(v.size));
    const okColor = colors.length === 0 || product.variants?.some((v) => v.color && colors.includes(v.color));
    return okSize && okColor;
  });

  const allSizes = useMemo(() => {
    const set = new Set<string>();
    items.forEach((p) => p.variants?.forEach((v) => v.size && set.add(v.size)));
    return [...set];
  }, [items]);

  const allColors = useMemo(() => {
    const map = new Map<string, string | null>();
    items.forEach((p) => p.variants?.forEach((v) => v.color && !map.has(v.color) && map.set(v.color, v.colorHex ?? null)));
    return [...map.entries()];
  }, [items]);

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    setParams(next);
  };

  const toggleIn = (list: string[], setter: (next: string[]) => void, value: string) =>
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  const quickAdd = async (product: Product) => {
    const variant = product.variants?.find((v) => v.stock > 0);
    if (!variant) {
      toast.error('Sold out in every size');
      return;
    }
    await addToCart(product.id, 1, variant.id);
  };

  const crumbs = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/products' },
    ...(category ? [{ label: category.name, to: '/products' }] : []),
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-margin-mobile sm:px-margin-tablet lg:px-margin-desktop">
      <nav aria-label="Breadcrumb" className="flex items-center gap-space-2xs py-space-md text-label-sm text-on-surface-variant">
        {crumbs.map((crumb, index) => {
          const current = index === crumbs.length - 1;
          return (
            <span key={crumb.label} className="flex items-center gap-space-2xs">
              {index > 0 && <Icon name="chevron_right" className="text-sm text-outline-variant" />}
              {current ? (
                <span className="text-on-surface">{crumb.label}</span>
              ) : (
                <Link to={crumb.to} className="transition-colors hover:text-primary">
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <header className="pb-space-md">
        <Eyebrow className="mb-space-2xs text-primary-container">Ready to wear</Eyebrow>
        <div className="flex items-end justify-between gap-space-md">
          <h1 className="font-display text-headline-xl-mobile sm:text-headline-xl">{category?.name ?? 'All pieces'}</h1>
          <span className="pb-2 text-label-sm text-on-surface-variant">{page?.totalElements ?? 0} references</span>
        </div>
        {category?.description && <p className="mt-space-xs max-w-xl text-body-md text-on-surface-variant">{category.description}</p>}
      </header>

      {/* Sticky control bar */}
      <div className="sticky top-16 z-30 -mx-margin-mobile border-y border-outline-variant/40 bg-surface/85 px-margin-mobile py-space-sm backdrop-blur-md sm:top-20 sm:mx-0 sm:rounded-xl sm:border sm:px-space-md sm:shadow-card lg:mx-0">
        <div className="no-scrollbar flex items-center gap-space-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="btn-tonal h-9 shrink-0 gap-space-2xs px-space-md text-label-sm sm:hidden"
          >
            <Icon name="tune" className="text-lg" />
            Filters
            {(sizes.length > 0 || colors.length > 0 || band) && (
              <span className="ml-space-2xs rounded-full bg-primary px-1.5 text-[10px] font-semibold text-on-primary">
                {sizes.length + colors.length + (band ? 1 : 0)}
              </span>
            )}
          </button>

          <Link
            to="/products"
            className={clsx('shrink-0', !categorySlug && !search ? 'text-primary' : 'text-on-surface-variant')}
          >
            <Chip selected={!categorySlug && !search} tone="segment">All</Chip>
          </Link>
          {categories
            .filter((c) => !c.parentId)
            .map((c) => (
              <Link key={c.id} to={`/products?category=${c.slug}`}>
                <Chip selected={c.slug === categorySlug} tone="segment" count={c.productCount}>
                  {c.name}
                </Chip>
              </Link>
            ))}

          <div className="ml-auto hidden shrink-0 items-center gap-space-xs sm:flex">
            <Icon name="swap_vert" className="text-lg text-outline" />
            <select
              value={sort}
              onChange={(event) => update('sort', event.target.value)}
              className="rounded-full border border-outline-variant bg-surface-container-lowest px-space-md py-space-xs text-label-sm outline-none focus:border-primary"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>

        {drawerOpen && (
          <div className="mt-space-md space-y-space-md border-t border-outline-variant/40 pt-space-md sm:hidden">
            <div>
              <p className="eyebrow mb-space-xs">Price</p>
              <div className="flex flex-wrap gap-space-xs">
                {PRICE_BANDS.map((priceBand, index) => (
                  <Chip
                    key={priceBand.label}
                    selected={String(index) === bandIndex}
                    onClick={() => update('band', String(index) === bandIndex ? null : String(index))}
                  >
                    {priceBand.label}
                  </Chip>
                ))}
              </div>
            </div>
            {allSizes.length > 0 && (
              <div>
                <p className="eyebrow mb-space-xs">Size</p>
                <div className="flex flex-wrap gap-space-xs">
                  {allSizes.map((size) => (
                    <Chip key={size} selected={sizes.includes(size)} onClick={() => toggleIn(sizes, setSizes, size)}>
                      {size}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            {allColors.length > 0 && (
              <div>
                <p className="eyebrow mb-space-xs">Colour</p>
                <div className="flex flex-wrap gap-space-xs">
                  {allColors.map(([label, hex]) => (
                    <Chip key={label} selected={colors.includes(label)} onClick={() => toggleIn(colors, setColors, label)}>
                      <span className="h-2.5 w-2.5 rounded-full border border-outline-variant" style={{ backgroundColor: hex ?? '#e2e2e2' }} />
                      {label}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setSizes([]);
                setColors([]);
              }}
              className="text-label-sm font-medium text-primary"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Desktop sidebar + grid */}
      <div className="flex gap-space-2xl py-space-xl">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-28 space-y-space-xl">
            <div>
              <h3 className="eyebrow mb-space-sm">Price</h3>
              <div className="space-y-space-xs">
                {PRICE_BANDS.map((bandItem, index) => (
                  <label key={bandItem.label} className="flex cursor-pointer items-center gap-space-sm text-body-md text-on-surface-variant hover:text-on-surface">
                    <input
                      type="radio"
                      checked={String(index) === bandIndex}
                      onChange={() => update('band', String(index))}
                      className="h-4 w-4 accent-primary"
                    />
                    {bandItem.label}
                  </label>
                ))}
                {bandIndex !== null && (
                  <button type="button" onClick={() => update('band', null)} className="text-label-sm text-primary">
                    Reset price
                  </button>
                )}
              </div>
            </div>
            {allSizes.length > 0 && (
              <div>
                <h3 className="eyebrow mb-space-sm">Size</h3>
                <div className="flex flex-wrap gap-space-xs">
                  {allSizes.map((size) => (
                    <Chip key={size} selected={sizes.includes(size)} onClick={() => toggleIn(sizes, setSizes, size)}>
                      {size}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            {allColors.length > 0 && (
              <div>
                <h3 className="eyebrow mb-space-sm">Colour</h3>
                <div className="flex flex-wrap gap-space-xs">
                  {allColors.map(([label, hex]) => (
                    <Chip key={label} selected={colors.includes(label)} onClick={() => toggleIn(colors, setColors, label)}>
                      <span className="h-2.5 w-2.5 rounded-full border border-outline-variant" style={{ backgroundColor: hex ?? '#e2e2e2' }} />
                      {label}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {loading && items.length === 0 ? (
            <div className="grid grid-cols-2 gap-space-sm lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((key) => (
                <ProductCardSkeleton key={key} />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-space-md rounded-2xl bg-surface-container-low px-space-lg py-space-3xl text-center">
              <Icon name="search_off" className="text-3xl text-outline" />
              <h3 className="font-display text-headline-md">Nothing matches yet</h3>
              <p className="max-w-sm text-body-md text-on-surface-variant">
                Try a wider price band, or clear the size and colour filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSizes([]);
                  setColors([]);
                  update('band', null);
                }}
                className="btn-primary"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <>
              <div className="mb-space-md flex items-center gap-space-md">
                <ProgressBar value={page ? (items.length / Math.max(page.totalElements, 1)) * 100 : 0} className="max-w-40" />
                <span className="text-label-sm text-on-surface-variant">
                  {visible.length} of {page?.totalElements ?? 0} shown
                </span>
              </div>
              <div className="grid grid-cols-2 gap-space-sm lg:grid-cols-3">
                {visible.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    currency={config.currency}
                    lowStockThreshold={config.lowStockThreshold}
                    showStock
                    onQuickAdd={quickAdd}
                  />
                ))}
              </div>
              {page && !page.last && (
                <div className="mt-space-xl flex justify-center">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => load(page.page + 1, false)}
                    className="btn-tonal min-w-48"
                  >
                    {loading ? 'Loading…' : `Load ${Math.min(page.size, page.totalElements - items.length)} more`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
