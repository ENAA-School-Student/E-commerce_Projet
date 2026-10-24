import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import Icon from './Icon';
import SmartImage from './SmartImage';
import { products as productsApi } from '@/lib/api';
import { Product } from '@/types';
import { formatMoney } from '@/lib/format';

interface SearchInputProps {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
}

export default function SearchInput({ className, inputClassName, placeholder = 'Search the atelier...', autoFocus, onNavigate }: SearchInputProps) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      productsApi
        .list({ search: value.trim(), size: 5 })
        .then((res) => setSuggestions(res.data.content))
        .catch(() => setSuggestions([]));
    }, 280);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const go = (slug?: string) => {
    setOpen(false);
    onNavigate?.();
    if (slug) navigate(`/product/${slug}`);
    else navigate(`/products?search=${encodeURIComponent(value.trim())}`);
  };

  return (
    <form
      ref={boxRef}
      className={clsx('relative', className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) go();
      }}
    >
      <input
        name="q"
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={inputClassName}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-card reveal">
          {suggestions.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => go(product.slug)}
                className="flex w-full items-center gap-space-sm px-space-sm py-space-xs text-left transition-colors hover:bg-surface-container-low"
              >
                <SmartImage src={product.images?.[0]?.imageUrl} alt={product.name} monogram={product.name} className="h-12 w-10 shrink-0 rounded-md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm font-medium">{product.name}</span>
                  <span className="eyebrow text-[10px]">{product.categoryName ?? product.brand}</span>
                </span>
                <span className="text-label-sm font-medium text-primary">
                  {formatMoney(product.price, 'USD')}
                </span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => go()}
              className="flex w-full items-center justify-center gap-space-2xs border-t border-outline-variant/30 py-space-xs text-label-caps uppercase tracking-widest text-primary transition-colors hover:bg-surface-container-low"
            >
              <Icon name="search" className="text-base" />
              See all results
            </button>
          </li>
        </ul>
      )}
    </form>
  );
}
