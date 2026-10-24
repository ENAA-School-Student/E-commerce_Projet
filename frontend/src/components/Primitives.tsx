import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import Icon from './Icon';
import { discountPercent, formatMoney } from '@/lib/format';

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx('eyebrow', className)}>{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: { label: string; to: string };
  className?: string;
}) {
  return (
    <div className={clsx('flex items-end justify-between gap-space-lg', className)}>
      <div>
        {eyebrow && <Eyebrow className="mb-space-2xs">{eyebrow}</Eyebrow>}
        <h2 className="font-display text-headline-md text-on-surface">{title}</h2>
      </div>
      {action && (
        <Link
          to={action.to}
          className="group flex shrink-0 items-center gap-space-2xs pb-1 text-label-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
        >
          {action.label}
          <Icon name="arrow_forward" className="text-base transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

type ChipTone = 'filter' | 'segment' | 'tag';

export function Chip({
  children,
  selected = false,
  onClick,
  count,
  tone = 'segment',
  className,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  count?: number;
  tone?: ChipTone;
  className?: string;
}) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-space-2xs whitespace-nowrap rounded-full px-space-md py-space-xs text-label-sm font-medium transition-all active:scale-95',
        tone === 'tag'
          ? 'bg-surface-container-high text-on-surface-variant'
          : selected
            ? 'bg-on-surface text-inverse-on-surface'
            : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary',
        className,
      )}
    >
      {children}
      {typeof count === 'number' && (
        <span className={clsx('text-label-sm', selected ? 'text-inverse-on-surface/70' : 'text-outline')}>{count}</span>
      )}
    </Tag>
  );
}

const BADGE_STYLES: Record<string, string> = {
  Bestseller: 'bg-primary-container text-on-primary-container',
  New: 'bg-on-surface text-inverse-on-surface',
  'New in': 'bg-on-surface text-inverse-on-surface',
  Limited: 'bg-tertiary-container text-on-surface',
  Sustainable: 'bg-secondary-container text-on-secondary-container',
};

export function ProductBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-space-sm py-[3px] text-label-caps uppercase',
        BADGE_STYLES[label] ?? 'bg-surface-container-highest text-on-surface-variant',
        className,
      )}
    >
      {label}
    </span>
  );
}

