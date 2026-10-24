import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Icon from '@/components/Icon';
import { ProgressBar, Skeleton, StatusPill } from '@/components/Primitives';
import { admin as adminApi, orders as ordersApi } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { useAuth } from '@/context/AuthContext';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { AdminAnalytics, Order, Product } from '@/types';
import { formatCompact, formatMoney, relativeDate } from '@/lib/format';

const DIRECTIVES = [
  { icon: 'add', label: 'New release', body: 'Publish a piece to the salon', to: '/admin/products?new=1' },
  { icon: 'shelves', label: 'Inventory matrix', body: 'Catalogue, stock and pricing', to: '/admin/products' },
  { icon: 'support_agent', label: 'Client pipeline', body: 'Dispatch and status changes', to: '/admin/products' },
];

export default function AdminDashboardPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const config = useStoreConfig();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const [analyticsRes, productsRes] = await Promise.all([adminApi.analytics(30), adminApi.products(0, 60)]);
    setAnalytics(analyticsRes.data);
    setProducts(productsRes.data.content);
    setSyncedAt(new Date());
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      navigate('/', { replace: true });
      return;
    }
    load()
      .catch(() => toast.error('Could not load the executive suite'))
      .finally(() => setLoading(false));
  }, [authLoading, user, isAdmin, navigate, load]);

  const revenue = useMemo(() => {
    if (!analytics) return null;
    const entries = Object.entries(analytics.revenueByDay).slice(-7);
    if (!entries.length) return null;
    const max = Math.max(...entries.map(([, value]) => Number(value)), 1);
    const peak = entries.reduce((best, entry) => (Number(entry[1]) >= Number(best[1]) ? entry : best), entries[0]);
    return { entries, max, peak };
  }, [analytics]);

  const stockAlerts = useMemo(() => {
    const alerts: { product: Product; size: string; stock: number }[] = [];
    products.forEach((product) => {
      product.variants?.forEach((variant) => {
        if (variant.active && variant.stock <= config.lowStockThreshold) {
          alerts.push({ product, size: variant.size ?? 'One size', stock: variant.stock });
        }
      });
    });
    return alerts.sort((a, b) => a.stock - b.stock).slice(0, 5);
  }, [products, config.lowStockThreshold]);

  if (loading || !analytics) {
    return (
      <div className="mx-auto max-w-[1400px] px-margin-mobile py-space-xl sm:px-margin-tablet lg:px-margin-desktop">
        <Skeleton className="h-24 rounded-xl" />
        <div className="mt-space-lg grid grid-cols-2 gap-space-md lg:grid-cols-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="mt-space-lg h-80 rounded-xl" />
      </div>
    );
  }

  const kpis = [
    {
      label: 'Net revenue',
      value: formatMoney(analytics.totalRevenue, config.currency),
      note: `${analytics.totalOrders} orders · last 30 days`,
      icon: 'trending_up',
    },
    {
      label: 'Avg. order value',
      value: formatMoney(analytics.avgOrderValue, config.currency),
      note: 'Across captured orders',
      icon: 'payments',
    },
    {
      label: 'Clients',
      value: formatCompact(analytics.totalCustomers),
      note: `${analytics.deliveredOrders} delivered to date`,
      icon: 'groups',
    },
    {
      label: 'Pending dispatch',
      value: String(analytics.pendingOrders),
      note: `${analytics.processingOrders} in tailoring`,
      icon: 'inventory_2',
    },
  ];

  const exportLedger = async () => {
    const res = await ordersApi.list(0, 200);
    downloadCsv(
      `luxemart-orders-${new Date().toISOString().slice(0, 10)}.csv`,
      res.data.content.map((order: Order) => ({
        order_number: order.orderNumber,
        customer: order.customerName,
        status: order.status,
        payment: order.paymentStatus,
        items: order.items.length,
        subtotal: order.subtotal,
        shipping: order.shippingCost,
        tax: order.tax,
        total: order.total,
        created_at: order.createdAt,
      })),
    );
    toast.success(`${res.data.content.length} orders exported`);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-margin-mobile pb-space-3xl pt-space-lg sm:px-margin-tablet lg:px-margin-desktop">
      <header className="flex flex-wrap items-start justify-between gap-space-md border-b border-outline-variant/60 pb-space-lg">
        <div>
          <p className="eyebrow mb-space-2xs">Maison LUXEMART · Executive suite</p>
          <h1 className="font-display text-headline-xl-mobile text-on-surface sm:text-headline-xl">
            Performance &amp; operations
          </h1>
        </div>
        <div className="flex items-center gap-space-md">
          <span className="text-label-caps uppercase tracking-wider text-outline">
            Sync {syncedAt ? syncedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
          </span>
          <button
            type="button"
            onClick={() =>
              load()
                .then(() => toast.success('Metrics refreshed'))
                .catch(() => toast.error('Refresh failed'))
            }
            className="btn-tonal text-label-caps uppercase tracking-wider"
          >
            <Icon name="sync" className="text-lg" />
            Sync
          </button>
        </div>
      </header>

      {/* KPI grid */}
      <section className="mt-space-lg grid grid-cols-2 gap-space-md lg:grid-cols-4">
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className="flex flex-col justify-between gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-card"
          >
            <div className="flex items-center justify-between">
              <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">{kpi.label}</span>
              <Icon name={kpi.icon} className="text-lg text-primary" />
            </div>
            <div>
              <p className="font-display text-headline-lg tabular-nums text-on-surface">{kpi.value}</p>
              <p className="mt-space-2xs text-body-sm text-outline">{kpi.note}</p>
            </div>
          </article>
        ))}
      </section>

      <div className="mt-space-xl grid gap-space-xl lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-space-xl">
          {/* Revenue arc */}
          <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-card">
            <div className="flex items-baseline justify-between gap-space-md">
              <h2 className="font-display text-headline-md text-on-surface">Revenue arc</h2>
              {revenue && (
                <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">
                  Peak {formatMoney(Number(revenue.peak[1]), config.currency)}
                </span>
              )}
            </div>
            <div className="mt-space-lg flex h-48 items-end gap-space-sm">
              {revenue?.entries.map(([day, value]) => {
                const height = (Number(value) / revenue.max) * 100;
                const isPeak = day === revenue.peak[0];
                return (
                  <div key={day} className="flex h-full flex-1 flex-col justify-end gap-space-2xs">
                    <span
                      title={`${day}: ${formatMoney(Number(value), config.currency)}`}
                      style={{ height: `${Math.max(height, 2)}%` }}
                      className={clsx(
                        'w-full rounded-t transition-all duration-500',
                        isPeak ? 'bg-primary' : 'bg-primary-container/35 hover:bg-primary-container/60',
                      )}
                    />
                    <span
                      className={clsx(
                        'text-center text-label-caps uppercase tracking-wider',
                        isPeak ? 'text-primary' : 'text-outline',
                      )}
                    >
                      {new Date(day).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
              {!revenue && <p className="text-body-sm text-outline">No revenue recorded in this window.</p>}
            </div>
          </section>

          {/* Recent orders */}
          <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-card">
            <div className="flex items-center justify-between gap-space-md">
              <h2 className="font-display text-headline-md text-on-surface">Atelier orders</h2>
              <Link to="/admin/products" className="text-label-sm font-medium text-primary hover:underline">
                Manage dispatch
              </Link>
            </div>
            <ul className="mt-space-md flex flex-col divide-y divide-outline-variant/50">
              {analytics.recentOrders.slice(0, 6).map((order) => (
                <li key={order.orderNumber} className="flex items-center justify-between gap-space-md py-space-sm">
                  <span className="flex min-w-0 flex-col">
                    <span className="text-body-md font-medium text-on-surface">{order.orderNumber}</span>
                    <span className="truncate text-body-sm text-on-surface-variant">
                      {order.customerName} · {relativeDate(order.createdAt)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-space-md">
                    <StatusPill status={order.status} />
                    <span className="text-body-md font-medium tabular-nums">
                      {formatMoney(Number(order.total), config.currency)}
                    </span>
                  </span>
                </li>
              ))}
              {analytics.recentOrders.length === 0 && (
                <li className="py-space-md text-body-sm text-outline">No order captured in this window.</li>
              )}
            </ul>
          </section>

          {/* Top garments */}
          <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-card">
            <div className="flex items-baseline justify-between gap-space-md">
              <h2 className="font-display text-headline-md text-on-surface">Top garments</h2>
              <span className="text-label-caps uppercase tracking-wider text-outline">30-day leaderboard</span>
            </div>
            <ul className="mt-space-md flex flex-col gap-space-sm">
              {analytics.topProducts.slice(0, 5).map((product, index) => (
                <li key={product.id} className="flex items-center gap-space-md">
                  <span className="w-5 shrink-0 font-display text-headline-sm text-outline">{index + 1}</span>
                  <span className="h-12 w-10 shrink-0 overflow-hidden rounded bg-surface-container">
                    {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body-md font-medium text-on-surface">{product.name}</span>
                    <span className="text-body-sm text-on-surface-variant">{product.unitsSold} units sold</span>
                  </span>
                  <span className="shrink-0 text-body-md font-medium tabular-nums">
                    {formatMoney(Number(product.revenue), config.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-space-xl">
          <section className="rounded-xl bg-surface-container-low p-space-lg">
            <h2 className="font-display text-headline-sm text-on-surface">Department share</h2>
            <ul className="mt-space-md flex flex-col gap-space-md">
              {analytics.topCategories.map((category) => {
                const categoryRevenue = Number(category.revenue);
                const share = (categoryRevenue / Math.max(Number(analytics.totalRevenue), 1)) * 100;
                return (
                  <li key={category.categoryName} className="flex flex-col gap-space-2xs">
                    <span className="flex items-center justify-between text-body-sm">
                      <span className="font-medium text-on-surface">{category.categoryName}</span>
                      <span className="tabular-nums text-on-surface-variant">
                        {formatMoney(categoryRevenue, config.currency)}
                      </span>
                    </span>
                    <ProgressBar value={share} />
                    <span className="text-label-caps uppercase tracking-wider text-outline">
                      {category.orderCount} orders
                    </span>
                  </li>
                );
              })}
              {analytics.topCategories.length === 0 && (
                <li className="text-body-sm text-outline">No category has sold in this window.</li>
              )}
            </ul>
          </section>

          <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-card">
            <div className="flex items-center justify-between gap-space-md">
              <h2 className="font-display text-headline-sm text-on-surface">Stock alerts</h2>
              <span className="rounded-full bg-error-container px-space-xs py-[2px] text-label-caps uppercase tracking-wider text-on-error-container">
                {stockAlerts.length} critical
              </span>
            </div>
            <ul className="mt-space-md flex flex-col gap-space-sm">
              {stockAlerts.map((alert) => (
                <li key={`${alert.product.id}-${alert.size}`} className="flex items-start justify-between gap-space-md">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-body-md font-medium text-on-surface">{alert.product.name}</span>
                    <span className="text-body-sm text-on-surface-variant">{alert.size}</span>
                  </span>
                  <span
                    className={clsx(
                      'shrink-0 text-body-md font-semibold tabular-nums',
                      alert.stock === 0 ? 'text-error' : 'text-on-error-container',
                    )}
                  >
                    {alert.stock === 0 ? 'Sold out' : `${alert.stock} left`}
                  </span>
                </li>
              ))}
              {stockAlerts.length === 0 && (
                <li className="text-body-sm text-outline">Every size is comfortably in stock.</li>
              )}
            </ul>
          </section>

          <section className="rounded-xl bg-surface-container-low p-space-lg">
            <h2 className="font-display text-headline-sm text-on-surface">Executive directives</h2>
            <div className="mt-space-md flex flex-col gap-space-xs">
              {DIRECTIVES.map((directive) => (
                <Link
                  key={directive.label}
                  to={directive.to}
                  className="flex items-center gap-space-md rounded-lg bg-surface-container-lowest p-space-sm transition-colors hover:bg-surface-container-highest"
                >
                  <Icon name={directive.icon} className="text-xl text-primary" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-body-md font-medium text-on-surface">{directive.label}</span>
                    <span className="truncate text-body-sm text-on-surface-variant">{directive.body}</span>
                  </span>
                  <Icon name="chevron_right" className="text-xl text-outline" />
                </Link>
              ))}
              <button
                type="button"
                onClick={() => exportLedger().catch(() => toast.error('Export failed'))}
                className="flex items-center gap-space-md rounded-lg bg-surface-container-lowest p-space-sm text-left transition-colors hover:bg-surface-container-highest"
              >
                <Icon name="file_download" className="text-xl text-primary" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body-md font-medium text-on-surface">Export order ledger</span>
                  <span className="truncate text-body-sm text-on-surface-variant">CSV of the last 200 orders</span>
                </span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
