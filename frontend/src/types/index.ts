export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  loyaltyPoints: number;
  enabled: boolean;
  roles: string[];
  createdAt: string;
}

export interface StoreConfig {
  freeShippingThreshold: number;
  shippingCost: number;
  taxRate: number;
  lowStockThreshold: number;
  currency: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  user: User;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: number;
  productCount: number;
  active: boolean;
}

export interface ProductImage {
  id: number;
  imageUrl: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariant {
  id: number;
  size?: string;
  color?: string;
  colorHex?: string;
  stock: number;
  sku?: string;
  active: boolean;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  categoryId?: number;
  categoryName?: string;
  brand?: string;
  collection?: string;
  badge?: string | null;
  featured: boolean;
  active: boolean;
  variants: ProductVariant[];
  images: ProductImage[];
  averageRating: number;
  reviewCount: number;
}

export interface CartItem {
  id: number;
  productId: number;
  productName: string;
  productSlug: string;
  imageUrl?: string;
  price: number;
  variantId?: number;
  size?: string;
  color?: string;
  quantity: number;
  lineTotal: number;
}

export interface Cart {
  userId: number;
  itemCount: number;
  subtotal: number;
  items: CartItem[];
}

export interface Address {
  id?: number;
  firstName: string;
  lastName: string;
  phone?: string;
  street: string;
  apartment?: string;
  city: string;
  state?: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  imageUrl?: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  customerName: string;
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  promoCode?: string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
  paymentMethod?: string;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    street: string;
    apartment?: string;
    city: string;
    state?: string;
    zipCode: string;
    country: string;
    phone?: string;
  };
  trackingNumber?: string;
  createdAt: string;
  items: OrderItem[];
}

export interface Review {
  id: number;
  productId: number;
  userId: number;
  userFirstName: string;
  userLastName: string;
  userAvatar?: string;
  rating: number;
  title?: string;
  comment?: string;
  verified: boolean;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface AdminAnalytics {
  totalRevenue: number;
  avgOrderValue: number;
  totalOrders: number;
  activeCustomers: number;
  totalCustomers: number;
  totalProducts: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  revenueByDay: Record<string, number>;
  topCategories: { categoryName: string; revenue: number; orderCount: number }[];
  topProducts: { id: number; name: string; imageUrl?: string; unitsSold: number; revenue: number }[];
  recentOrders: { orderNumber: string; customerName: string; status: string; total: number; createdAt: string }[];
}
