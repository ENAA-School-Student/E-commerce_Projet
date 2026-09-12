import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { orders } from '@/lib/api';
import { CreditCard, Truck, MapPin, Check } from 'lucide-react';
import toast from 'react-hot-toast';

type Step = 1 | 2 | 3;

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  const [shipping, setShipping] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    street: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'France',
    phone: '',
  });

  const [paymentMethod, setPaymentMethod] = useState('card');

  const shippingCost = (cart?.subtotal ?? 0) >= 150 ? 0 : 9.90;
  const tax = (cart?.subtotal ?? 0) * 0.20;
  const total = (cart?.subtotal ?? 0) + shippingCost + tax;

  const handleOrder = async () => {
    if (!cart) return;
    setLoading(true);
    try {
      const res = await orders.checkout({
        items: cart.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        shippingFirstName: shipping.firstName,
        shippingLastName: shipping.lastName,
        shippingStreet: shipping.street,
        shippingApartment: shipping.apartment,
        shippingCity: shipping.city,
        shippingState: shipping.state,
        shippingZipCode: shipping.zipCode,
        shippingCountry: shipping.country,
        shippingPhone: shipping.phone,
        paymentMethod,
        saveAddress: true,
      });
      await clearCart();
      toast.success('Order placed successfully!');
      navigate(`/profile?order=${res.data.id}`);
    } catch {
      toast.error('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!cart || cart.items.length === 0) {
    navigate('/cart');
    return null;
  }

  const steps = [
    { num: 1, label: 'Shipping', icon: <Truck size={16} /> },
    { num: 2, label: 'Payment', icon: <CreditCard size={16} /> },
    { num: 3, label: 'Review', icon: <Check size={16} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-display text-display-md mb-8 text-center">Checkout</h1>

      {/* Steps */}
      <div className="flex items-center justify-center gap-4 mb-12">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s.num as Step)}
              className={`flex items-center gap-2 text-xs font-medium tracking-wide transition-colors ${
                step >= s.num ? 'text-charcoal' : 'text-muted'
              }`}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                step > s.num ? 'bg-primary text-white' :
                step === s.num ? 'bg-charcoal text-white' : 'bg-light text-muted'
              }`}>
                {step > s.num ? <Check size={12} /> : s.num}
              </span>
              {s.label}
            </button>
            {i < steps.length - 1 && <div className="w-12 h-px bg-light" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          {/* Step 1: Shipping */}
          {step === 1 && (
            <div>
              <h2 className="font-display text-xl mb-6 flex items-center gap-2"><MapPin size={18} /> Shipping Address</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'firstName', label: 'First Name', required: true },
                  { key: 'lastName', label: 'Last Name', required: true },
                  { key: 'street', label: 'Street Address', required: true, colSpan: true },
                  { key: 'apartment', label: 'Apartment, suite, etc.' },
                  { key: 'city', label: 'City', required: true },
                  { key: 'zipCode', label: 'Postal Code', required: true },
                ].map((field) => (
                  <div key={field.key} className={field.colSpan ? 'col-span-2' : ''}>
                    <label className="text-xs font-medium tracking-wide uppercase mb-1.5 block text-charcoal/70">{field.label}</label>
                    <input
                      type="text"
                      required={field.required}
                      value={(shipping as Record<string, string>)[field.key] || ''}
                      onChange={(e) => setShipping({ ...shipping, [field.key]: e.target.value })}
                      className="w-full border border-light px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal transition-colors"
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="text-xs font-medium tracking-wide uppercase mb-1.5 block text-charcoal/70">Country</label>
                  <select
                    value={shipping.country}
                    onChange={(e) => setShipping({ ...shipping, country: e.target.value })}
                    className="w-full border border-light px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal"
                  >
                    <option>France</option>
                    <option>United Kingdom</option>
                    <option>Germany</option>
                    <option>Italy</option>
                    <option>Spain</option>
                  </select>
                </div>
              </div>
              <button onClick={() => setStep(2)} className="mt-6 bg-charcoal text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-charcoal/90 transition-colors">
                Continue to Payment
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div>
              <h2 className="font-display text-xl mb-6 flex items-center gap-2"><CreditCard size={18} /> Payment Method</h2>
              <div className="space-y-3 mb-6">
                {[
                  { id: 'card', label: 'Credit / Debit Card' },
                  { id: 'paypal', label: 'PayPal' },
                  { id: 'bank', label: 'Bank Transfer' },
                ].map((m) => (
                  <label key={m.id} className={`flex items-center gap-3 p-4 border cursor-pointer transition-colors ${paymentMethod === m.id ? 'border-charcoal bg-light/50' : 'border-light hover:border-muted'}`}>
                    <input type="radio" name="payment" value={m.id} checked={paymentMethod === m.id} onChange={(e) => setPaymentMethod(e.target.value)} className="accent-charcoal" />
                    <span className="text-sm font-medium">{m.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="border border-light px-6 py-3 text-sm font-medium hover:border-charcoal transition-colors">Back</button>
                <button onClick={() => setStep(3)} className="bg-charcoal text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-charcoal/90 transition-colors">Review Order</button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div>
              <h2 className="font-display text-xl mb-6">Review Your Order</h2>
              <div className="space-y-4 mb-6">
                <div className="bg-light p-4 text-sm">
                  <p className="font-medium mb-1">Shipping to</p>
                  <p className="text-charcoal/70">{shipping.firstName} {shipping.lastName}</p>
                  <p className="text-charcoal/70">{shipping.street}{shipping.apartment ? `, ${shipping.apartment}` : ''}</p>
                  <p className="text-charcoal/70">{shipping.zipCode} {shipping.city}, {shipping.country}</p>
                </div>
                <div className="bg-light p-4 text-sm">
                  <p className="font-medium mb-1">Payment</p>
                  <p className="text-charcoal/70 capitalize">{paymentMethod === 'card' ? 'Credit Card' : paymentMethod}</p>
                </div>
                <div className="bg-light p-4">
                  <p className="font-medium text-sm mb-2">{cart.items.length} item{cart.items.length > 1 ? 's' : ''}</p>
                  <div className="space-y-2">
                    {cart.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 text-sm">
                        <img src={item.imageUrl} alt="" className="w-12 h-12 object-cover bg-white" />
                        <div className="flex-1">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-muted">{[item.size, item.color].filter(Boolean).join(' / ')} · Qty: {item.quantity}</p>
                        </div>
                        <span className="font-medium">${item.lineTotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="border border-light px-6 py-3 text-sm font-medium hover:border-charcoal transition-colors">Back</button>
                <button onClick={handleOrder} disabled={loading} className="bg-primary text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {loading ? 'Placing order...' : `Place Order — $${total.toFixed(2)}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h3 className="font-display text-lg mb-4">Summary</h3>
          <div className="space-y-2 text-sm mb-4">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span className="text-charcoal/70 truncate max-w-[200px]">{item.productName} × {item.quantity}</span>
                <span className="font-medium">${item.lineTotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-light pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-charcoal/70">Subtotal</span><span>${cart.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-charcoal/70">Shipping</span><span>{shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</span></div>
            <div className="flex justify-between"><span className="text-charcoal/70">Tax (20%)</span><span>${tax.toFixed(2)}</span></div>
            <div className="flex justify-between pt-3 border-t border-light font-medium text-base">
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
