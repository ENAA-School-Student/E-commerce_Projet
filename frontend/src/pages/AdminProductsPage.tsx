import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { admin } from '@/lib/api';
import { Product, PageResponse } from '@/types';
import { Plus, Pencil, Trash2, Search, ChevronLeft, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminProductsPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [pageData, setPageData] = useState<PageResponse<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const loadProducts = () => {
    setLoading(true);
    admin.products(page, 20, search || undefined).then((res) => {
      setProducts(res.data.content);
      setPageData(res.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || !isAdmin) { navigate('/'); return; }
    loadProducts();
  }, [user, isAdmin, navigate, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadProducts();
  };

  const handleDelete = async (id: number) => {
    try {
      await admin.deleteProduct(id);
      toast.success('Product deactivated');
      setDeleteConfirm(null);
      loadProducts();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/admin')} className="p-2 hover:bg-light transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-muted text-xs tracking-widest-xl uppercase mb-2">Admin</p>
          <h1 className="font-display text-display-sm">Products</h1>
        </div>
        <button className="bg-charcoal text-white px-4 py-2 text-xs font-medium tracking-wide hover:bg-charcoal/90 transition-colors flex items-center gap-2">
          <Plus size={14} /> Add Product
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2 border border-light text-sm focus:outline-none focus:border-charcoal transition-colors"
          />
        </div>
        <button type="submit" className="bg-charcoal text-white px-4 py-2 text-xs font-medium tracking-wide hover:bg-charcoal/90 transition-colors">
          Search
        </button>
      </form>

      {/* Table */}
      <div className="bg-white border border-light overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-light text-xs text-muted uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">Product</th>
              <th className="text-left px-4 py-3 font-medium">Category</th>
              <th className="text-right px-4 py-3 font-medium">Price</th>
              <th className="text-right px-4 py-3 font-medium">Stock</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No products found.</td></tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-light last:border-0 hover:bg-light/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={product.images[0]?.imageUrl} alt="" className="w-10 h-10 object-cover bg-light" />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted">{product.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-charcoal/70">{product.categoryName || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">${product.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-charcoal/70">
                    {product.variants.reduce((sum, v) => sum + v.stock, 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] px-2 py-0.5 font-medium tracking-wide ${product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {product.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/product/${product.slug}`)} className="p-1.5 hover:bg-light transition-colors" title="View">
                        <Eye size={14} />
                      </button>
                      <button className="p-1.5 hover:bg-light transition-colors" title="Edit">
                        <Pencil size={14} />
                      </button>
                      {deleteConfirm === product.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(product.id)} className="text-[10px] text-red-600 font-medium px-2 py-1 bg-red-50">Confirm</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-[10px] text-muted font-medium px-2 py-1 bg-light">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(product.id)} className="p-1.5 hover:bg-red-50 hover:text-red-600 transition-colors" title="Deactivate">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageData && pageData.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 text-sm text-muted">
          <span>Page {page + 1} of {pageData.totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 border border-light disabled:opacity-50 disabled:cursor-not-allowed hover:bg-light transition-colors">Prev</button>
            <button onClick={() => setPage(Math.min(pageData.totalPages - 1, page + 1))} disabled={pageData.last} className="px-3 py-1 border border-light disabled:opacity-50 disabled:cursor-not-allowed hover:bg-light transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
