import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { Minus, Plus, X, ArrowRight, ShoppingBag } from 'lucide-react';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const shipping = (cart?.subtotal ?? 0) >= 150 ? 0 : 9.90;
  const tax = ((cart?.subtotal ?? 0) * 0.20);
  const total = (cart?.subtotal ?? 0) + shipping + tax;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <ShoppingBag size={48} strokeWidth={1} className="mx-auto text-muted mb-4" />
        <h1 className="font-display text-display-sm mb-2">Your bag is empty</h1>
        <p className="text-muted text-sm mb-6">Discover our curated collection of refined essentials.</p>
        <Link to="/products" className="inline-flex bg-charcoal text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-charcoal/90 transition-colors">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-display text-display-md mb-8">Shopping Bag</h1>
      <div className="grid lg:grid-cols-3 gap-12">
        {/* Items */}
        <div className="lg:col-span-2 space-y-6">
          {cart.items.map((item) => (
            <div key={item.id} className="flex gap-4 pb-6 border-b border-light">
              <Link to={`/product/${item.productSlug}`} className="w-28 h-36 flex-shrink-0 bg-light overflow-hidden">
                <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
              </Link>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <Link to={`/product/${item.productSlug}`} className="text-sm font-medium hover:text-primary transition-colors">{item.productName}</Link>
                      <p className="text-xs text-muted mt-0.5">
                        {[item.size, item.color].filter(Boolean).join(' / ')}
                      </p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-muted hover:text-charcoal transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center border border-light">
                    <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} className="px-2 py-1 hover:bg-light transition-colors"><Minus size={12} /></button>
                    <span className="px-3 py-1 text-xs font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 py-1 hover:bg-light transition-colors"><Plus size={12} /></button>
                  </div>
                  <span className="text-sm font-medium">${item.lineTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="font-display text-xl mb-6">Order Summary</h2>
          <div className="space-y-3 text-sm mb-6">
            <div className="flex justify-between"><span className="text-charcoal/70">Subtotal</span><span className="font-medium">${cart.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-charcoal/70">Shipping</span><span className="font-medium">{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span></div>
            <div className="flex justify-between"><span className="text-charcoal/70">Tax (20%)</span><span className="font-medium">${tax.toFixed(2)}</span></div>
            {shipping > 0 && <p className="text-xs text-primary">Add ${(150 - cart.subtotal).toFixed(2)} more for free shipping</p>}
          </div>
          <div className="flex justify-between py-4 border-t border-light text-base font-medium">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <Link to="/checkout" className="mt-6 flex items-center justify-center gap-2 bg-charcoal text-white py-3.5 text-sm font-medium tracking-wide hover:bg-charcoal/90 transition-colors w-full">
            Proceed to Checkout <ArrowRight size={14} />
          </Link>
          <Link to="/products" className="mt-4 flex items-center justify-center text-sm text-muted hover:text-charcoal transition-colors">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
