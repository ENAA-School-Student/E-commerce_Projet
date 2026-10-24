import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Icon from '@/components/Icon';
import { Chip, ProductBadge, Skeleton, StatusPill } from '@/components/Primitives';
import { admin as adminApi, categories as categoriesApi } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { useAuth } from '@/context/AuthContext';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { Category, Order, PageResponse, Product } from '@/types';
import { formatMoney } from '@/lib/format';

const ORDER_STATUSES: Order['status'][] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const BADGES = ['Bestseller', 'New', 'Limited', 'Sustainable'];

const SORTS = [
  { id: 'updatedAt,desc', label: 'Recently updated' },
  { id: 'price,desc', label: 'Value: high to low' },
  { id: 'price,asc', label: 'Value: low to high' },
  { id: 'name,asc', label: 'Name: A to Z' },
];

type VariantDraft = { size: string; color: string; colorHex: string; stock: number; sku: string };

type ImageDraft = { imageUrl: string; altText: string };

type ProductDraft = {
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  categoryId: number | null;
  brand: string;
  collection: string;
  badge: string;
  featured: boolean;
  active: boolean;
  variants: VariantDraft[];
  images: ImageDraft[];
};

const EMPTY_DRAFT: ProductDraft = {
  name: '',
  description: '',
  price: 0,
  compareAtPrice: null,
  categoryId: null,
  brand: '',
  collection: '',
  badge: '',
  featured: false,
  active: true,
  variants: [{ size: 'S', color: '', colorHex: '', stock: 0, sku: '' }],
  images: [{ imageUrl: '', altText: '' }],
};

function stockOf(product: Product) {
  return (product.variants ?? []).reduce((sum, variant) => sum + (variant.stock ?? 0), 0);
}

