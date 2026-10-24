import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Icon from '@/components/Icon';
import { products as productsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type Mode = 'signin' | 'register';

const PRIVILEGES = [
  { icon: 'workspace_premium', title: 'Archival provenance', body: 'Every piece ships with its atelier record and mill certificate.' },
  { icon: 'tailoring', title: 'Complimentary alterations', body: 'Two fittings included at any LUXEMART salon, worldwide.' },
  { icon: 'private_connectivity', title: 'Private salon previews', body: 'Early access to limited runs before they reach the floor.' },
];

export default function LoginPage() {
  const { login, register, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>('signin');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [vignette, setVignette] = useState<string | null>(null);

  const [signin, setSignin] = useState({ email: '', password: '' });
  const [signup, setSignup] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    productsApi
      .featured(0, 1)
      .then((res) => setVignette(res.data.content[0]?.images?.[0]?.imageUrl ?? null))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const from = location.state?.from?.pathname;
    
    if (user) {
      const target = from || (isAdmin ? '/admin' : '/profile');
      navigate(target, { replace: true });
    }
  }, [user, isAdmin, navigate, location]);

  const submitSignin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await login(signin.email, signin.password);
      toast.success('Welcome back');
    } catch {
      toast.error('These credentials do not match an account');
    } finally {
      setBusy(false);
    }
  };

  const submitSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (signup.password.length < 8) {
      toast.error('Use at least 8 characters for your password');
      return;
    }
    if (!accepted) {
      toast.error('Please accept the terms to continue');
      return;
    }
    setBusy(true);
    try {
      await register({
        firstName: signup.firstName,
        lastName: signup.lastName,
        email: signup.email,
        password: signup.password,
        phone: signup.phone || undefined,
      });
      toast.success('Atelier account created');
    } catch {
      toast.error('We could not create this account. Email may already be used.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-[1400px] gap-space-2xl px-margin-mobile py-space-xl sm:px-margin-tablet lg:grid-cols-[minmax(0,1fr)_480px] lg:px-margin-desktop lg:py-space-2xl">
      {/* Editorial column */}
      <div className="flex flex-col gap-space-lg">
        <div className="flex flex-col gap-space-xs">
          <span className="inline-flex w-fit items-center gap-space-2xs rounded-full bg-surface-container px-space-md py-space-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="eyebrow">Client privileges &amp; atelier access</span>
          </span>
          <h1 className="font-display text-headline-xl-mobile pt-space-2xs text-on-surface sm:text-headline-xl">
            Maison LUXEMART
          </h1>
          <p className="max-w-sm text-body-md text-on-surface-variant">
            Access your wardrobe, archival orders and private salon reservations.
          </p>
        </div>
        <div className="relative h-36 w-full overflow-hidden rounded-xl bg-surface-container shadow-card sm:h-56 lg:h-[26rem]">
          {vignette ? (
            <img src={vignette} alt="Atelier editorial" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-surface-container-high" />
          )}
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-on-surface/85 via-on-surface/20 to-transparent p-space-md">
            <div className="flex w-full items-center justify-between gap-space-md">
              <span className="eyebrow text-on-primary">Autumn / Winter archive</span>
              <span className="flex items-center gap-space-2xs text-label-sm text-primary-fixed">
                <Icon name="lock" className="text-sm" />
                Private clients
              </span>
            </div>
          </div>
        </div>
        <ul className="hidden flex-col gap-space-md lg:flex">
          {PRIVILEGES.map((privilege) => (
            <li key={privilege.title} className="flex items-start gap-space-md">
              <Icon name={privilege.icon} className="mt-0.5 text-xl text-primary" />
              <div className="flex flex-col">
                <span className="text-label-caps uppercase tracking-wider text-on-surface">{privilege.title}</span>
                <span className="mt-space-2xs max-w-md text-body-sm text-on-surface-variant">{privilege.body}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Form column */}
      <div className="flex flex-col gap-space-lg">
        {/* Segmented switch */}
        <div className="flex w-full items-center justify-between gap-1 rounded-lg bg-surface-container-low p-1 shadow-sm">
          {(['signin', 'register'] as Mode[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMode(tab)}
              className={clsx(
                'flex flex-1 items-center justify-center gap-space-2xs rounded-md py-space-sm text-label-caps uppercase tracking-widest transition-all',
                mode === tab
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              <span className={clsx('h-1.5 w-1.5 rounded-full', mode === tab ? 'bg-primary' : 'bg-transparent')} />
              {tab === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {mode === 'signin' ? (
          <form className="flex flex-col gap-space-lg" onSubmit={submitSignin}>
            <label className="flex flex-col gap-space-2xs">
              <span className="eyebrow">
                Email address <span className="text-primary">*</span>
              </span>
              <span className="flex items-center rounded-lg bg-surface-container-lowest shadow-sm focus-within:ring-1 focus-within:ring-primary">
                <input
                  className="w-full bg-transparent px-space-md py-space-sm text-body-md text-on-surface outline-none placeholder:text-outline"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="client@luxemart.com"
                  value={signin.email}
                  onChange={(event) => setSignin({ ...signin, email: event.target.value })}
                />
                <Icon name="alternate_email" className="pr-space-md text-xl text-outline" />
              </span>
            </label>

            <label className="flex flex-col gap-space-2xs">
              <span className="eyebrow">
                Password <span className="text-primary">*</span>
              </span>
              <span className="relative flex items-center rounded-lg bg-surface-container-lowest shadow-sm focus-within:ring-1 focus-within:ring-primary">
                <input
                  className="w-full bg-transparent py-space-sm pl-space-md pr-12 text-body-md text-on-surface outline-none placeholder:text-outline"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={signin.password}
                  onChange={(event) => setSignin({ ...signin, password: event.target.value })}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-0 bottom-0 top-0 px-space-md text-outline transition-colors hover:text-on-surface"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-xl" />
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="btn-inverse group h-14 w-full justify-between rounded-lg px-space-lg text-label-caps uppercase tracking-widest"
            >
              <span>{busy ? 'Authenticating…' : 'Enter the atelier'}</span>
              <Icon name="east" className="text-lg transition-transform group-hover:translate-x-1" />
            </button>

            <p className="rounded-lg bg-surface-container-low px-space-md py-space-sm text-body-sm text-on-surface-variant">
              Demo access — <span className="font-medium text-on-surface">demo@luxemart.com</span> /{' '}
              <span className="font-medium text-on-surface">demo123</span>
            </p>
          </form>
        ) : (
          <form className="flex flex-col gap-space-lg" onSubmit={submitSignup}>
            <div className="grid grid-cols-2 gap-space-md">
              <label className="flex flex-col gap-space-2xs">
                <span className="eyebrow">Given name <span className="text-primary">*</span></span>
                <input
                  className="field"
                  required
                  autoComplete="given-name"
                  placeholder="Elena"
                  value={signup.firstName}
                  onChange={(event) => setSignup({ ...signup, firstName: event.target.value })}
                />
              </label>
              <label className="flex flex-col gap-space-2xs">
                <span className="eyebrow">Surname <span className="text-primary">*</span></span>
                <input
                  className="field"
                  required
                  autoComplete="family-name"
                  placeholder="Vane"
                  value={signup.lastName}
                  onChange={(event) => setSignup({ ...signup, lastName: event.target.value })}
                />
              </label>
            </div>

            <label className="flex flex-col gap-space-2xs">
              <span className="eyebrow">Email address <span className="text-primary">*</span></span>
              <input
                className="field"
                type="email"
                required
                autoComplete="email"
                placeholder="elena@domain.com"
                value={signup.email}
                onChange={(event) => setSignup({ ...signup, email: event.target.value })}
              />
            </label>

            <label className="flex flex-col gap-space-2xs">
              <span className="eyebrow">Mobile (for courier scheduling)</span>
              <input
                className="field"
                type="tel"
                autoComplete="tel"
                placeholder="+33 6 40 92 11 80"
                value={signup.phone}
                onChange={(event) => setSignup({ ...signup, phone: event.target.value })}
              />
            </label>

            <label className="flex flex-col gap-space-2xs">
              <span className="eyebrow">Create password <span className="text-primary">*</span></span>
              <input
                className="field"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                value={signup.password}
                onChange={(event) => setSignup({ ...signup, password: event.target.value })}
              />
            </label>

            <label className="flex cursor-pointer items-start gap-space-xs">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span className="text-body-sm text-on-surface-variant">
                I accept the terms of sale and the atelier privacy policy.
              </span>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="btn-primary h-14 w-full justify-center rounded-lg text-label-caps uppercase tracking-widest"
            >
              <Icon name="diamond" className="text-lg" />
              {busy ? 'Creating your account…' : 'Create atelier account'}
            </button>
          </form>
        )}

        <div className="flex flex-col gap-space-sm rounded-lg bg-surface-container-low p-space-md">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-space-xs text-label-caps uppercase tracking-wider text-on-surface">
              <Icon name="diamond" className="text-lg text-primary" />
              Membership privileges
            </span>
            <span className="rounded bg-surface-container px-space-2xs py-[2px] text-label-caps uppercase tracking-widest text-primary">
              Complimentary
            </span>
          </div>
          <ul className="flex flex-col gap-space-xs lg:hidden">
            {PRIVILEGES.slice(0, 2).map((privilege) => (
              <li key={privilege.title} className="flex items-start gap-space-xs">
                <Icon name={privilege.icon} className="mt-0.5 text-base text-primary" />
                <span className="flex flex-col">
                  <span className="text-label-caps uppercase tracking-wider text-on-surface">{privilege.title}</span>
                  <span className="text-body-sm text-on-surface-variant">{privilege.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-center text-body-sm text-on-surface-variant">
          {mode === 'signin' ? 'New to LUXEMART? ' : 'Already a client? '}
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'register' : 'signin')}
            className="font-medium text-primary transition-colors hover:text-primary-container"
          >
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </button>
          {' · '}
          <Link to="/products" className="font-medium text-primary transition-colors hover:text-primary-container">
            Browse without an account
          </Link>
        </p>
      </div>
    </div>
  );
}
