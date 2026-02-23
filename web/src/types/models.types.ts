export type Role = 'BUYER' | 'SELLER' | 'ADMIN';
export type OrderStatus = 'PENDING' | 'PAID' | 'PICKED_UP' | 'CANCELLED';
export type PaymentMethod = 'PIX' | 'CREDIT_CARD';
export type PaymentStatus = 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  createdAt: string;
}

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  imageUrl?: string;
  whatsapp: string;
  pixKey: string;
  commissionRate: number;
  isOpen: boolean;
  products?: Product[];
  owner?: { id: string; name: string };
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  imageUrl?: string;
  price: number;
  stockQty: number;
  isAvailable: boolean;
  store?: { id: string; name: string };
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  priceAtPurchase: number;
  product?: { name: string; imageUrl?: string };
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
  store?: { id: string; name: string };
  buyer?: { id: string; name: string; phone: string };
  payment?: { status: PaymentStatus; method: PaymentMethod };
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  gatewayTxId: string;
  grossAmount: number;
  commission: number;
  netAmount: number;
  status: PaymentStatus;
  createdAt: string;
}

export interface InitiatePaymentResponse {
  gatewayTxId: string;
  method: PaymentMethod;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
}
