import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { users, orders } from '@/lib/api';
import { User, Order, Address } from '@/types';
import { Package, MapPin, UserCircle, LogOut, ChevronRight, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'orders' | 'addresses' | 'profile';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('orders');
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [profileData, setProfileData] = useState<Partial<User>>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    Promise.all([
      orders.list(0, 50).then((res) => setOrdersList(res.data.content)),
      users.addresses().then((res) => setAddresses(res.data)),
      users.me().then((res) => setProfileData(res.data)),
    ]).finally(() => setLoading(false));
  }, [user, navigate]);

  const handleUpdateProfile = async () => {
    try {
      await users.update(profileData);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'orders', label: 'Orders', icon: <Package size={16} /> },
    { id: 'addresses', label: 'Addresses', icon: <MapPin size={16} /> },
    { id: 'profile', label: 'Profile', icon: <UserCircle size={16} /> },
  ];

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PROCESSING: 'bg-blue-100 text-blue-800',
    SHIPPED: 'bg-purple-100 text-purple-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-muted text-xs tracking-widest-xl uppercase mb-2">Account</p>
          <h1 className="font-display text-display-md">{user?.firstName}'s Space</h1>
        </div>
        <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-2 text-sm text-muted hover:text-charcoal transition-colors">
          <LogOut size={14} /> Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-light mb-8">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSelectedOrder(null); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-charcoal text-charcoal' : 'border-transparent text-muted hover:text-charcoal'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Orders Tab */}
      {tab === 'orders' && !selectedOrder && (
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map((i) => <div key={i} className="h-20 bg-light animate-pulse" />)}
            </div>
          ) : ordersList.length === 0 ? (
            <p className="text-muted text-sm py-8 text-center">No orders yet.</p>
          ) : (
            ordersList.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="w-full flex items-center justify-between p-4 bg-light hover:bg-light/70 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · {order.items.length} item{order.items.length > 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-2 py-0.5 font-medium tracking-wide ${statusColors[order.status] || 'bg-light'}`}>{order.status}</span>
                  <span className="text-sm font-medium">${order.total.toFixed(2)}</span>
                  <ChevronRight size={14} className="text-muted" />
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Order Detail */}
      {tab === 'orders' && selectedOrder && (
        <div>
          <button onClick={() => setSelectedOrder(null)} className="text-sm text-muted hover:text-charcoal mb-4">← Back to orders</button>
          <div className="bg-light p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-muted mb-1">Order</p>
                <p className="font-medium">{selectedOrder.orderNumber}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 font-medium tracking-wide ${statusColors[selectedOrder.status] || ''}`}>{selectedOrder.status}</span>
            </div>
            <div className="space-y-2 text-sm">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <img src={item.imageUrl} alt="" className="w-12 h-12 object-cover bg-white" />
                  <div className="flex-1">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-muted">{[item.size, item.color].filter(Boolean).join(' / ')} · Qty: {item.quantity}</p>
                  </div>
                  <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-white/20 mt-4 pt-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-charcoal/70">Subtotal</span><span>${selectedOrder.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-charcoal/70">Shipping</span><span>{selectedOrder.shippingCost === 0 ? 'Free' : `$${selectedOrder.shippingCost.toFixed(2)}`}</span></div>
              <div className="flex justify-between font-medium pt-2"><span>Total</span><span>${selectedOrder.total.toFixed(2)}</span></div>
            </div>
          </div>
          {selectedOrder.shippingAddress && (
            <div className="bg-light p-4 text-sm">
              <p className="font-medium mb-1">Shipping to</p>
              <p className="text-charcoal/70">{selectedOrder.shippingAddress.firstName} {selectedOrder.shippingAddress.lastName}</p>
              <p className="text-charcoal/70">{selectedOrder.shippingAddress.street}</p>
              <p className="text-charcoal/70">{selectedOrder.shippingAddress.zipCode} {selectedOrder.shippingAddress.city}</p>
            </div>
          )}
        </div>
      )}

      {/* Addresses Tab */}
      {tab === 'addresses' && (
        <div>
          <div className="grid sm:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div key={addr.id} className={`p-4 border ${addr.isDefault ? 'border-charcoal' : 'border-light'} relative`}>
                {addr.isDefault && <span className="absolute top-2 right-2 text-[10px] text-primary font-medium">DEFAULT</span>}
                <p className="text-sm font-medium">{addr.firstName} {addr.lastName}</p>
                <p className="text-xs text-charcoal/70 mt-1">{addr.street}{addr.apartment ? `, ${addr.apartment}` : ''}</p>
                <p className="text-xs text-charcoal/70">{addr.zipCode} {addr.city}</p>
                <p className="text-xs text-charcoal/70">{addr.country}</p>
              </div>
            ))}
            <button className="p-4 border border-dashed border-light hover:border-charcoal transition-colors flex items-center justify-center text-sm text-muted hover:text-charcoal">
              + Add Address
            </button>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="max-w-md space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium tracking-wide uppercase mb-1.5 block text-charcoal/70">First Name</label>
              <input
                type="text"
                value={profileData.firstName || ''}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                className="w-full border border-light px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium tracking-wide uppercase mb-1.5 block text-charcoal/70">Last Name</label>
              <input
                type="text"
                value={profileData.lastName || ''}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                className="w-full border border-light px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium tracking-wide uppercase mb-1.5 block text-charcoal/70">Email</label>
            <input
              type="email"
              value={profileData.email || ''}
              disabled
              className="w-full border border-light px-3 py-2.5 text-sm bg-light/50 text-muted"
            />
          </div>
          <div>
            <label className="text-xs font-medium tracking-wide uppercase mb-1.5 block text-charcoal/70">Phone</label>
            <input
              type="tel"
              value={profileData.phone || ''}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              className="w-full border border-light px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal transition-colors"
            />
          </div>
          <button onClick={handleUpdateProfile} className="bg-charcoal text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-charcoal/90 transition-colors">
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
