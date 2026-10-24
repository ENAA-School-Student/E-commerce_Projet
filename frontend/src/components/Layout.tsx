import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Icon from './Icon';
import SearchInput from './SearchInput';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { categories as categoriesApi } from '@/lib/api';
import { Category } from '@/types';
import { initials } from '@/lib/format';

const TABS = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/products', label: 'Shop', icon: 'storefront' },
  { to: '/wishlist', label: 'Wishlist', icon: 'favorite' },
  { to: '/cart', label: 'Bag', icon: 'shopping_bag' },
  { to: '/profile', label: 'Profile', icon: 'person' },
];

function CartBadge({ itemCount, size = 'md' }: { itemCount: number; size?: 'md' | 'sm' }) {
  const [bumpKey, setBumpKey] = useState(0);
  const previous = useRef(itemCount);

  useEffect(() => {
    if (itemCount > previous.current) setBumpKey((key) => key + 1);
    previous.current = itemCount;
  }, [itemCount]);

  if (itemCount <= 0) return null;
  return (
    <span
      key={bumpKey}
      className={clsx(
        'absolute animate-badge-pop',
        size === 'sm'
          ? '-right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-on-primary'
          : '-right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-on-primary',
      )}
    >
      {itemCount}
    </span>
  );
}

function MobileHeader() {
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-outline-variant/40 bg-surface/90 pt-safe backdrop-blur-md shadow-header">
      <div className="flex h-16 items-center justify-between px-margin-mobile">
        <div className="flex items-center gap-space-sm">
          <button aria-label="Search" onClick={() => setSearchOpen(!searchOpen)} className="text-on-surface">
            <Icon name="search" />
          </button>
          <Link to="/" className="font-display text-xl tracking-wide">
            LUXEMART
          </Link>
        </div>
        <div className="flex items-center gap-space-md">
          <Link to="/wishlist" aria-label="Wishlist" className="relative text-on-surface">
            <Icon name="favorite" />
            {wishlistCount > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary-container" />}
          </Link>
          <Link to="/cart" aria-label="Bag" className="relative text-on-surface">
            <Icon name="shopping_bag" />
            <CartBadge itemCount={itemCount} />
          </Link>
          <UserAvatar />
        </div>
      </div>
      {searchOpen && (
        <SearchInput
          className="border-t border-outline-variant/40 bg-surface-container-lowest"
          inputClassName="w-full bg-transparent px-margin-mobile py-space-sm text-body-lg outline-none placeholder:text-outline"
          autoFocus
          onNavigate={() => setSearchOpen(false)}
        />
      )}
    </header>
  );
}

function UserAvatar() {
  const { user } = useAuth();
  return (
    <Link
      to={user ? '/profile' : '/login'}
      aria-label="Account"
      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container-high text-label-sm font-medium text-on-surface-variant"
    >
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(user?.firstName, user?.lastName)
      )}
    </Link>
  );
}

