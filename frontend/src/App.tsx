import { ReactNode, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import HomePage from '@/pages/HomePage';
import ProductListingPage from '@/pages/ProductListingPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import LoginPage from '@/pages/LoginPage';
import WishlistPage from '@/pages/WishlistPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import AdminProductsPage from '@/pages/AdminProductsPage';
import { useAuth } from '@/context/AuthContext';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return children;
  
  if (!user) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }
  
  return children;
}

function AdminPrivateRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  
  if (loading) return children;
  
  if (!user || !isAdmin) {
    return <Navigate to="/profile" replace />;
  }
  
  return children;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function App() {
  const location = useLocation();
  return (
    <Layout>
      <ScrollToTop />
      <div key={location.pathname} className="page-fade">
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductListingPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />

          {/* Auth-required routes */}
          <Route path="/cart" element={<PrivateRoute><CartPage /></PrivateRoute>} />
          <Route path="/checkout" element={<PrivateRoute><CheckoutPage /></PrivateRoute>} />
          <Route path="/wishlist" element={<PrivateRoute><WishlistPage /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminPrivateRoute><AdminDashboardPage /></AdminPrivateRoute>} />
          <Route path="/admin/products" element={<AdminPrivateRoute><AdminProductsPage /></AdminPrivateRoute>} />

          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </div>
    </Layout>
  );
}
