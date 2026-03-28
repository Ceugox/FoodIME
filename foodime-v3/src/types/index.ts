export type Role = 'BUYER' | 'SELLER' | 'ADMIN';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'BLOCKED';
export type OrderStatus = 'PENDING' | 'PAID' | 'READY' | 'PICKED_UP' | 'CANCELLED';
export type PaymentMethod = 'PIX' | 'CREDIT_CARD';
export type PaymentStatus = 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type CouponType = 'PERCENTAGE' | 'FIXED';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
}

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  whatsapp: string;
  pixKey: string;
  commissionRate: number;
  isOpen: boolean;
  openTime?: string | null;
  closeTime?: string | null;
  products?: Product[];
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  imageUrl?: string | null;
  price: number;
  stockQty: number;
  isAvailable: boolean;
}

export interface Order {
  id: string;
  buyerId: string;
  storeId: string;
  status: OrderStatus;
  code: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
  payment?: Payment | null;
  store?: Store;
  buyer?: Pick<User, 'id' | 'name' | 'phone'>;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  priceAtPurchase: number;
  product?: Product;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  gatewayTxId: string;
  grossAmount: number;
  commission: number;
  netAmount: number;
  refundReason?: string | null;
  status: PaymentStatus;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  discount: number;
  isActive: boolean;
  usageLimit?: number | null;
  usedCount: number;
  expiresAt?: string | null;
  createdAt: string;
}

export interface Payout {
  id: string;
  storeId: string;
  amount: number;
  note?: string | null;
  createdAt: string;
  store?: Store;
}
