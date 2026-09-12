import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { products as productsApi, reviews as reviewsApi } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Product, Review } from '@/types';
import { Heart, Star, Truck, RotateCcw, Shield, ChevronDown, Minus, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const { addToCart } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      productsApi.bySlug(slug),
      reviewsApi.forProduct(parseInt(slug.match(/\d+/)?.[0] || '0')),
    ]).then(([p, r]) => {
      setProduct(p.data);
      setReviews(r.data);
      if (p.data.variants?.length > 0) {
        setSelectedVariant(p.data.variants[0].id);
      }
    }).catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-8 animate-pulse">
          <div className="aspect-square bg-light" />
          <div className="space-y-4">
            <div className="h-6 bg-light w-1/3" />
            <div className="h-10 bg-light w-2/3" />
            <div className="h-8 bg-light w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-muted text-lg">Product not found.</p>
        <Link to="/products" className="text-primary text-sm mt-4 inline-block">Back to shop</Link>
      </div>
    );
  }

  const variant = product.variants.find((v) => v.id === selectedVariant);
  const selectedSize = variant?.size;
  const sizes = [...new Set(product.variants.map((v) => v.size).filter(Boolean))];
  const colors = [...new Set(product.variants.map((v) => v.color).filter(Boolean))];
  const inStock = variant ? variant.stock > 0 : product.variants.some((v) => v.stock > 0);

  const handleAddToCart = async () => {
    if (!user) { toast.error('Please login first'); return; }
    await addToCart(product.id, quantity, selectedVariant || undefined);
  };

  const avgRating = product.averageRating;
  const reviewCount = product.reviewCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted mb-8 flex items-center gap-2">
        <Link to="/" className="hover:text-charcoal transition-colors">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-charcoal transition-colors">Shop</Link>
        {product.categoryName && (
          <>
            <span>/</span>
            <Link to={`/products?category=${product.categoryName.toLowerCase()}`} className="hover:text-charcoal transition-colors">{product.categoryName}</Link>
          </>
        )}
        <span>/</span>
        <span className="text-charcoal">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
        {/* Images */}
        <div>
          <div className="aspect-square overflow-hidden bg-light mb-3">
            <img
              src={product.images[activeImageIdx]?.imageUrl}
              alt={product.images[activeImageIdx]?.altText || product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`aspect-square overflow-hidden border-2 transition-colors ${idx === activeImageIdx ? 'border-charcoal' : 'border-transparent hover:border-light'}`}
                >
                  <img src={img.imageUrl} alt={img.altText || ''} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-muted text-xs tracking-widest-xl uppercase mb-2">{product.brand}</p>
          <h1 className="font-display text-display-sm mb-3">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map((star) => (
                <Star key={star} size={14} className={star <= Math.round(avgRating) ? 'fill-primary text-primary' : 'text-muted'} />
              ))}
            </div>
            <span className="text-xs text-muted">{avgRating.toFixed(1)} ({reviewCount} reviews)</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-2xl font-light">${product.price.toFixed(2)}</span>
            {product.compareAtPrice && (
              <>
                <span className="text-lg text-muted line-through">${product.compareAtPrice.toFixed(2)}</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 font-medium tracking-wide">
                  Save {Math.round((1 - product.price / product.compareAtPrice) * 100)}%
                </span>
              </>
            )}
          </div>

          <p className="text-sm text-charcoal/70 leading-relaxed mb-8">{product.description}</p>

          {/* Colors */}
          {colors.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-medium tracking-wide uppercase mb-3">Color — <span className="font-normal text-charcoal/70">{variant?.color}</span></p>
              <div className="flex gap-2">
                {colors.map((color) => {
                  const colorHex = product.variants.find((v) => v.color === color)?.colorHex;
                  const isActive = variant?.color === color;
                  return (
                    <button
                      key={color}
                      onClick={() => {
                        const v = product.variants.find((v) => v.color === color && (!selectedSize || v.size === selectedSize));
                        if (v) setSelectedVariant(v.id);
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-colors ${isActive ? 'border-charcoal scale-110' : 'border-light hover:border-muted'}`}
                      style={{ backgroundColor: colorHex || '#ccc' }}
                      title={color}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Sizes */}
          {sizes.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium tracking-wide uppercase">Size — <span className="font-normal text-charcoal/70">{selectedSize}</span></p>
                <button onClick={() => setSizeGuideOpen(!sizeGuideOpen)} className="text-xs text-muted underline hover:text-charcoal">Size Guide</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const v = product.variants.find((v) => v.size === size && v.color === variant?.color);
                  const isActive = selectedSize === size;
                  const isAvailable = v && v.stock > 0;
                  return (
                    <button
                      key={size}
                      disabled={!isAvailable}
                      onClick={() => { if (v) setSelectedVariant(v.id); }}
                      className={`min-w-[44px] h-10 px-3 text-xs font-medium border transition-colors ${
                        isActive ? 'bg-charcoal text-white border-charcoal' :
                        isAvailable ? 'border-light hover:border-charcoal' :
                        'border-light text-muted cursor-not-allowed line-through'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <p className="text-xs font-medium tracking-wide uppercase">Quantity</p>
            <div className="flex items-center border border-light">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 hover:bg-light transition-colors"><Minus size={14} /></button>
              <span className="px-4 py-2 text-sm font-medium min-w-[40px] text-center">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="px-3 py-2 hover:bg-light transition-colors"><Plus size={14} /></button>
            </div>
          </div>

          {/* Add to Cart */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={handleAddToCart}
              disabled={!inStock}
              className={`flex-1 py-3.5 text-sm font-medium tracking-wide transition-colors ${
                inStock ? 'bg-charcoal text-white hover:bg-charcoal/90' : 'bg-light text-muted cursor-not-allowed'
              }`}
            >
              {inStock ? 'Add to Bag' : 'Out of Stock'}
            </button>
            <button className="p-3.5 border border-light hover:border-primary hover:text-primary transition-colors">
              <Heart size={18} strokeWidth={1.5} />
            </button>
          </div>

          {/* Trust */}
          <div className="grid grid-cols-3 gap-4 py-6 border-t border-light">
            {[
              { icon: <Truck size={18} />, text: 'Free shipping over $150' },
              { icon: <RotateCcw size={18} />, text: '30-day returns' },
              { icon: <Shield size={18} />, text: 'Authenticity guaranteed' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="flex justify-center text-primary mb-1">{item.icon}</div>
                <p className="text-[10px] text-muted leading-tight">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Accordion */}
          <div className="border-t border-light mt-2">
            {['Composition & Care', 'Shipping', 'Returns'].map((title, i) => (
              <details key={i} className="group border-b border-light">
                <summary className="flex items-center justify-between py-4 cursor-pointer text-sm font-medium">
                  {title}
                  <ChevronDown size={14} className="text-muted transition-transform group-open:rotate-180" />
                </summary>
                <div className="pb-4 text-sm text-charcoal/70 leading-relaxed">
                  {title === 'Composition & Care' && '100% premium materials. Dry clean recommended. Made with care.'}
                  {title === 'Shipping' && 'Standard: 3-5 business days. Express: 1-2 business days. Free shipping on orders over $150.'}
                  {title === 'Returns' && 'Free returns within 30 days. Items must be unworn with tags attached.'}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-20 border-t border-light pt-12">
        <h2 className="font-display text-display-sm mb-8">Reviews ({reviewCount})</h2>
        {reviews.length === 0 ? (
          <p className="text-muted text-sm">No reviews yet. Be the first to review this product.</p>
        ) : (
          <div className="space-y-6 max-w-2xl">
            {reviews.map((review) => (
              <div key={review.id} className="pb-6 border-b border-light">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} size={12} className={s <= review.rating ? 'fill-primary text-primary' : 'text-muted'} />
                    ))}
                  </div>
                  <span className="text-xs text-muted">{review.userFirstName}</span>
                  {review.verified && <span className="text-[10px] text-primary font-medium">Verified</span>}
                </div>
                {review.title && <p className="text-sm font-medium mb-1">{review.title}</p>}
                <p className="text-sm text-charcoal/70">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