export default function AdminProductsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const config = useStoreConfig();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [pageData, setPageData] = useState<PageResponse<Product> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(SORTS[0].id);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      navigate('/', { replace: true });
      return;
    }
    categoriesApi.list().then((res) => setCategories(res.data)).catch(() => undefined);
    adminApi.orders(0, 8).then((res) => setOrders(res.data.content)).catch(() => undefined);
  }, [authLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (params.get('new') === '1' && !draft) {
      setDraft({ ...EMPTY_DRAFT, categoryId: categories[0]?.id ?? null });
      setParams({}, { replace: true });
    }
  }, [params, categories, draft, setParams]);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .products(page, 20, search || undefined)
      .then((res) => {
        setProducts(res.data.content);
        setPageData(res.data);
      })
      .catch(() => toast.error('Could not load the catalogue'))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const visible = useMemo(() => {
    let rows = products;
    if (categoryId !== null) rows = rows.filter((product) => product.categoryId === categoryId);
    if (lowStockOnly) {
      rows = rows.filter((product) =>
        product.variants?.some((variant) => variant.active && variant.stock <= config.lowStockThreshold),
      );
    }
    const [field, direction] = sort.split(',');
    if (field !== 'name' && field !== 'price') return rows;
    const factor = direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (field === 'name') return a.name.localeCompare(b.name) * factor;
      return (a.price - b.price) * factor;
    });
  }, [products, categoryId, lowStockOnly, sort, config.lowStockThreshold]);

  const lowStockCount = useMemo(
    () =>
      products.reduce(
        (sum, product) =>
          sum + (product.variants ?? []).filter((variant) => variant.active && variant.stock <= config.lowStockThreshold).length,
        0,
      ),
    [products, config.lowStockThreshold],
  );

  const catalogueValue = useMemo(
    () => products.reduce((sum, product) => sum + product.price * stockOf(product), 0),
    [products],
  );

  const awaitingDispatch = useMemo(
    () => orders.filter((order) => order.status === 'PENDING' || order.status === 'PROCESSING').length,
    [orders],
  );

  const openEditor = (product: Product) => {
    setEditingId(product.id);
    setDraft({
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? null,
      categoryId: product.categoryId ?? null,
      brand: product.brand ?? '',
      collection: product.collection ?? '',
      badge: product.badge ?? '',
      featured: product.featured,
      active: product.active,
      variants: (product.variants ?? []).map((variant) => ({
        size: variant.size ?? '',
        color: variant.color ?? '',
        colorHex: variant.colorHex ?? '',
        stock: variant.stock,
        sku: variant.sku ?? '',
      })),
      images: (product.images ?? []).map((image) => ({
        imageUrl: image.imageUrl ?? '',
        altText: image.altText ?? '',
      })),
    });
  };

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error('A piece needs a name');
      return;
    }
    const visuals = draft.images
      .filter((image) => image.imageUrl.trim())
      .map((image, index) => ({
        imageUrl: image.imageUrl.trim(),
        altText: image.altText.trim() || draft.name,
        isPrimary: index === 0,
        sortOrder: index,
      }));
    const payload = {
      name: draft.name,
      description: draft.description || null,
      price: draft.price,
      compareAtPrice: draft.compareAtPrice,
      categoryId: draft.categoryId,
      brand: draft.brand || null,
      collection: draft.collection || null,
      badge: draft.badge || null,
      featured: draft.featured,
      active: draft.active,
      variants: draft.variants.map((variant) => ({
        size: variant.size || null,
        color: variant.color || null,
        colorHex: variant.colorHex || null,
        stock: Number(variant.stock) || 0,
        sku: variant.sku || null,
        active: true,
      })),
      ...(visuals.length ? { images: visuals } : {}),
    };
    setSaving(true);
    try {
      if (editingId) {
        await adminApi.updateProduct(editingId, payload);
        toast.success('Piece updated');
      } else {
        await adminApi.createProduct(payload);
        toast.success('Piece published to the salon');
      }
      setDraft(null);
      setEditingId(null);
      load();
    } catch {
      toast.error('The atelier could not save this piece');
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (id: number) => {
    try {
      await adminApi.deleteProduct(id);
      toast.success('Piece removed from the salon');
      setConfirmDelete(null);
      load();
    } catch {
      toast.error('Could not remove this piece');
    }
  };

  const changeOrderStatus = async (orderId: number, status: string) => {
    try {
      const res = await adminApi.updateOrderStatus(orderId, status);
      setOrders((current) => current.map((order) => (order.id === orderId ? res.data : order)));
      toast.success(`Order marked ${status.toLowerCase()}`);
    } catch {
      toast.error('Status update failed');
    }
  };

  const exportCatalogue = () => {
    downloadCsv(
      `luxemart-catalogue-${new Date().toISOString().slice(0, 10)}.csv`,
      products.map((product) => ({
        ref: `LX-${product.id}`,
        name: product.name,
        category: product.categoryName ?? '',
        brand: product.brand ?? '',
        collection: product.collection ?? '',
        price: product.price,
        stock: stockOf(product),
        status: product.active ? 'active' : 'retired',
      })),
    );
  };

  return (
    <div className="mx-auto max-w-[1400px] px-margin-mobile pb-space-3xl pt-space-lg sm:px-margin-tablet lg:px-margin-desktop">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-space-md">
        <div>
          <Link
            to="/admin"
            className="eyebrow mb-space-2xs flex items-center gap-space-2xs hover:text-primary"
          >
            <Icon name="arrow_back_ios" className="text-sm" />
            Executive suite
          </Link>
          <h1 className="font-display text-headline-xl-mobile text-on-surface sm:text-headline-xl">
            Atelier operations
          </h1>
          <p className="mt-space-2xs text-body-sm text-on-surface-variant">
            Catalogue, inventory and client dispatch console
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setDraft({ ...EMPTY_DRAFT, categoryId: categories[0]?.id ?? null });
          }}
          className="btn-primary text-label-caps uppercase tracking-widest"
        >
          <Icon name="add" className="text-lg" />
          New piece
        </button>
      </header>

      {/* Stat strip */}
      <section className="mt-space-lg grid grid-cols-2 gap-space-md lg:grid-cols-4">
        {[
          { label: 'Live references', value: pageData ? String(pageData.totalElements) : '—', icon: 'checklist' },
          { label: 'Low stock sizes', value: String(lowStockCount), icon: 'inventory_2' },
          { label: 'Catalogue value', value: formatMoney(catalogueValue, config.currency), icon: 'query_stats' },
          { label: 'Awaiting dispatch', value: String(awaitingDispatch), icon: 'local_shipping' },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center justify-between gap-space-md rounded-xl bg-surface-container-low p-space-md">
            <span className="flex flex-col">
              <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">{stat.label}</span>
              <span className="mt-space-2xs font-display text-headline-md tabular-nums">{stat.value}</span>
            </span>
            <Icon name={stat.icon} className="text-xl text-primary" />
          </div>
        ))}
      </section>

      {/* Toolbar */}
      <section className="mt-space-xl flex flex-col gap-space-md">
        <div className="flex flex-wrap items-center gap-space-md">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPage(0);
              load();
            }}
            className="flex min-w-[220px] flex-1 items-center rounded-lg bg-surface-container-lowest shadow-sm focus-within:ring-1 focus-within:ring-primary"
          >
            <Icon name="search" className="px-space-sm text-xl text-outline" />
            <input
              className="w-full bg-transparent py-space-sm pr-space-sm text-body-md outline-none placeholder:text-outline"
              placeholder="Search the catalogue…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch('');
                  setPage(0);
                }}
                className="px-space-sm text-outline hover:text-on-surface"
              >
                <Icon name="close" className="text-lg" />
              </button>
            )}
          </form>
          <label className="flex items-center gap-space-xs">
            <span className="eyebrow">Sort</span>
            <select
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-space-sm py-space-sm text-body-md outline-none focus:border-primary"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              {SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setLowStockOnly((current) => !current)}
            className={clsx(
              'flex items-center gap-space-2xs rounded-lg px-space-md py-space-sm text-label-caps uppercase tracking-wider transition-colors',
              lowStockOnly ? 'bg-error-container text-on-error-container' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            <Icon name="warning" className="text-base" />
            Low stock {lowStockOnly && `(${lowStockCount})`}
          </button>
        </div>

        <div className="no-scrollbar -mx-margin-mobile flex gap-space-xs overflow-x-auto px-margin-mobile sm:mx-0 sm:px-0">
          <Chip selected={categoryId === null} onClick={() => setCategoryId(null)}>
            All departments
          </Chip>
          {categories.map((category) => (
            <Chip
              key={category.id}
              selected={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
              count={category.productCount}
            >
              {category.name}
            </Chip>
          ))}
        </div>
      </section>

      {/* Product rows */}
      <section className="mt-space-lg flex flex-col gap-space-xs">
        {loading ? (
          <>
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </>
        ) : visible.length === 0 ? (
          <div className="rounded-xl bg-surface-container-low p-space-2xl text-center text-body-md text-on-surface-variant">
            No reference matches this filter.
          </div>
        ) : (
          visible.map((product) => {
            const total = stockOf(product);
            return (
              <article
                key={product.id}
                className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-card sm:flex-row sm:items-center"
              >
                <Link to={`/product/${product.slug}`} className="flex min-w-0 flex-1 items-center gap-space-md">
                  <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded bg-surface-container">
                    {product.images?.[0]?.imageUrl ? (
                      <img src={product.images[0].imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                    {product.badge && (
                      <ProductBadge label={product.badge} className="absolute left-1 top-1 scale-90" />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-label-caps uppercase tracking-wider text-outline">
                      Ref LX-{product.id} · {product.categoryName ?? 'Unsorted'}
                    </span>
                    <span className="truncate text-headline-sm font-semibold text-on-surface">{product.name}</span>
                    <span className="truncate text-body-sm text-on-surface-variant">
                      {product.brand ?? 'LUXEMART Studio'} · {product.collection ?? 'Permanent edition'}
                    </span>
                  </span>
                </Link>

                <div className="flex flex-wrap items-center gap-space-sm sm:w-[260px] sm:justify-end">
                  <span className="text-body-lg font-medium tabular-nums">
                    {formatMoney(product.price, config.currency)}
                  </span>
                  <span className="flex flex-wrap items-center gap-space-2xs">
                    {(product.variants ?? []).slice(0, 5).map((variant) => (
                      <span
                        key={variant.id}
                        title={`${variant.size ?? 'One size'} · ${variant.stock} in stock`}
                        className={clsx(
                          'rounded px-space-2xs py-[2px] text-label-caps uppercase tracking-wider',
                          variant.stock === 0
                            ? 'bg-surface-container-highest text-outline line-through'
                            : variant.stock <= config.lowStockThreshold
                              ? 'bg-error-container text-on-error-container'
                              : 'bg-surface-container-low text-on-surface-variant',
                        )}
                      >
                        {variant.size ?? 'OS'} {variant.stock}
                      </span>
                    ))}
                  </span>
                  <span className="text-label-caps uppercase tracking-wider text-outline">{total} units</span>
                  <span
                    className={clsx(
                      'rounded-full px-space-xs py-[2px] text-label-caps uppercase tracking-wider',
                      product.active
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-surface-container-highest text-on-surface-variant',
                    )}
                  >
                    {product.active ? 'on floor' : 'retired'}
                  </span>
                </div>

                <div className="flex items-center gap-space-xs sm:justify-end">
                  <Link
                    to={`/product/${product.slug}`}
                    aria-label="View on the storefront"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                  >
                    <Icon name="visibility" className="text-lg" />
                  </Link>
                  <button
                    type="button"
                    aria-label="Edit this piece"
                    onClick={() => openEditor(product)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant transition-colors hover:bg-primary-container hover:text-on-primary-container"
                  >
                    <Icon name="edit" className="text-lg" />
                  </button>
                  {confirmDelete === product.id ? (
                    <span className="flex items-center gap-space-2xs">
                      <button
                        type="button"
                        onClick={() => removeProduct(product.id)}
                        className="rounded-lg bg-error px-space-sm py-space-2xs text-label-caps uppercase tracking-wider text-on-error"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="rounded-lg bg-surface-container px-space-sm py-space-2xs text-label-caps uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-label="Retire this piece"
                      onClick={() => setConfirmDelete(product.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
                    >
                      <Icon name="archive" className="text-lg" />
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* Pagination + export */}
      {pageData && (
        <footer className="mt-space-lg flex flex-wrap items-center justify-between gap-space-md border-t border-outline-variant/60 pt-space-md">
          <span className="text-body-sm text-on-surface-variant">
            Showing {visible.length} of {pageData.totalElements} active references
          </span>
          <div className="flex items-center gap-space-xs">
            <button type="button" onClick={exportCatalogue} className="btn-tonal text-label-caps uppercase tracking-wider">
              <Icon name="file_download" className="text-lg" />
              Export CSV
            </button>
            <button
              type="button"
              aria-label="Previous page"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low disabled:opacity-40"
            >
              <Icon name="chevron_left" className="text-lg" />
            </button>
            <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">
              {page + 1} / {Math.max(pageData.totalPages, 1)}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={pageData.last}
              onClick={() => setPage((current) => current + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low disabled:opacity-40"
            >
              <Icon name="chevron_right" className="text-lg" />
            </button>
          </div>
        </footer>
      )}

      {/* Dispatch pipeline */}
      <section className="mt-space-2xl">
        <div className="flex items-center justify-between gap-space-md">
          <h2 className="font-display text-headline-md text-on-surface">Client dispatch pipeline</h2>
          <span className="text-label-caps uppercase tracking-wider text-outline">Latest {orders.length} orders</span>
        </div>
        <ul className="mt-space-md flex flex-col gap-space-xs">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-card sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-space-xs">
                  <span className="text-body-md font-medium text-on-surface">{order.orderNumber}</span>
                  <StatusPill status={order.status} />
                </span>
                <span className="truncate text-body-sm text-on-surface-variant">
                  {order.customerName} · {order.items.length} {order.items.length === 1 ? 'piece' : 'pieces'} ·{' '}
                  {order.shippingAddress?.city ?? '—'}
                </span>
              </span>
              <span className="flex items-center gap-space-md">
                <span className="text-body-md font-medium tabular-nums">
                  {formatMoney(order.total, config.currency)}
                </span>
                <select
                  aria-label={`Change status for ${order.orderNumber}`}
                  value={order.status}
                  onChange={(event) => changeOrderStatus(order.id, event.target.value)}
                  className="rounded-lg border border-outline-variant bg-surface-container-lowest px-space-sm py-space-2xs text-label-caps uppercase tracking-wider outline-none focus:border-primary"
                >
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.toLowerCase()}
                    </option>
                  ))}
                </select>
              </span>
            </li>
          ))}
          {orders.length === 0 && (
            <li className="rounded-xl bg-surface-container-low p-space-lg text-center text-body-sm text-on-surface-variant">
              No order to dispatch yet.
            </li>
          )}
        </ul>
      </section>

      {/* Editor drawer */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/40 backdrop-blur-sm sm:items-center sm:p-space-lg">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-surface-container-lowest p-space-lg shadow-sticky-bar sm:max-w-3xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-space-md">
              <div>
                <p className="eyebrow mb-space-2xs">{editingId ? `Editing LX-${editingId}` : 'New release'}</p>
                <h2 className="font-display text-headline-md">
                  {editingId ? 'Update this piece' : 'Publish a piece to the salon'}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close editor"
                onClick={() => {
                  setDraft(null);
                  setEditingId(null);
                }}
                className="p-1 text-on-surface-variant transition-colors hover:text-error"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>

            <div className="mt-space-lg flex flex-col gap-space-md">
              <label className="flex flex-col gap-space-2xs">
                <span className="eyebrow">Name *</span>
                <input className="field" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </label>
              <label className="flex flex-col gap-space-2xs">
                <span className="eyebrow">Description</span>
                <textarea
                  className="field min-h-24 resize-y"
                  rows={3}
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </label>

              <div className="grid gap-space-md sm:grid-cols-3">
                <label className="flex flex-col gap-space-2xs">
                  <span className="eyebrow">Price *</span>
                  <input
                    className="field"
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.price}
                    onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })}
                  />
                </label>
                <label className="flex flex-col gap-space-2xs">
                  <span className="eyebrow">Compare at</span>
                  <input
                    className="field"
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.compareAtPrice ?? ''}
                    onChange={(event) =>
                      setDraft({ ...draft, compareAtPrice: event.target.value ? Number(event.target.value) : null })
                    }
                  />
                </label>
                <label className="flex flex-col gap-space-2xs">
                  <span className="eyebrow">Department</span>
                  <select
                    className="field"
                    value={draft.categoryId ?? ''}
                    onChange={(event) => setDraft({ ...draft, categoryId: event.target.value ? Number(event.target.value) : null })}
                  >
                    <option value="">Unsorted</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-space-md sm:grid-cols-3">
                <label className="flex flex-col gap-space-2xs">
                  <span className="eyebrow">Brand</span>
                  <input className="field" value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.target.value })} />
                </label>
                <label className="flex flex-col gap-space-2xs">
                  <span className="eyebrow">Collection</span>
                  <input
                    className="field"
                    value={draft.collection}
                    onChange={(event) => setDraft({ ...draft, collection: event.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-space-2xs">
                  <span className="eyebrow">Badge</span>
                  <select
                    className="field"
                    value={draft.badge}
                    onChange={(event) => setDraft({ ...draft, badge: event.target.value })}
                  >
                    <option value="">None</option>
                    {BADGES.map((badge) => (
                      <option key={badge} value={badge}>
                        {badge}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-space-lg">
                <label className="flex items-center gap-space-xs">
                  <input
                    type="checkbox"
                    checked={draft.featured}
                    onChange={(event) => setDraft({ ...draft, featured: event.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-body-sm">Featured on the front page</span>
                </label>
                <label className="flex items-center gap-space-xs">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-body-sm">Visible in the salon</span>
                </label>
              </div>

              {/* Variants */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">Sizes, colours and stock</span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        variants: [...draft.variants, { size: '', color: '', colorHex: '', stock: 0, sku: '' }],
                      })
                    }
                    className="flex items-center gap-space-2xs text-label-caps uppercase tracking-wider text-primary"
                  >
                    <Icon name="add" className="text-base" />
                    Add a size
                  </button>
                </div>
                <ul className="flex flex-col gap-space-xs">
                  {draft.variants.map((variant, index) => (
                    <li key={index} className="grid grid-cols-2 gap-space-xs sm:grid-cols-[1fr_1.2fr_auto_auto_auto]">
                      <input
                        className="field"
                        placeholder="Size"
                        value={variant.size}
                        onChange={(event) => {
                          const variants = [...draft.variants];
                          variants[index] = { ...variant, size: event.target.value };
                          setDraft({ ...draft, variants });
                        }}
                      />
                      <input
                        className="field"
                        placeholder="Colour"
                        value={variant.color}
                        onChange={(event) => {
                          const variants = [...draft.variants];
                          variants[index] = { ...variant, color: event.target.value };
                          setDraft({ ...draft, variants });
                        }}
                      />
                      <input
                        className="field w-16"
                        type="color"
                        aria-label="Colour hex"
                        value={variant.colorHex || '#d4c3a3'}
                        onChange={(event) => {
                          const variants = [...draft.variants];
                          variants[index] = { ...variant, colorHex: event.target.value };
                          setDraft({ ...draft, variants });
                        }}
                      />
                      <input
                        className="field w-20"
                        type="number"
                        min={0}
                        aria-label="Stock"
                        value={variant.stock}
                        onChange={(event) => {
                          const variants = [...draft.variants];
                          variants[index] = { ...variant, stock: Number(event.target.value) };
                          setDraft({ ...draft, variants });
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Remove this size"
                        onClick={() => setDraft({ ...draft, variants: draft.variants.filter((_, i) => i !== index) })}
                        className="flex items-center justify-center rounded-lg px-space-sm text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
                      >
                        <Icon name="delete" className="text-lg" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visuals */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">Visuals (image URLs)</span>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, images: [...draft.images, { imageUrl: '', altText: '' }] })}
                    className="flex items-center gap-space-2xs text-label-caps uppercase tracking-wider text-primary"
                  >
                    <Icon name="add" className="text-base" />
                    Add a visual
                  </button>
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  The catalogue stores image links, not files — paste a public URL (CDN, S3, Unsplash…). Leaving every
                  row empty keeps the current visuals untouched.
                </p>
                <ul className="flex flex-col gap-space-xs">
                  {draft.images.map((image, index) => (
                    <li key={index} className="flex items-center gap-space-xs">
                      <span className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                        {image.imageUrl ? (
                          <img src={image.imageUrl} alt="" className="h-full w-full object-cover object-top" />
                        ) : null}
                      </span>
                      <input
                        className="field flex-1"
                        placeholder={index === 0 ? 'Primary image URL' : 'Additional image URL'}
                        value={image.imageUrl}
                        onChange={(event) => {
                          const images = [...draft.images];
                          images[index] = { ...image, imageUrl: event.target.value };
                          setDraft({ ...draft, images });
                        }}
                      />
                      <input
                        className="field w-36"
                        placeholder="Alt text"
                        value={image.altText}
                        onChange={(event) => {
                          const images = [...draft.images];
                          images[index] = { ...image, altText: event.target.value };
                          setDraft({ ...draft, images });
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Remove this visual"
                        onClick={() => setDraft({ ...draft, images: draft.images.filter((_, i) => i !== index) })}
                        className="flex items-center justify-center rounded-lg px-space-sm text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
                      >
                        <Icon name="delete" className="text-lg" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-space-xs flex justify-end gap-space-xs border-t border-outline-variant/60 pt-space-md">
                <button
                  type="button"
                  onClick={() => {
                    setDraft(null);
                    setEditingId(null);
                  }}
                  className="btn-tonal"
                >
                  Cancel
                </button>
                <button type="button" onClick={saveDraft} disabled={saving} className="btn-primary">
                  <Icon name="check" className="text-lg" />
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Publish piece'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
