import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Icon from '@/components/Icon';
import { Skeleton, StepBar } from '@/components/Primitives';
import { orders as ordersApi, users as usersApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { Address, Order } from '@/types';
import { formatMoney } from '@/lib/format';

const STEPS = ['Shipping', 'Payment', 'Review'];

const COUNTRIES = [
  'France',
  'Belgium',
  'Switzerland',
  'Italy',
  'Germany',
  'Spain',
  'United Kingdom',
  'United States',
  'Japan',
];

const PAYMENT_METHODS = [
  { id: 'CARD', label: 'Card', note: 'A secure payment link is sent once the order is confirmed.', icon: 'credit_card' },
  { id: 'PAYPAL', label: 'PayPal', note: 'You will approve the amount in PayPal after confirmation.', icon: 'account_balance_wallet' },
  { id: 'BANK_TRANSFER', label: 'Bank transfer', note: 'Dispatch starts as soon as the transfer is received.', icon: 'account_balance' },
];

type ShippingForm = {
  email: string;
  firstName: string;
  lastName: string;
  street: string;
  apartment: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
};

const REQUIRED_FIELDS: (keyof ShippingForm)[] = [
  'firstName',
  'lastName',
  'street',
  'city',
  'zipCode',
  'country',
];

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, clearCart, loading: cartLoading } = useCart();
  const config = useStoreConfig();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saveAddress, setSaveAddress] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('CARD');

  const [form, setForm] = useState<ShippingForm>({
    email: user?.email ?? '',
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    street: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'France',
    phone: user?.phone ?? '',
  });

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      email: current.email || user.email,
      firstName: current.firstName || user.firstName,
      lastName: current.lastName || user.lastName,
      phone: current.phone || user.phone || '',
    }));
  }, [user]);

  useEffect(() => {
    usersApi
      .addresses()
      .then((res) => {
        const addresses: Address[] = res.data;
        const preferred = addresses.find((address) => address.isDefault) ?? addresses[0];
        if (!preferred) return;
        setForm((current) => ({
          ...current,
          firstName: preferred.firstName || current.firstName,
          lastName: preferred.lastName || current.lastName,
          street: preferred.street || current.street,
          apartment: preferred.apartment ?? '',
          city: preferred.city || current.city,
          state: preferred.state ?? '',
          zipCode: preferred.zipCode || current.zipCode,
          country: preferred.country || current.country,
          phone: preferred.phone ?? current.phone,
        }));
      })
      .catch(() => undefined);
  }, []);

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const shippingCost = subtotal >= config.freeShippingThreshold ? 0 : config.shippingCost;
  const tax = Number((subtotal * config.taxRate).toFixed(2));
  const total = useMemo(() => subtotal + shippingCost + tax, [subtotal, shippingCost, tax]);

  const set = (key: keyof ShippingForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors([]);
  };

  const goNext = () => {
    if (step === 0) {
      const missing = REQUIRED_FIELDS.filter((field) => !form[field]?.trim());
      if (missing.length) {
        setErrors(missing.map((field) => fieldLabel(field)));
        return;
      }
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const placeOrder = async () => {
    if (!cart) return;
    setPlacing(true);
    try {
      const res = await ordersApi.checkout({
        items: items.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
        shippingFirstName: form.firstName,
        shippingLastName: form.lastName,
        shippingStreet: form.street,
        shippingApartment: form.apartment || null,
        shippingCity: form.city,
        shippingState: form.state || null,
        shippingZipCode: form.zipCode,
        shippingCountry: form.country,
        shippingPhone: form.phone || null,
        paymentMethod,
        saveAddress,
      });
      setOrder(res.data);
      await clearCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      toast.error('We could not place this order. Please check your details.');
    } finally {
      setPlacing(false);
    }
  };

  useEffect(() => {
    if (order || cartLoading) return;
    if (!user || !cart || cart.items.length === 0) navigate('/cart', { replace: true });
  }, [cart, cartLoading, navigate, order, user]);

  if (order) {
    return (
      <div className="mx-auto max-w-[720px] px-margin-mobile py-space-2xl sm:px-margin-tablet">
        <div className="flex flex-col items-center gap-space-md rounded-2xl bg-surface-container-low px-space-lg py-space-2xl text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <Icon name="check" className="text-2xl" />
          </span>
          <h1 className="font-display text-headline-lg">Your order is confirmed</h1>
          <p className="text-body-md text-on-surface-variant">
            Reference <span className="font-semibold text-on-surface">{order.orderNumber}</span> — we will email{' '}
            {form.email || 'you'} as soon as the atelier dispatches your parcel.
          </p>
          <dl className="mt-space-xs w-full space-y-space-2xs border-t border-surface-container-highest pt-space-md text-body-md">
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">Pieces</dt>
              <dd>{order.items?.length ?? items.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">Total paid</dt>
              <dd className="font-semibold">{formatMoney(order.total, config.currency)}</dd>
            </div>
          </dl>
          <div className="mt-space-md flex w-full flex-col gap-space-xs sm:flex-row sm:justify-center">
            <Link to="/profile" className="btn-primary flex-1 sm:flex-none">
              Track in my account
            </Link>
            <Link to="/products" className="btn-tonal flex-1 sm:flex-none">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cartLoading || !cart || items.length === 0) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-space-lg px-margin-mobile py-space-2xl sm:px-margin-tablet lg:px-margin-desktop">
        <Skeleton className="h-8 w-52" />
        <div className="grid gap-space-xl lg:grid-cols-[minmax(0,1fr)_400px]">
          <Skeleton className="h-[420px] rounded-2xl" />
          <Skeleton className="h-[280px] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-margin-mobile pb-space-3xl pt-space-md sm:px-margin-tablet lg:px-margin-desktop">
      {/* Header row */}
      <div className="flex items-center justify-between gap-space-md">
        <Link
          to="/cart"
          className="flex items-center gap-space-2xs py-2 text-label-caps uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary"
        >
          <Icon name="arrow_back_ios" className="text-base" />
          Return to bag
        </Link>
        <span className="flex items-center gap-space-2xs rounded-full bg-surface-container-low px-space-md py-space-2xs text-label-caps uppercase tracking-wider text-on-surface-variant">
          <Icon name="lock" className="text-sm text-primary" />
          Encrypted session
        </span>
      </div>

      <div className="mt-space-lg grid gap-space-xl lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-space-2xl">
        <div className="flex flex-col gap-space-lg">
          {/* Stepper */}
          <div className="rounded-xl bg-surface-container-low p-space-md">
            <StepBar steps={STEPS} current={step} />
          </div>

          {/* Collapsible summary (mobile) */}
          <div className="rounded-xl bg-surface-container-low shadow-card lg:hidden">
            <button
              type="button"
              onClick={() => setSummaryOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-space-md p-space-md text-left"
            >
              <span className="flex items-center gap-space-xs">
                <span className="flex -space-x-3">
                  {items.slice(0, 2).map((item) => (
                    <span
                      key={item.id}
                      className="h-11 w-9 shrink-0 overflow-hidden rounded bg-surface-container-high shadow-sm"
                    >
                      {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                    </span>
                  ))}
                </span>
                <span className="flex flex-col">
                  <span className="text-label-caps uppercase tracking-wider">Order summary</span>
                  <span className="text-body-sm text-on-surface-variant">
                    {cart.itemCount} {cart.itemCount === 1 ? 'piece' : 'pieces'}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-space-2xs">
                <span className="text-headline-sm font-semibold">{formatMoney(total, config.currency)}</span>
                <Icon name="expand_more" className={clsx('text-xl transition-transform', summaryOpen && 'rotate-180')} />
              </span>
            </button>
            <div className={clsx('grid transition-all duration-300', summaryOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div className="overflow-hidden px-space-md pb-space-md">
                <SummaryLines
                  lines={[
                    ['Merchandise subtotal', formatMoney(subtotal, config.currency)],
                    ['Delivery', shippingCost === 0 ? 'Complimentary' : formatMoney(shippingCost, config.currency)],
                    ['Duties & taxes', formatMoney(tax, config.currency)],
                  ]}
                  total={total}
                  currency={config.currency}
                />
              </div>
            </div>
          </div>

          {/* Step 1 — contact & shipping */}
          {step === 0 && (
            <section className="flex flex-col gap-space-lg">
              <div>
                <h1 className="font-display text-headline-xl-mobile text-on-surface sm:text-headline-lg">
                  Contact &amp; shipping
                </h1>
                <p className="mt-space-2xs text-body-sm text-on-surface-variant">
                  Address used for insured atelier courier dispatch.
                </p>
              </div>

              <Field label="Contact email" required>
                <input className="field" type="email" value={form.email} onChange={set('email')} placeholder="you@studio.com" />
              </Field>

              <div className="grid gap-space-md sm:grid-cols-2">
                <Field label="First name" required error={errors.includes('first name')}>
                  <input className="field" value={form.firstName} onChange={set('firstName')} />
                </Field>
                <Field label="Last name" required error={errors.includes('last name')}>
                  <input className="field" value={form.lastName} onChange={set('lastName')} />
                </Field>
              </div>

              <Field label="Street address" required error={errors.includes('street')}>
                <input className="field" value={form.street} onChange={set('street')} placeholder="14 Rue du Faubourg Saint-Honoré" />
              </Field>

              <Field label="Apartment, suite, floor (optional)">
                <input className="field" value={form.apartment} onChange={set('apartment')} placeholder="Apt 4B" />
              </Field>

              <div className="grid grid-cols-2 gap-space-md">
                <Field label="Postal code" required error={errors.includes('postal code')}>
                  <input className="field" value={form.zipCode} onChange={set('zipCode')} />
                </Field>
                <Field label="City" required error={errors.includes('city')}>
                  <input className="field" value={form.city} onChange={set('city')} />
                </Field>
              </div>

              <div className="grid gap-space-md sm:grid-cols-2">
                <Field label="Country / region" required>
                  <select className="field appearance-none" value={form.country} onChange={set('country')}>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Mobile phone (for courier scheduling)">
                  <input className="field" type="tel" value={form.phone} onChange={set('phone')} placeholder="+33 6 40 92 11 80" />
                </Field>
              </div>

              <label className="flex items-start gap-space-xs">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(event) => setSaveAddress(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <span className="text-body-sm text-on-surface-variant">
                  Save this address to my LUXEMART directory for next time.
                </span>
              </label>

              {/* Delivery method */}
              <div className="flex flex-col gap-space-xs">
                <h2 className="text-headline-sm font-semibold text-on-surface">Delivery method</h2>
                <div className="flex items-start justify-between gap-space-md rounded-lg bg-surface-container-lowest p-space-md shadow-card">
                  <div className="flex items-start gap-space-xs">
                    <Icon name="local_shipping" className="mt-0.5 text-xl text-primary" />
                    <div className="flex flex-col">
                      <span className="flex flex-wrap items-center gap-space-2xs font-medium text-on-surface">
                        Atelier delivery
                        <span className="rounded bg-primary/10 px-space-2xs py-[2px] text-label-caps uppercase tracking-wider text-primary">
                          Standard
                        </span>
                      </span>
                      <span className="mt-space-2xs text-body-sm text-on-surface-variant">
                        Tracked, signature on receipt, in the signature archival box.
                      </span>
                      <span className="mt-space-2xs text-label-sm text-on-surface-variant">2–3 business days</span>
                    </div>
                  </div>
                  <span className={clsx('shrink-0 font-medium', shippingCost === 0 ? 'text-primary' : 'text-on-surface')}>
                    {shippingCost === 0 ? 'Free' : formatMoney(shippingCost, config.currency)}
                  </span>
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  Orders above {formatMoney(config.freeShippingThreshold, config.currency)} ship complimentary.
                </p>
              </div>
            </section>
          )}

          {/* Step 2 — payment */}
          {step === 1 && (
            <section className="flex flex-col gap-space-lg">
              <div>
                <h1 className="font-display text-headline-xl-mobile text-on-surface sm:text-headline-lg">Payment</h1>
                <p className="mt-space-2xs text-body-sm text-on-surface-variant">
                  Choose how the atelier settles your order. No card number is collected on this site.
                </p>
              </div>
              <div className="flex flex-col gap-space-sm">
                {PAYMENT_METHODS.map((method) => {
                  const selected = paymentMethod === method.id;
                  return (
                    <label
                      key={method.id}
                      className={clsx(
                        'flex cursor-pointer items-start gap-space-md rounded-lg p-space-md transition-all',
                        selected ? 'bg-surface-container-lowest shadow-card ring-1 ring-primary' : 'bg-surface-container-low hover:bg-surface-container',
                      )}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        checked={selected}
                        onChange={() => setPaymentMethod(method.id)}
                        className="mt-1 h-4 w-4 accent-primary"
                      />
                      <Icon name={method.icon} className={clsx('mt-0.5 text-xl', selected ? 'text-primary' : 'text-on-surface-variant')} />
                      <span className="flex flex-col">
                        <span className="font-medium text-on-surface">{method.label}</span>
                        <span className="mt-space-2xs text-body-sm text-on-surface-variant">{method.note}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="flex items-center gap-space-xs rounded-lg bg-surface-container-low p-space-md text-body-sm text-on-surface-variant">
                <Icon name="redeem" className="text-lg text-primary" />
                You earn {Math.floor(total / 10)} loyalty points on this order.
              </div>
            </section>
          )}

          {/* Step 3 — review */}
          {step === 2 && (
            <section className="flex flex-col gap-space-lg">
              <h1 className="font-display text-headline-xl-mobile text-on-surface sm:text-headline-lg">Review your order</h1>

              <div className="flex flex-col gap-space-sm">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-space-md rounded-lg bg-surface-container-low p-space-sm">
                    <span className="h-20 w-16 shrink-0 overflow-hidden rounded bg-surface-container-high">
                      {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-headline-sm font-semibold text-on-surface">{item.productName}</span>
                      <span className="text-body-sm text-on-surface-variant">
                        {[item.color, item.size].filter(Boolean).join(' · ') || 'One size'} · Qty {item.quantity}
                      </span>
                    </div>
                    <span className="text-body-md font-medium tabular-nums">
                      {formatMoney(item.lineTotal, config.currency)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid gap-space-sm sm:grid-cols-2">
                <ReviewBlock title="Ship to" onEdit={() => setStep(0)}>
                  {[
                    `${form.firstName} ${form.lastName}`,
                    [form.street, form.apartment].filter(Boolean).join(', '),
                    `${form.zipCode} ${form.city}`,
                    form.country,
                    form.phone,
                  ]
                    .filter(Boolean)
                    .map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                </ReviewBlock>
                <ReviewBlock title="Payment" onEdit={() => setStep(1)}>
                  <p>{PAYMENT_METHODS.find((method) => method.id === paymentMethod)?.label}</p>
                  <p>{form.email || 'No email provided'}</p>
                </ReviewBlock>
              </div>
            </section>
          )}

          {/* CTA */}
          <div className="flex flex-col gap-space-xs">
            {step === STEPS.length - 1 ? (
              <button
                type="button"
                onClick={placeOrder}
                disabled={placing}
                className="flex h-14 w-full items-center justify-between rounded-lg bg-primary px-space-md text-on-primary shadow-md transition-all active:scale-[0.99] disabled:bg-surface-dim disabled:text-outline"
              >
                <span className="flex flex-col text-left">
                  <span className="text-label-caps uppercase tracking-widest opacity-90">
                    {placing ? 'Confirming' : 'Final step'}
                  </span>
                  <span className="text-headline-sm font-semibold">{placing ? 'Placing your order…' : 'Place order'}</span>
                </span>
                <span className="flex items-center gap-space-2xs">
                  <span className="text-headline-sm tabular-nums">{formatMoney(total, config.currency)}</span>
                  <Icon name="arrow_forward" className="text-xl" />
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="flex h-14 w-full items-center justify-between rounded-lg bg-primary px-space-md text-on-primary shadow-md transition-all active:scale-[0.99]"
              >
                <span className="flex flex-col text-left">
                  <span className="text-label-caps uppercase tracking-widest opacity-90">Proceed to step {step + 2}</span>
                  <span className="text-headline-sm font-semibold">
                    {step === 0 ? 'Continue to payment' : 'Review order'}
                  </span>
                </span>
                <span className="flex items-center gap-space-2xs">
                  <span className="text-headline-sm tabular-nums">{formatMoney(total, config.currency)}</span>
                  <Icon name="arrow_forward" className="text-xl" />
                </span>
              </button>
            )}

            {errors.length > 0 && (
              <p className="text-body-sm text-error">Please complete: {errors.join(', ')}.</p>
            )}

            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((current) => current - 1)}
                className="btn-tonal w-full justify-center"
              >
                <Icon name="arrow_back" className="text-lg" />
                Back
              </button>
            )}

            <div className="grid grid-cols-3 gap-space-2xs pt-space-md text-center">
              {[
                { icon: 'restart_alt', label: '30-day returns' },
                { icon: 'verified_user', label: 'Insured dispatch' },
                { icon: 'eco', label: 'Carbon balanced' },
              ].map((pillar) => (
                <div key={pillar.label} className="flex flex-col items-center gap-space-2xs rounded bg-surface-container-low p-space-xs">
                  <Icon name={pillar.icon} className="text-lg text-primary" />
                  <span className="text-label-caps uppercase leading-tight tracking-wider text-on-surface">{pillar.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop sticky summary */}
        <aside className="hidden lg:sticky lg:top-28 lg:block">
          <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-low p-space-lg">
            <h2 className="text-label-caps uppercase tracking-widest text-on-surface-variant">Order summary</h2>
            <ul className="flex flex-col gap-space-xs">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-space-md text-body-sm">
                  <span className="min-w-0 truncate text-on-surface-variant">
                    {item.productName} <span className="text-outline">×{item.quantity}</span>
                  </span>
                  <span className="tabular-nums text-on-surface">{formatMoney(item.lineTotal, config.currency)}</span>
                </li>
              ))}
            </ul>
            <div className="h-px bg-surface-container-highest" />
            <dl className="flex flex-col gap-space-2xs text-body-md">
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(subtotal, config.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="flex items-center gap-space-2xs text-on-surface-variant">
                  Delivery
                  <Icon name="eco" className="text-sm text-primary" />
                </dt>
                <dd className={clsx('tabular-nums', shippingCost === 0 && 'text-primary')}>
                  {shippingCost === 0 ? 'Complimentary' : formatMoney(shippingCost, config.currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">Duties &amp; taxes</dt>
                <dd className="tabular-nums">{formatMoney(tax, config.currency)}</dd>
              </div>
            </dl>
            <div className="h-px bg-surface-container-highest" />
            <div className="flex items-baseline justify-between">
              <span className="text-label-caps uppercase tracking-wider">Total due</span>
              <span className="font-display text-headline-md tabular-nums">{formatMoney(total, config.currency)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const FIELD_LABELS: Partial<Record<keyof ShippingForm, string>> = {
  firstName: 'first name',
  lastName: 'last name',
  street: 'street',
  city: 'city',
  zipCode: 'postal code',
  country: 'country',
};

function fieldLabel(key: keyof ShippingForm): string {
  return FIELD_LABELS[key] ?? key;
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-space-2xs">
      <span className={clsx('text-label-caps uppercase tracking-wider text-on-surface-variant', error && 'text-error')}>
        {label} {required && <span className="text-primary">*</span>}
      </span>
      {children}
    </label>
  );
}

function SummaryLines({
  lines,
  total,
  currency,
}: {
  lines: [string, string][];
  total: number;
  currency: string;
}) {
  return (
    <div className="flex flex-col gap-space-2xs pt-space-xs">
      {lines.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between text-body-sm">
          <span className="text-on-surface-variant">{label}</span>
          <span className="text-on-surface">{value}</span>
        </div>
      ))}
      <div className="mt-space-xs flex items-baseline justify-between">
        <span className="text-label-caps uppercase tracking-wider">Total due</span>
        <span className="font-display text-headline-md tabular-nums">{formatMoney(total, currency)}</span>
      </div>
    </div>
  );
}

function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-surface-container-low p-space-md">
      <div className="mb-space-2xs flex items-center justify-between">
        <h3 className="text-label-caps uppercase tracking-wider text-on-surface-variant">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-label-caps uppercase tracking-wider text-primary transition-colors hover:underline"
        >
          Edit
        </button>
      </div>
      <div className="space-y-space-2xs text-body-sm text-on-surface">{children}</div>
    </div>
  );
}