export function PriceTag({
  price,
  compareAt,
  currency,
  className,
  size = 'md',
}: {
  price: number;
  compareAt?: number | null;
  currency?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const discount = discountPercent(price, compareAt);
  const priceClass = size === 'lg' ? 'text-headline-md' : size === 'sm' ? 'text-body-md' : 'text-body-lg';
  return (
    <span className={clsx('flex items-baseline gap-space-xs', className)}>
      <span className={clsx('font-medium text-on-surface', priceClass)}>{formatMoney(price, currency)}</span>
      {compareAt && (
        <span className="text-body-sm text-outline line-through">{formatMoney(compareAt, currency)}</span>
      )}
      {discount !== null && (
        <span className="rounded-full bg-error-container px-space-xs py-[2px] text-label-caps text-on-error-container">
          -{discount}%
        </span>
      )}
    </span>
  );
}

export function StockPill({
  stock,
  lowStockThreshold,
  size,
  className,
}: {
  stock: number;
  lowStockThreshold: number;
  size?: string;
  className?: string;
}) {
  if (stock <= 0) {
    return (
      <span className={clsx('inline-flex items-center gap-space-2xs text-label-sm text-outline', className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-outline" />
        Sold out{size ? ` in ${size}` : ''}
      </span>
    );
  }
  if (stock <= lowStockThreshold) {
    return (
      <span className={clsx('inline-flex items-center gap-space-2xs text-label-sm text-on-error-container', className)}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-error" />
        </span>
        Only {stock} left{size ? ` in ${size}` : ''}
      </span>
    );
  }
  return (
    <span className={clsx('inline-flex items-center gap-space-2xs text-label-sm text-on-surface-variant', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-primary-container" />
      In atelier
    </span>
  );
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const tones: Record<string, string> = {
    PENDING: 'bg-secondary-container text-on-secondary-container',
    PROCESSING: 'bg-primary/10 text-primary',
    SHIPPED: 'bg-tertiary-container text-on-surface',
    DELIVERED: 'bg-primary-container text-on-primary-container',
    CANCELLED: 'bg-error-container text-on-error-container',
    AUTHORIZED: 'bg-primary/10 text-primary',
    CAPTURED: 'bg-primary-container text-on-primary-container',
    FAILED: 'bg-error-container text-on-error-container',
    REFUNDED: 'bg-error-container text-on-error-container',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-space-xs py-[2px] text-label-caps uppercase tracking-wider',
        tones[status] ?? 'bg-surface-container-highest text-on-surface-variant',
        className,
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}

export function Rating({ value, count, className }: { value: number; count?: number; className?: string }) {
  return (
    <span className={clsx('flex items-center gap-space-2xs text-label-sm text-on-surface-variant', className)}>
      <Icon name="star" filled weight={500} className="text-sm text-primary" />
      <span className="font-medium text-on-surface">{value ? value.toFixed(1) : '—'}</span>
      {typeof count === 'number' && <span className="text-outline">({count})</span>}
    </span>
  );
}

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  compact = false,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  compact?: boolean;
  className?: string;
}) {
  const btn =
    'flex items-center justify-center text-on-surface-variant transition-colors hover:text-primary disabled:text-outline-variant';
  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-full border border-outline-variant bg-surface-container-lowest',
        compact ? 'h-8' : 'h-11',
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        className={clsx(btn, compact ? 'w-8' : 'w-10')}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Icon name="remove" className={compact ? 'text-base' : 'text-lg'} />
      </button>
      <span className={clsx('text-center font-medium tabular-nums', compact ? 'w-6 text-label-sm' : 'w-8 text-body-md')}>
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        className={clsx(btn, compact ? 'w-8' : 'w-10')}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Icon name="add" className={compact ? 'text-base' : 'text-lg'} />
      </button>
    </div>
  );
}

export function Swatch({
  color,
  hex,
  selected,
  onClick,
}: {
  color: string;
  hex?: string | null;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={color}
      aria-label={color}
      aria-pressed={selected}
      className={clsx(
        'h-7 w-7 rounded-full border transition-all',
        selected ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-surface' : 'border-outline-variant hover:scale-105',
      )}
      style={{ backgroundColor: hex ?? '#e2e2e2' }}
    />
  );
}

export function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-outline-variant/60">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-space-md text-left"
      >
        <span className="text-headline-sm font-body text-on-surface">{title}</span>
        <Icon name="expand_more" className={clsx('text-xl text-on-surface-variant transition-transform', open && 'rotate-180')} />
      </button>
      <div className={clsx('grid transition-all duration-300', open ? 'grid-rows-[1fr] pb-space-lg' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden text-body-md leading-relaxed text-on-surface-variant">{children}</div>
      </div>
    </div>
  );
}

export function StepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-space-xs">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-space-xs">
            <span
              className={clsx(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-label-sm font-medium',
                done && 'bg-primary text-on-primary',
                active && 'border border-primary bg-surface text-primary',
                !done && !active && 'border border-outline-variant bg-surface text-outline',
              )}
            >
              {done ? <Icon name="check" className="text-sm" /> : index + 1}
            </span>
            <span className={clsx('hidden text-label-sm sm:inline', active ? 'font-medium text-on-surface' : 'text-outline')}>
              {label}
            </span>
            {index < steps.length - 1 && (
              <span className={clsx('h-px flex-1', done ? 'bg-primary' : 'bg-outline-variant')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest', className)}>
      <div
        className="h-full rounded-full bg-primary-container transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse bg-surface-container-high', className)} />;
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-space-md rounded-xl bg-surface-container-low px-space-lg py-space-3xl text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
        <Icon name={icon} className="text-2xl" />
      </span>
      <h3 className="font-display text-headline-md">{title}</h3>
      <p className="max-w-sm text-body-md text-on-surface-variant">{body}</p>
      {action}
    </div>
  );
}