function BottomTabBar() {
  const { itemCount } = useCart();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-outline-variant/40 bg-surface/95 pb-safe backdrop-blur-md shadow-bottom-nav sm:hidden">
      <ul className="flex h-16 items-stretch">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                clsx(
                  'flex h-full flex-col items-center justify-center gap-[2px] text-label-sm transition-colors',
                  isActive ? 'text-primary' : 'text-on-surface-variant',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon name={tab.icon} filled={isActive} className="text-xl" />
                    {tab.to === '/cart' && <CartBadge itemCount={itemCount} size="sm" />}
                  </span>
                  {tab.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function DesktopHeader() {
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    categoriesApi
      .list()
      .then((res) => setCategories(res.data.filter((c: Category) => !c.parentId)))
      .catch(() => undefined);
  }, []);

  return (
    <header className="sticky top-0 z-40 hidden h-20 border-b border-outline-variant/40 bg-surface/90 backdrop-blur-md shadow-header sm:block">
      <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between gap-space-2xl px-margin-desktop">
        <Link to="/" className="font-display text-2xl tracking-wide">
          LUXEMART
        </Link>

        <nav className="flex items-center gap-space-xl">
          {categories.map((category) => (
            <NavLink
              key={category.id}
              to={`/products?category=${category.slug}`}
              className={({ isActive }) =>
                clsx(
                  'text-label-sm font-medium tracking-wide transition-colors hover:text-primary',
                  isActive ? 'text-primary' : 'text-on-surface',
                )
              }
            >
              {category.name}
            </NavLink>
          ))}
          {user && /ROLE_ADMIN/.test(user.roles.join()) && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                clsx('text-label-sm font-medium tracking-wide', isActive ? 'text-primary' : 'text-on-surface-variant')
              }
            >
              Atelier
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-space-lg">
          <SearchInput
            placeholder="Search"
            className="hidden lg:block"
            inputClassName="w-44 rounded-full bg-surface-container py-space-xs pl-space-lg pr-space-md text-label-sm outline-none placeholder:text-outline transition-all focus:w-60"
          />
          <Link to="/wishlist" aria-label="Wishlist" className="relative text-on-surface hover:text-primary">
            <Icon name="favorite" />
            {wishlistCount > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary-container" />}
          </Link>
          <Link to="/cart" aria-label="Bag" className="relative text-on-surface hover:text-primary">
            <Icon name="shopping_bag" />
            <CartBadge itemCount={itemCount} />
          </Link>
          <UserAvatar />
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const [email, setEmail] = useState('');

  const subscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    toast.success('You are on the list');
    setEmail('');
  };

  return (
    <footer className="bg-inverse-surface pb-28 pt-space-3xl text-inverse-on-surface sm:pb-0">
      <div className="mx-auto max-w-[1400px] px-margin-desktop">
        <div className="flex flex-col gap-space-xl border-b border-inverse-on-surface/15 pb-space-2xl lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-md">
            <p className="eyebrow text-inverse-on-surface/60">The dispatch</p>
            <h3 className="mt-space-xs font-display text-headline-lg">Atelier notes, twice a month</h3>
            <p className="mt-space-sm text-body-md text-inverse-on-surface/70">
              Fabric provenance, restock alerts and private viewings. No noise.
            </p>
          </div>
          <form onSubmit={subscribe} className="flex w-full max-w-sm items-center gap-space-sm">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              aria-label="Email address"
              placeholder="your@email.com"
              className="field flex-1 border-inverse-on-surface/25 bg-transparent text-inverse-on-surface placeholder:text-inverse-on-surface/40"
            />
            <button type="submit" className="btn-primary bg-primary-container text-on-primary-container">
              Join
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 gap-space-xl py-space-2xl md:grid-cols-4">
          {[
            { title: 'Shop', links: ['Women', 'Men', 'Accessories', 'Home'] },
            { title: 'Client care', links: ['Shipping', 'Returns', 'Size guide', 'Contact'] },
            { title: 'House', links: ['Story', 'Materials', 'Careers', 'Press'] },
            { title: 'Legal', links: ['Terms', 'Privacy', 'Cookies'] },
          ].map((column) => (
            <div key={column.title}>
              <h4 className="eyebrow text-inverse-on-surface/50">{column.title}</h4>
              <ul className="mt-space-sm space-y-space-xs">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link to="/products" className="text-body-md text-inverse-on-surface/80 transition-colors hover:text-primary-fixed-dim">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start justify-between gap-space-sm border-t border-inverse-on-surface/15 py-space-lg text-label-sm text-inverse-on-surface/50 sm:flex-row">
          <span>&copy; {new Date().getFullYear()} LUXEMART. All rights reserved.</span>
          <span className="font-display text-base tracking-widest">PARIS &middot; MILAN &middot; TOKYO</span>
        </div>
      </div>
    </footer>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-surface">
      <DesktopHeader />
      <MobileHeader />
      <main className="pb-24 pt-16 sm:pb-0 sm:pt-20">{children}</main>
      <Footer />
      <BottomTabBar />
    </div>
  );
}
