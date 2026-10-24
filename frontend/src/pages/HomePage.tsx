import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Icon from '@/components/Icon';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import SmartImage from '@/components/SmartImage';
import { Eyebrow, SectionHeading } from '@/components/Primitives';
import { categories as categoriesApi, products as productsApi } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { Category, Product } from '@/types';
import { formatMoney } from '@/lib/format';

export default function HomePage() {
  const config = useStoreConfig();
  const { addToCart } = useCart();
  const { items: recent } = useRecentlyViewed();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [arrivals, setArrivals] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productsApi.featured(0, 8),
      productsApi.list({ sort: 'createdAt,desc', size: 6 }),
      categoriesApi.list(),
    ])
      .then(([featuredRes, arrivalsRes, categoriesRes]) => {
        setFeatured(featuredRes.data.content);
        setArrivals(arrivalsRes.data.content);
        setCategories(categoriesRes.data.filter((category: Category) => !category.parentId));
      })
      .finally(() => setLoading(false));
  }, []);

  const quickAdd = async (product: Product) => {
    const variant = product.variants?.find((v) => v.stock > 0);
    if (!variant) {
      toast.error('Sold out in every size');
      return;
    }
    await addToCart(product.id, 1, variant.id);
  };

  const hero = arrivals[0] ?? featured[0];

  return (
    <div className="mx-auto max-w-[1400px] px-margin-mobile sm:px-margin-tablet lg:px-margin-desktop">
      {/* Hero */}
      <section className="relative -mx-margin-mobile overflow-hidden bg-surface-container sm:mx-0 sm:rounded-2xl">
        <div className="relative h-[78vh] min-h-[520px] w-full">
          {hero?.images?.[0]?.imageUrl ? (
            <SmartImage
              src={hero.images[0].imageUrl}
              alt={hero.name}
              monogram="LUXEMART"
              eager
              className="h-full w-full"
              imgClassName="animate-ken-burns"
            />
          ) : (
            <div className="h-full w-full bg-surface-container-high" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-on-surface/90 via-on-surface/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-margin-mobile pb-space-2xl sm:px-space-2xl">
            <div className="max-w-2xl">
              <Eyebrow className="mb-space-xs text-primary-fixed">{hero?.collection ?? 'Autumn-Winter Atelier'}</Eyebrow>
              <h1 className="font-display text-display-hero-mobile text-on-primary sm:text-display-hero">
                Objects of<br className="hidden sm:block" /> quiet permanence
              </h1>
              <p className="mt-space-md max-w-md text-body-lg text-surface-container-high">
                Natural fibres, architectural cuts, and small-batch craft — assembled twice a season.
              </p>
              <div className="mt-space-lg flex flex-wrap gap-space-sm">
                <Link to="/products" className="btn-primary bg-primary-container text-on-primary-container">
                  Shop now
                  <Icon name="arrow_forward" className="text-lg" />
                </Link>
                <Link to="/products?category=accessories" className="btn-tonal border border-inverse-on-surface/30 bg-transparent text-inverse-on-surface hover:bg-inverse-on-surface/10">
                  The accessories edit
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Best sellers */}
      <Reveal>
      <section className="py-space-xl">
        <SectionHeading
          eyebrow="Iconic pieces"
          title="Best sellers"
          action={{ label: 'View all', to: '/products' }}
          className="mb-space-md"
        />
        {loading ? (
          <div className="grid grid-cols-2 gap-space-sm lg:grid-cols-4">
            {[1, 2, 3, 4].map((key) => (
              <ProductCardSkeleton key={key} />
            ))}
          </div>
        ) : (
          <>
            <div className="no-scrollbar -mx-margin-mobile flex snap-x snap-mandatory gap-space-sm overflow-x-auto px-margin-mobile pb-space-xs sm:hidden">
              {featured.slice(0, 6).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  currency={config.currency}
                  lowStockThreshold={config.lowStockThreshold}
                  onQuickAdd={quickAdd}
                  className="w-[240px] shrink-0 snap-start"
                />
              ))}
            </div>
            <div className="hidden grid-cols-2 gap-space-lg lg:grid-cols-4">
              {featured.slice(0, 4).map((product) => (
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
          </>
        )}
      </section>
      </Reveal>

      {/* Categories */}
      <Reveal delay={80}>
      <section className="py-space-md">
        <div className="mb-space-md">
          <Eyebrow className="mb-space-2xs text-primary-container">Collections</Eyebrow>
          <h2 className="font-display text-headline-md">Shop by category</h2>
        </div>
        <div className="grid grid-cols-2 gap-space-xs sm:gap-space-sm lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/products?category=${category.slug}`}
              className="group relative flex h-40 flex-col justify-end overflow-hidden rounded-xl p-space-sm lg:h-56"
            >
              <SmartImage
                src={category.imageUrl}
                alt={category.name}
                monogram={category.name}
                className="absolute inset-0 h-full w-full bg-transparent"
                imgClassName="transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-on-surface/85 via-on-surface/20 to-transparent" />
              <div className="relative z-10">
                <span className="block font-display text-headline-sm text-on-primary transition-colors group-hover:text-primary-fixed">
                  {category.name}
                </span>
                <span className="eyebrow text-[10px] text-surface-container-high">{category.productCount} items</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      </Reveal>

      {/* Recently viewed */}
      {!loading && recent.length > 0 && (
        <Reveal delay={60}>
        <section className="py-space-md">
          <div className="mb-space-md flex items-baseline justify-between gap-space-md">
            <div>
              <Eyebrow className="mb-space-2xs text-primary-container">Your trail</Eyebrow>
              <h2 className="font-display text-headline-md">Recently viewed</h2>
            </div>
            <Link to="/products" className="text-label-caps uppercase tracking-widest text-primary transition-colors hover:text-primary-container">
              Browse all
            </Link>
          </div>
          <div className="no-scrollbar -mx-margin-mobile flex gap-space-sm overflow-x-auto px-margin-mobile pb-space-xs sm:mx-0 sm:px-0">
            {recent.map((product) => (
              <ProductCard
                key={`recent-${product.id}`}
                product={product}
                variant="mini"
                currency={config.currency}
                className="w-64 shrink-0 rounded-xl border border-outline-variant/30"
              />
            ))}
          </div>
        </section>
        </Reveal>
      )}

      {/* Editorial spotlight */}
      <Reveal delay={100}>
      {!loading && arrivals.length > 0 && (
        <section className="py-space-md">
          <div className="mb-space-md flex items-baseline justify-between gap-space-md">
            <div>
              <Eyebrow className="mb-space-2xs text-primary-container">Editorial feature</Eyebrow>
              <h2 className="font-display text-headline-md">New arrivals</h2>
            </div>
            <span className="rounded bg-primary-container px-space-xs py-1 text-label-caps uppercase text-on-primary">
              New in
            </span>
          </div>

          <div className="mb-space-sm flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-card lg:flex-row">
            <div className="relative h-64 w-full lg:h-80 lg:w-2/3">
              <SmartImage
                src={arrivals[0].images?.[0]?.imageUrl}
                alt={arrivals[0].name}
                monogram={arrivals[0].name}
                className="h-full w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-on-surface/90 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-space-md">
                <Eyebrow className="mb-space-2xs text-primary-fixed">{arrivals[0].categoryName}</Eyebrow>
                <h3 className="font-display text-headline-lg text-on-primary">{arrivals[0].name}</h3>
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-between gap-space-md p-space-md">
              <p className="text-body-md text-on-surface-variant">
                {arrivals[0].description ?? 'Fresh from the atelier, cut in this season’s fabrications.'}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-display text-headline-sm">{formatMoney(arrivals[0].price, config.currency)}</span>
                <Link to={`/product/${arrivals[0].slug}`} className="btn-tonal">
                  Explore
                  <Icon name="arrow_forward" className="text-base" />
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-space-sm lg:grid-cols-4">
            {arrivals.slice(1, 5).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={config.currency}
                lowStockThreshold={config.lowStockThreshold}
                onQuickAdd={quickAdd}
              />
            ))}
          </div>
        </section>
      )}
      </Reveal>

      {/* Value props */}
      <Reveal delay={120}>
      <section className="py-space-md">
        <div className="space-y-space-md rounded-2xl bg-surface-container-low p-space-lg shadow-card lg:grid lg:grid-cols-3 lg:space-y-0">
          {[
            {
              icon: 'local_shipping',
              title: 'Complimentary carbon-neutral shipping',
              body: `On every order over ${formatMoney(config.freeShippingThreshold, config.currency)}.`,
            },
            {
              icon: 'architecture',
              title: 'Handcrafted in small batches',
              body: 'Partnering with multi-generational artisan workshops.',
            },
            {
              icon: 'sync_alt',
              title: '30-day effortless returns',
              body: 'Pre-paid labels and frictionless doorstep collection.',
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-space-md">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-primary-container shadow-sm">
                <Icon name={item.icon} className="text-xl" />
              </span>
              <div>
                <h4 className="text-body-md font-semibold leading-tight">{item.title}</h4>
                <p className="mt-space-2xs text-body-sm text-on-surface-variant">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      </Reveal>
    </div>
  );
}
