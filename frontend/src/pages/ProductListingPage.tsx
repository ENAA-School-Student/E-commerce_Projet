import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { products as productsApi, categories as categoriesApi } from '@/lib/api';
import { Product, Category, PageResponse } from '@/types';
import { SlidersHorizontal, X, ChevronDown, Grid3X3, LayoutGrid } from 'lucide-react';

export default function ProductListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pageData, setPageData] = useState<PageResponse<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [gridCols, setGridCols] = useState<2 | 3>(3);

  const categorySlug = searchParams.get('category');
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sort') || 'createdAt,desc';
  const currentPage = parseInt(searchParams.get('page') || '0');

  useEffect(() => {
    categoriesApi.list().then((res) => setCategories(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number | undefined> = {
      page: currentPage,
      size: 12,
      sort: sortBy,
    };

    if (categorySlug) {
      const cat = categories.find((c) => c.slug === categorySlug);
      if (cat) params.categoryId = cat.id;
    }
    if (search) params.search = search;

    productsApi.list(params).then((res) => {
      setProducts(res.data.content);
      setPageData(res.data);
    }).finally(() => setLoading(false));
  }, [categorySlug, search, sortBy, currentPage, categories]);

  const pageTitle = categorySlug
    ? categories.find((c) => c.slug === categorySlug)?.name || categorySlug
    : search ? `Results for "${search}"` : 'All Products';

  const sortOptions = [
    { value: 'createdAt,desc', label: 'Newest' },
    { value: 'price,asc', label: 'Price: Low to High' },
    { value: 'price,desc', label: 'Price: High to Low' },
    { value: 'name,asc', label: 'A — Z' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-muted text-xs tracking-widest-xl uppercase mb-2">Collection</p>
          <h1 className="font-display text-display-md">{pageTitle}</h1>
          {pageData && (
            <p className="text-muted text-sm mt-2">{pageData.totalElements} pieces</p>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <button onClick={() => setGridCols(gridCols === 3 ? 2 : 3)} className="p-2 hover:bg-light transition-colors">
            {gridCols === 3 ? <LayoutGrid size={18} /> : <Grid3X3 size={18} />}
          </button>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-light">
        <div className="flex items-center gap-2">
          {categorySlug && (
            <button onClick={() => { searchParams.delete('category'); setSearchParams(searchParams); }} className="flex items-center gap-1 bg-charcoal text-white text-xs px-3 py-1.5 tracking-wide">
              {pageTitle} <X size={12} />
            </button>
          )}
          {search && (
            <button onClick={() => { searchParams.delete('search'); setSearchParams(searchParams); }} className="flex items-center gap-1 bg-charcoal text-white text-xs px-3 py-1.5 tracking-wide">
              {search} <X size={12} />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => { searchParams.set('sort', e.target.value); setSearchParams(searchParams); }}
            className="appearance-none bg-transparent text-sm pr-6 cursor-pointer outline-none font-medium"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-muted" />
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.filter((c) => !c.parentId).map((cat) => (
          <Link
            key={cat.id}
            to={`/products?category=${cat.slug}`}
            className={`text-xs px-4 py-2 border transition-colors ${
              categorySlug === cat.slug
                ? 'bg-charcoal text-white border-charcoal'
                : 'border-light hover:border-charcoal'
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className={`grid gap-4 lg:gap-6 ${gridCols === 3 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2'}`}>
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] bg-light mb-3" />
              <div className="h-4 bg-light w-2/3 mb-2" />
              <div className="h-3 bg-light w-1/3" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-muted text-sm">No products found.</p>
        </div>
      ) : (
        <div className={`grid gap-4 lg:gap-6 ${gridCols === 3 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2'}`}>
          {products.map((product) => (
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

      {/* Pagination */}
      {pageData && pageData.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-12">
          {Array.from({ length: pageData.totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => { searchParams.set('page', String(i)); setSearchParams(searchParams); }}
              className={`w-9 h-9 text-sm font-medium transition-colors ${
                i === currentPage ? 'bg-charcoal text-white' : 'hover:bg-light'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
