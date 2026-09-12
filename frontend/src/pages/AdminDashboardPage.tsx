import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { admin } from '@/lib/api';
import { AdminAnalytics } from '@/types';
import { BarChart3, ShoppingCart, Users, Package, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin) { navigate('/'); return; }
    admin.analytics(30).then((res) => setAnalytics(res.data)).finally(() => setLoading(false));
  }, [user, isAdmin, navigate]);

  if (loading || !analytics) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1,2,3,4].map((i) => <div key={i} className="h-28 bg-light" />)}
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Revenue', value: `$${analytics.totalRevenue.toLocaleString()}`, icon: <DollarSign size={18} />, color: 'bg-green-50 text-green-600' },
    { label: 'Orders', value: analytics.totalOrders.toString(), icon: <ShoppingCart size={18} />, color: 'bg-blue-50 text-blue-600' },
    { label: 'Customers', value: analytics.totalCustomers.toString(), icon: <Users size={18} />, color: 'bg-purple-50 text-purple-600' },
    { label: 'Products', value: analytics.totalProducts.toString(), icon: <Package size={18} />, color: 'bg-amber-50 text-amber-600' },
  ];

  const orderStatuses = [
    { label: 'Pending', value: analytics.pendingOrders, color: 'bg-yellow-400' },
    { label: 'Processing', value: analytics.processingOrders, color: 'bg-blue-400' },
    { label: 'Shipped', value: analytics.shippedOrders, color: 'bg-purple-400' },
    { label: 'Delivered', value: analytics.deliveredOrders, color: 'bg-green-400' },
    { label: 'Cancelled', value: analytics.cancelledOrders, color: 'bg-red-400' },
  ];

  const maxRevenue = Math.max(...Object.values(analytics.revenueByDay), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-muted text-xs tracking-widest-xl uppercase mb-2">Admin</p>
          <h1 className="font-display text-display-md">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/admin/products')} className="bg-charcoal text-white px-4 py-2 text-xs font-medium tracking-wide hover:bg-charcoal/90 transition-colors">
            Manage Products
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white p-5 border border-light">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${kpi.color}`}>
              {kpi.icon}
            </div>
            <p className="text-xs text-muted tracking-wide uppercase">{kpi.label}</p>
            <p className="text-2xl font-display mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart (simplified bar chart) */}
        <div className="lg:col-span-2 bg-white p-6 border border-light">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm">Revenue (Last 30 Days)</h3>
            <span className="text-xs text-muted">Avg Order: ${analytics.avgOrderValue.toFixed(2)}</span>
          </div>
          <div className="flex items-end gap-1 h-40">
            {Object.entries(analytics.revenueByDay).slice(-14).map(([date, revenue]) => (
              <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="absolute -top-8 bg-charcoal text-white text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  ${Number(revenue).toFixed(0)}
                </div>
                <div
                  className="w-full bg-primary/80 hover:bg-primary transition-colors min-h-[2px]"
                  style={{ height: `${(Number(revenue) / maxRevenue) * 100}%` }}
                />
                <span className="text-[8px] text-muted -rotate-45 origin-top-left whitespace-nowrap">{date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status */}
        <div className="bg-white p-6 border border-light">
          <h3 className="font-medium text-sm mb-4">Order Status</h3>
          <div className="space-y-3">
            {orderStatuses.map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-charcoal/70">{s.label}</span>
                  <span className="font-medium">{s.value}</span>
                </div>
                <div className="h-2 bg-light rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${analytics.totalOrders > 0 ? (s.value / analytics.totalOrders) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products & Recent Orders */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-6 border border-light">
          <h3 className="font-medium text-sm mb-4">Top Products</h3>
          <div className="space-y-3">
            {analytics.topProducts.slice(0, 5).map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 text-sm">
                <span className="text-xs text-muted w-4">{i + 1}</span>
                <img src={p.imageUrl} alt="" className="w-10 h-10 object-cover bg-light" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted">{p.unitsSold} sold</p>
                </div>
                <span className="font-medium text-sm">${p.revenue.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 border border-light">
          <h3 className="font-medium text-sm mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {analytics.recentOrders.map((o, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{o.orderNumber}</p>
                  <p className="text-xs text-muted">{o.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${o.total.toFixed(2)}</p>
                  <p className="text-[10px] text-muted">{o.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
