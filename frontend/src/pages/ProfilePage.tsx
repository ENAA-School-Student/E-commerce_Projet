import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Icon from '@/components/Icon';
import { Chip, EmptyState, Skeleton, StepBar } from '@/components/Primitives';
import { orders as ordersApi, users as usersApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { Address, Order } from '@/types';
import { formatMoney, initials, relativeDate } from '@/lib/format';

const ORDER_STEPS = ['Ordered', 'In tailoring', 'Dispatched', 'Delivered'];
const STEP_INDEX: Record<Order['status'], number> = {
  PENDING: 0,
  PROCESSING: 1,
  SHIPPED: 2,
  DELIVERED: 3,
  CANCELLED: 0,
};

const FILTERS = [
  { id: 'all', label: 'All orders' },
  { id: 'progress', label: 'In progress' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

const STATUS_STYLES: Record<Order['status'], string> = {
  PENDING: 'bg-secondary-container text-on-secondary-container',
  PROCESSING: 'bg-primary/10 text-primary',
  SHIPPED: 'bg-tertiary-container text-on-surface',
  DELIVERED: 'bg-primary-container text-on-primary-container',
  CANCELLED: 'bg-error-container text-on-error-container',
};

export default function ProfilePage() {
  const { user, isAdmin, logout, refreshUser, loading: authLoading } = useAuth();
  const { count: wishlistCount } = useWishlist();
  const config = useStoreConfig();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [panel, setPanel] = useState<'details' | 'addresses' | 'security' | null>('details');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    Promise.all([
      ordersApi.list(0, 50).then((res) => setOrders(res.data.content)),
      usersApi.addresses().then((res) => setAddresses(res.data)),
    ])
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [authLoading, user, navigate]);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED'),
    [orders],
  );

  const visibleOrders = useMemo(() => {
    if (filter === 'progress') return activeOrders;
    if (filter === 'delivered') return orders.filter((order) => order.status === 'DELIVERED');
    if (filter === 'cancelled') return orders.filter((order) => order.status === 'CANCELLED');
    return orders;
  }, [orders, activeOrders, filter]);

  if (!user || authLoading) return null;

  return (
    <div className="mx-auto max-w-[1400px] px-margin-mobile pb-space-3xl sm:px-margin-tablet lg:px-margin-desktop">
      <div className="grid gap-space-2xl lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Identity column */}
        <aside className="flex flex-col gap-space-lg pt-space-lg lg:sticky lg:top-28">
          <div className="flex flex-col gap-space-md rounded-2xl bg-surface-container-low p-space-lg">
            <div className="flex items-center gap-space-md">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-container text-headline-sm font-semibold text-on-primary-container">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(user.firstName, user.lastName)
                )}
              </span>
              <div className="min-w-0">
                <h1 className="truncate font-display text-headline-md text-on-surface">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="truncate text-body-sm text-on-surface-variant">{user.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-space-xs">
              <span className="rounded-full bg-surface-container-high px-space-md py-space-2xs text-label-caps uppercase tracking-wider text-on-surface-variant">
                Client #{String(user.id).padStart(6, '0')}
              </span>
              <span className="flex items-center gap-space-2xs rounded-full bg-secondary-container px-space-md py-space-2xs text-label-caps uppercase tracking-wider text-on-secondary-container">
                <Icon name="auto_awesome" className="text-sm" />
                {user.loyaltyPoints.toLocaleString('en-US')} points
              </span>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
            </p>
            <div className="grid grid-cols-3 gap-space-xs border-t border-surface-container-highest pt-space-md text-center">
              {[
                { label: 'Active', value: activeOrders.length },
                { label: 'Wishlist', value: wishlistCount },
                { label: 'Orders', value: orders.length },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <span className="font-display text-headline-sm text-on-surface">{stat.value}</span>
                  <span className="text-label-caps uppercase tracking-wider text-outline">{stat.label}</span>
                </div>
              ))}
            </div>
            {isAdmin && (
              <Link to="/admin" className="btn-inverse w-full justify-center text-label-caps uppercase tracking-widest">
                <Icon name="tune" className="text-lg" />
                Atelier console
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="flex items-center justify-center gap-space-2xs py-space-xs text-label-caps uppercase tracking-wider text-on-surface-variant transition-colors hover:text-error"
            >
              <Icon name="logout" className="text-lg" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex flex-col gap-space-2xl pt-space-lg">
          {/* Current dispatch */}
          {loading ? (
            <Skeleton className="h-56 rounded-2xl" />
          ) : activeOrders.length > 0 ? (
            <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-card">
              <div className="flex items-center justify-between gap-space-md">
                <h2 className="font-display text-headline-sm text-on-surface">Active dispatch</h2>
                <span className="flex items-center gap-space-2xs text-label-caps uppercase tracking-wider text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {activeOrders.length} in progress
                </span>
              </div>
              {activeOrders.slice(0, 2).map((order) => (
                <div key={order.id} className="flex flex-col gap-space-sm border-t border-outline-variant/50 pt-space-md">
                  <div className="flex flex-wrap items-center justify-between gap-space-xs">
                    <div className="flex items-center gap-space-sm">
                      <span className="flex -space-x-3">
                        {order.items.slice(0, 3).map((item) => (
                          <span key={item.id} className="h-11 w-9 shrink-0 overflow-hidden rounded bg-surface-container">
                            {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                          </span>
                        ))}
                      </span>
                      <span className="flex flex-col">
                        <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">
                          {order.orderNumber}
                        </span>
                        <span className="text-body-sm text-on-surface">
                          {order.items[0]?.productName}
                          {order.items.length > 1 ? ` + ${order.items.length - 1} more` : ''}
                        </span>
                      </span>
                    </div>
                    <span className="text-headline-sm font-semibold tabular-nums">
                      {formatMoney(order.total, config.currency)}
                    </span>
                  </div>
                  <StepBar steps={ORDER_STEPS} current={STEP_INDEX[order.status]} />
                  <div className="flex flex-wrap items-center gap-space-lg text-body-sm text-on-surface-variant">
                    <span className="flex items-center gap-space-2xs">
                      <Icon name="receipt_long" className="text-base" />
                      Ordered {relativeDate(order.createdAt)}
                    </span>
                    <span className="flex items-center gap-space-2xs">
                      <Icon name="local_shipping" className="text-base" />
                      {order.trackingNumber ? `Tracking ${order.trackingNumber}` : 'Awaiting courier hand-off'}
                    </span>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {/* Order archive */}
          <section className="flex flex-col gap-space-md">
            <div className="flex flex-wrap items-baseline justify-between gap-space-sm">
              <h2 className="font-display text-headline-md text-on-surface">Order archive</h2>
              <Link to="/products" className="text-label-sm font-medium text-primary hover:underline">
                Shop again
              </Link>
            </div>
            <div className="no-scrollbar -mx-margin-mobile flex gap-space-xs overflow-x-auto px-margin-mobile sm:mx-0 sm:px-0">
              {FILTERS.map((option) => (
                <Chip key={option.id} selected={filter === option.id} onClick={() => setFilter(option.id)}>
                  {option.label}
                </Chip>
              ))}
            </div>

            {loading ? (
              <div className="flex flex-col gap-space-xs">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            ) : visibleOrders.length === 0 ? (
              <EmptyState
                icon="receipt_long"
                title="Nothing here yet"
                body={
                  filter === 'all'
                    ? 'Your confirmed orders will appear here with their atelier records.'
                    : 'No order matches this filter.'
                }
                action={
                  <Link to="/products" className="btn-primary">
                    Browse the collection
                  </Link>
                }
              />
            ) : (
              <ul className="flex flex-col gap-space-xs">
                {visibleOrders.map((order) => {
                  const open = expanded === order.id;
                  return (
                    <li key={order.id} className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-card">
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : order.id)}
                        className="flex w-full items-center justify-between gap-space-md p-space-md text-left"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="flex items-center gap-space-xs">
                            <span className="text-headline-sm font-semibold text-on-surface">{order.orderNumber}</span>
                            <span
                              className={clsx(
                                'rounded-full px-space-xs py-[2px] text-label-caps uppercase tracking-wider',
                                STATUS_STYLES[order.status],
                              )}
                            >
                              {order.status}
                            </span>
                          </span>
                          <span className="mt-space-2xs truncate text-body-sm text-on-surface-variant">
                            {order.items.map((item) => item.productName).join(', ')} · {order.items.length}{' '}
                            {order.items.length === 1 ? 'piece' : 'pieces'}
                          </span>
                          <span className="text-body-sm text-outline">{relativeDate(order.createdAt)}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-space-xs">
                          <span className="text-headline-sm font-semibold tabular-nums">
                            {formatMoney(order.total, config.currency)}
                          </span>
                          <Icon name="expand_more" className={clsx('text-xl transition-transform', open && 'rotate-180')} />
                        </span>
                      </button>
                      <div className={clsx('grid transition-all duration-300', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                        <div className="overflow-hidden">
                          <div className="flex flex-col gap-space-md border-t border-outline-variant/50 p-space-md">
                            <ul className="flex flex-col gap-space-xs">
                              {order.items.map((item) => (
                                <li key={item.id} className="flex items-center gap-space-md">
                                  <span className="h-14 w-12 shrink-0 overflow-hidden rounded bg-surface-container">
                                    {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                                  </span>
                                  <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-body-md text-on-surface">{item.productName}</span>
                                    <span className="text-body-sm text-on-surface-variant">
                                      {[item.color, item.size].filter(Boolean).join(' · ')} · Qty {item.quantity}
                                    </span>
                                  </span>
                                  <span className="text-body-sm tabular-nums">
                                    {formatMoney(item.totalPrice, config.currency)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <dl className="space-y-space-2xs border-t border-outline-variant/50 pt-space-sm text-body-sm">
                              <div className="flex justify-between">
                                <dt className="text-on-surface-variant">Subtotal</dt>
                                <dd className="tabular-nums">{formatMoney(order.subtotal, config.currency)}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-on-surface-variant">Delivery</dt>
                                <dd className="tabular-nums">
                                  {order.shippingCost === 0 ? 'Complimentary' : formatMoney(order.shippingCost, config.currency)}
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-on-surface-variant">Duties &amp; taxes</dt>
                                <dd className="tabular-nums">{formatMoney(order.tax, config.currency)}</dd>
                              </div>
                              <div className="flex justify-between pt-space-2xs font-medium">
                                <dt>Total</dt>
                                <dd className="tabular-nums">{formatMoney(order.total, config.currency)}</dd>
                              </div>
                            </dl>
                            {order.shippingAddress && (
                              <div className="rounded-lg bg-surface-container-low p-space-sm text-body-sm text-on-surface-variant">
                                <p className="mb-space-2xs flex items-center gap-space-2xs font-medium text-on-surface">
                                  <Icon name="home_pin" className="text-base" />
                                  Delivered to
                                </p>
                                <p>
                                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                                </p>
                                <p>{order.shippingAddress.street}</p>
                                <p>
                                  {order.shippingAddress.zipCode} {order.shippingAddress.city},{' '}
                                  {order.shippingAddress.country}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Settings */}
          <section className="flex flex-col gap-space-md">
            <h2 className="font-display text-headline-md text-on-surface">Atelier settings</h2>
            <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-card">
              <SettingsRow
                icon="person"
                title="Personal details"
                subtitle={`${user.firstName} ${user.lastName} · ${user.phone ?? 'No phone on file'}`}
                open={panel === 'details'}
                onToggle={() => setPanel(panel === 'details' ? null : 'details')}
              >
                <DetailsPanel />
              </SettingsRow>
              <SettingsRow
                icon="home_pin"
                title="Shipping addresses"
                subtitle={
                  addresses.length
                    ? `${addresses.length} saved · default: ${
                        (addresses.find((address) => address.isDefault) ?? addresses[0]).city
                      }`
                    : 'No address saved yet'
                }
                open={panel === 'addresses'}
                onToggle={() => setPanel(panel === 'addresses' ? null : 'addresses')}
              >
                <AddressesPanel addresses={addresses} onChange={setAddresses} />
              </SettingsRow>
              <SettingsRow
                icon="lock"
                title="Security"
                subtitle="Change the password used to sign in"
                open={panel === 'security'}
                last
                onToggle={() => setPanel(panel === 'security' ? null : 'security')}
              >
                <SecurityPanel />
              </SettingsRow>
            </div>
            <a
              href="mailto:concierge@luxemart.com"
              className="flex items-center justify-between gap-space-md rounded-xl bg-surface-container-low p-space-md transition-colors hover:bg-surface-container"
            >
              <span className="flex items-center gap-space-md">
                <Icon name="chat_bubble_outline" className="text-xl text-primary" />
                <span className="flex flex-col">
                  <span className="text-body-md font-medium text-on-surface">Style concierge</span>
                  <span className="text-body-sm text-on-surface-variant">Fittings, alterations and archive requests</span>
                </span>
              </span>
              <Icon name="chevron_right" className="text-xl text-outline" />
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  open,
  last,
  onToggle,
  children,
}: {
  icon: string;
  title: string;
  subtitle: string;
  open: boolean;
  last?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx(!last && 'border-b border-outline-variant/50')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-space-md p-space-md text-left transition-colors hover:bg-surface-container-low"
      >
        <Icon name={icon} className="text-xl text-primary" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-md font-medium text-on-surface">{title}</span>
          <span className="truncate text-body-sm text-on-surface-variant">{subtitle}</span>
        </span>
        <Icon name="expand_more" className={clsx('text-xl text-outline transition-transform', open && 'rotate-180')} />
      </button>
      <div className={clsx('grid transition-all duration-300', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="border-t border-outline-variant/50 bg-surface-container-low p-space-md">{children}</div>
        </div>
      </div>
    </div>
  );
}

function DetailsPanel() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await usersApi.update(form);
      await refreshUser();
      toast.success('Details saved');
    } catch {
      toast.error('We could not save these details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-space-md">
      <div className="grid gap-space-md sm:grid-cols-2">
        <label className="flex flex-col gap-space-2xs">
          <span className="eyebrow">First name</span>
          <input className="field" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
        </label>
        <label className="flex flex-col gap-space-2xs">
          <span className="eyebrow">Last name</span>
          <input className="field" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
        </label>
      </div>
      <label className="flex flex-col gap-space-2xs">
        <span className="eyebrow">Mobile</span>
        <input className="field" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+33 6 40 92 11 80" />
      </label>
      <label className="flex flex-col gap-space-2xs">
        <span className="eyebrow">Email</span>
        <input className="field bg-surface-container text-on-surface-variant" value={user?.email ?? ''} disabled />
      </label>
      <button type="button" onClick={save} disabled={saving} className="btn-primary self-start text-label-caps uppercase tracking-widest">
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

const EMPTY_ADDRESS: Address = {
  firstName: '',
  lastName: '',
  phone: '',
  street: '',
  apartment: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'France',
  isDefault: false,
};

function AddressesPanel({
  addresses,
  onChange,
}: {
  addresses: Address[];
  onChange: (next: Address[]) => void;
}) {
  const [draft, setDraft] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    const res = await usersApi.addresses();
    onChange(res.data);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await usersApi.addAddress(draft);
      setDraft(null);
      await reload();
      toast.success('Address saved');
    } catch {
      toast.error('Please complete the required address fields');
    } finally {
      setSaving(false);
    }
  };

  const makeDefault = async (address: Address) => {
    try {
      await usersApi.updateAddress(address.id!, { ...address, isDefault: true });
      await reload();
    } catch {
      toast.error('Could not update this address');
    }
  };

  const remove = async (id: number) => {
    try {
      await usersApi.deleteAddress(id);
      await reload();
      toast.success('Address removed');
    } catch {
      toast.error('Could not remove this address');
    }
  };

  return (
    <div className="flex flex-col gap-space-md">
      {addresses.length === 0 && !draft && (
        <p className="text-body-sm text-on-surface-variant">
          No saved address yet. Add one to speed up checkout.
        </p>
      )}
      <ul className="flex flex-col gap-space-xs">
        {addresses.map((address) => (
          <li
            key={address.id}
            className={clsx(
              'flex items-start justify-between gap-space-md rounded-lg border p-space-sm',
              address.isDefault ? 'border-primary bg-surface-container-lowest' : 'border-outline-variant/60 bg-surface-container-lowest',
            )}
          >
            <div className="flex flex-col text-body-sm">
              <span className="font-medium text-on-surface">
                {address.firstName} {address.lastName}
                {address.isDefault && (
                  <span className="ml-space-2xs text-label-caps uppercase tracking-wider text-primary">Default</span>
                )}
              </span>
              <span className="text-on-surface-variant">{address.street}{address.apartment ? `, ${address.apartment}` : ''}</span>
              <span className="text-on-surface-variant">
                {address.zipCode} {address.city}, {address.country}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-space-2xs">
              {!address.isDefault && (
                <button
                  type="button"
                  onClick={() => makeDefault(address)}
                  className="text-label-caps uppercase tracking-wider text-primary hover:underline"
                >
                  Set default
                </button>
              )}
              <button
                type="button"
                onClick={() => address.id && remove(address.id)}
                className="text-label-caps uppercase tracking-wider text-on-surface-variant hover:text-error"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      {draft ? (
        <div className="flex flex-col gap-space-md rounded-lg bg-surface-container-lowest p-space-sm">
          <div className="grid gap-space-md sm:grid-cols-2">
            {([
              ['firstName', 'First name'],
              ['lastName', 'Last name'],
              ['street', 'Street'],
              ['apartment', 'Apartment (optional)'],
              ['city', 'City'],
              ['zipCode', 'Postal code'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex flex-col gap-space-2xs">
                <span className="eyebrow">{label}</span>
                <input
                  className="field"
                  value={draft[key] ?? ''}
                  onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                />
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-space-xs">
            <button type="button" onClick={() => setDraft(null)} className="btn-tonal">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save address'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDraft({ ...EMPTY_ADDRESS })}
          className="flex items-center justify-center gap-space-2xs rounded-lg border border-dashed border-outline-variant py-space-sm text-label-caps uppercase tracking-wider text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          <Icon name="add" className="text-lg" />
          Add a new address
        </button>
      )}
    </div>
  );
}

function SecurityPanel() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (form.newPassword.length < 8) {
      toast.error('Use at least 8 characters');
      return;
    }
    if (form.newPassword !== form.confirm) {
      toast.error('The two passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await usersApi.update({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password updated');
    } catch {
      toast.error('Current password is incorrect');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-space-md">
      <label className="flex flex-col gap-space-2xs">
        <span className="eyebrow">Current password</span>
        <input
          className="field"
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
        />
      </label>
      <div className="grid gap-space-md sm:grid-cols-2">
        <label className="flex flex-col gap-space-2xs">
          <span className="eyebrow">New password</span>
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-space-2xs">
          <span className="eyebrow">Confirm new password</span>
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={(event) => setForm({ ...form, confirm: event.target.value })}
          />
        </label>
      </div>
      <button type="button" onClick={save} disabled={saving} className="btn-primary self-start text-label-caps uppercase tracking-widest">
        {saving ? 'Updating…' : 'Update password'}
      </button>
    </div>
  );
}
