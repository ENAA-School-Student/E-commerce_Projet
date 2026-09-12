import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Search, ShoppingBag, User, Menu, X, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-cream/95 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <div className="flex items-center gap-6">
            <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-1">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <Link to="/" className="font-display text-2xl font-medium tracking-wider text-charcoal">
              LUXEMART
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium tracking-wide">
            <Link to="/products?category=women" className="hover:text-primary transition-colors">Women</Link>
            <Link to="/products?category=men" className="hover:text-primary transition-colors">Men</Link>
            <Link to="/products?category=accessories" className="hover:text-primary transition-colors">Accessories</Link>
            <Link to="/products?category=home" className="hover:text-primary transition-colors">Home</Link>
          </nav>

          <div className="flex items-center gap-4">
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-1 hover:text-primary transition-colors">
              <Search size={20} strokeWidth={1.5} />
            </button>
            {user ? (
              <>
                <Link to="/profile" className="p-1 hover:text-primary transition-colors">
                  <User size={20} strokeWidth={1.5} />
                </Link>
                <Link to="/cart" className="relative p-1 hover:text-primary transition-colors">
                  <ShoppingBag size={20} strokeWidth={1.5} />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium">
                      {itemCount}
                    </span>
                  )}
                </Link>
              </>
            ) : (
              <Link to="/login" className="text-sm font-medium hover:text-primary transition-colors">Login</Link>
            )}
          </div>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-light bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <form onSubmit={(e) => { e.preventDefault(); const q = (e.target as HTMLFormElement).querySelector('input')?.value || ''; window.location.href = `/products?search=${encodeURIComponent(q)}`; setSearchOpen(false); }}>
              <input autoFocus type="text" placeholder="Search LUXEMART..." className="w-full bg-transparent text-lg font-light outline-none placeholder:text-muted" />
            </form>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="lg:hidden border-t border-light bg-cream">
          <nav className="max-w-7xl mx-auto px-4 py-6 space-y-4">
            {['Women', 'Men', 'Accessories', 'Home'].map((cat) => (
              <Link key={cat} to={`/products?category=${cat.toLowerCase()}`} className="flex items-center justify-between text-lg font-light text-charcoal hover:text-primary">
                {cat} <ChevronRight size={16} className="text-muted" />
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" className="flex items-center justify-between text-lg font-light text-charcoal hover:text-primary">
                Admin Dashboard <ChevronRight size={16} className="text-muted" />
              </Link>
            )}
            {!user && (
              <Link to="/login" className="flex items-center justify-between text-lg font-light text-charcoal hover:text-primary">
                Login / Register <ChevronRight size={16} className="text-muted" />
              </Link>
            )}
            {user && (
              <button onClick={logout} className="text-lg font-light text-charcoal hover:text-primary">Logout</button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-charcoal text-white/70 mt-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="font-display text-white text-lg mb-4">LUXEMART</h4>
            <p className="text-sm leading-relaxed">Refined objects for considered living.</p>
          </div>
          {[
            { title: 'Shop', links: ['Women', 'Men', 'Accessories', 'Home'] },
            { title: 'Help', links: ['Shipping', 'Returns', 'FAQ', 'Contact'] },
            { title: 'About', links: ['Story', 'Sustainability', 'Careers'] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-white text-sm font-medium tracking-wider uppercase mb-4">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l}><a href="#" className="text-sm hover:text-primary transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-8 text-center text-xs tracking-wide">
          &copy; 2024 LUXEMART. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16 lg:pt-20">{children}</main>
      <Footer />
    </div>
  );
}
