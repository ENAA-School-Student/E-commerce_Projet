import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { products as productsApi, categories as categoriesApi } from '@/lib/api';
import { Product, Category } from '@/types';

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productsApi.featured(0, 6),
      categoriesApi.list(),
    ]).then(([p, c]) => {
      setFeatured(p.data.content);
      setCategories(c.data.filter((cat: Category) => !cat.parentId));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[90vh] bg-charcoal flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1920&auto=format&fit=crop"
            alt="LUXEMART"
            className="w-full h-full object-cover opacity-40"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-xl">
            <p className="text-white/50 text-sm tracking-widest-xl uppercase mb-4 font-body">FW Collection 2024</p>
            <h1 className="font-display text-display-xl text-white mb-6">
              The Art of<br />Refined Living
            </h1>
            <p className="text-white/60 text-lg font-light mb-10 max-w-md leading-relaxed">
              Curated essentials where form follows function. Each piece selected for its craft, material, and enduring beauty.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products?category=women" className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-sm font-medium tracking-wide transition-colors">
                Shop Women
              </Link>
              <Link to="/products?category=men" className="border border-white/30 hover:border-white text-white px-8 py-3 text-sm font-medium tracking-wide transition-colors">
                Shop Men
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <p className="text-muted text-xs tracking-widest-xl uppercase mb-3">Browse by</p>
        <h2 className="font-display text-display-md mb-12">Collections</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link key={cat.id} to={`/products?category=${cat.slug}`} className="group relative aspect-[4/5] overflow-hidden bg-light">
              {cat.imageUrl && (
                <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6">
                <h3 className="font-display text-white text-xl mb-1">{cat.name}</h3>
                <p className="text-white/60 text-xs tracking-wide">{cat.productCount} pieces</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-muted text-xs tracking-widest-xl uppercase mb-3">Editor's pick</p>
              <h2 className="font-display text-display-md">Featured</h2>
            </div>
            <Link to="/products" className="text-sm font-medium flex items-center gap-2 hover:text-primary transition-colors group">
              View all <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-muted/20 mb-3" />
                  <div className="h-4 bg-muted/20 w-2/3 mb-2" />
                  <div className="h-3 bg-muted/20 w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {featured.map((product) => (
                <Link key={product.id} to={`/product/${product.slug}`} className="group">
                  <div className="relative aspect-[3/4] overflow-hidden bg-light mb-3">
                    <img
                      src={product.images[0]?.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {product.compareAtPrice && (
                      <span className="absolute top-3 left-3 bg-charcoal text-white text-[10px] px-2 py-1 tracking-wide uppercase">Sale</span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-charcoal mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">${product.price.toFixed(2)}</span>
                    {product.compareAtPrice && (
                      <span className="text-sm text-muted line-through">${product.compareAtPrice.toFixed(2)}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Banner */}
      <section className="relative h-[60vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1920&auto=format&fit=crop"
            alt="LUXEMART Atelier"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-lg bg-cream/95 backdrop-blur-sm p-10">
            <p className="text-muted text-xs tracking-widest-xl uppercase mb-3">New Season</p>
            <h2 className="font-display text-display-sm mb-4">The Atelier Edit</h2>
            <p className="text-sm text-charcoal/70 font-light mb-6 leading-relaxed">
              Hand-selected pieces from our workshop. Limited quantities, crafted with intention.
            </p>
            <Link to="/products" className="inline-flex bg-charcoal text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-charcoal/90 transition-colors">
              Explore Collection
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
