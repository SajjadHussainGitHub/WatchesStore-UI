import { ShoppingCart } from './shopping-cart';
import { ShoppingCartItem } from './shopping-cart-item';

/** Full delivery address captured at checkout. */
export interface ShippingAddress {
  fullName: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  stateRegion: string;
  postalCode: string;
  countryCode: string;
  phone: string;
  email: string;
}

export interface OrderLineItem {
  productId: string;
  title: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export type PaymentMethod = 'card' | 'cod';

/** Online payment still required vs completed vs cash on delivery. */
export type OrderPaymentStatus = 'pending_online' | 'paid' | 'pay_on_delivery';

/** Persisted order record (localStorage demo). */
export interface PlacedOrder {
  $key: string;
  userId: string;
  datePlaced: number;
  shippingAddress: ShippingAddress;
  shippingMethodId: string;
  shippingMethodLabel: string;
  shippingCost: number;
  subtotal: number;
  taxEstimate: number;
  taxLabel: string;
  total: number;
  paymentMethod: PaymentMethod;
  /** `pending_online` until the payment page completes (card). */
  paymentStatus: OrderPaymentStatus;
  /** Set when `paymentStatus` becomes `paid`. */
  paidAt?: number;
  /** Gateway-side payment reference for reconciliations (demo). */
  paymentReference?: string;
  items: OrderLineItem[];
}

export function createEmptyShippingAddress(): ShippingAddress {
  return {
    fullName: '',
    company: '',
    line1: '',
    line2: '',
    city: '',
    stateRegion: '',
    postalCode: '',
    countryCode: '',
    phone: '',
    email: '',
  };
}

export function buildPlacedOrderSnapshot(
  userId: string,
  cart: ShoppingCart,
  address: ShippingAddress,
  shippingMethod: { id: string; label: string; priceEur: number },
  taxRate: number,
  taxLabel: string,
  paymentMethod: PaymentMethod,
): Omit<PlacedOrder, '$key'> {
  const subtotal = roundMoney(cart.totalPrice);
  const shippingCost = roundMoney(shippingMethod.priceEur);
  const taxable = subtotal + shippingCost;
  const taxEstimate = roundMoney(taxable * taxRate);
  const total = roundMoney(taxable + taxEstimate);

  const items: OrderLineItem[] = cart.items.map((i: ShoppingCartItem) => ({
    productId: i.$key,
    title: i.title,
    imageUrl: i.imageUrl,
    unitPrice: roundMoney(i.price),
    quantity: i.quantity,
    lineTotal: roundMoney(i.totalPrice),
  }));

  const paymentStatus: OrderPaymentStatus =
    paymentMethod === 'card' ? 'pending_online' : 'pay_on_delivery';

  return {
    userId,
    datePlaced: Date.now(),
    shippingAddress: { ...address },
    shippingMethodId: shippingMethod.id,
    shippingMethodLabel: shippingMethod.label,
    shippingCost,
    subtotal,
    taxEstimate,
    taxLabel,
    total,
    paymentMethod,
    paymentStatus,
    items,
  };
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
