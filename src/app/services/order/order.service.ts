import { ShoppingCartService } from './../shopping-cart/shopping-cart.service';
import { Injectable } from '@angular/core';
import { OrderPaymentStatus, PlacedOrder } from '../../interfaces/order';

@Injectable()
export class OrderService {
  private readonly storageKey = 'eshop.orders';

  constructor(private shoppingCartService: ShoppingCartService) {}

  async placeOrder(order: Omit<PlacedOrder, '$key'>): Promise<{ key: string }> {
    const orders = this.readOrders();
    const key = `order-${Date.now()}`;
    const record: PlacedOrder = { ...order, $key: key };
    orders.push(record);
    this.writeOrders(orders);
    await this.shoppingCartService.clearCart();
    return { key };
  }

  /**
   * Marks a card order as paid after the dedicated payment step (demo — no real PSP).
   */
  async completeOnlinePayment(
    orderKey: string,
    userId: string,
    paymentReference?: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const orders = this.readOrders();
    const idx = orders.findIndex((o) => o.$key === orderKey);
    if (idx === -1) {
      return { ok: false, error: 'Order not found.' };
    }
    const o = orders[idx];
    if (o.userId !== userId) {
      return { ok: false, error: 'You cannot pay for this order.' };
    }
    if (o.paymentStatus !== 'pending_online') {
      return { ok: false, error: 'This order does not need online payment.' };
    }
    orders[idx] = {
      ...o,
      paymentStatus: 'paid' as OrderPaymentStatus,
      paidAt: Date.now(),
      paymentReference,
    };
    this.writeOrders(orders);
    return { ok: true };
  }

  getOrderByKey(key: string): PlacedOrder | null {
    return this.readOrders().find((o) => o.$key === key) ?? null;
  }

  getOrdersForUser(userId: string): PlacedOrder[] {
    return this.readOrders()
      .filter((o) => o.userId === userId)
      .sort((a, b) => b.datePlaced - a.datePlaced);
  }

  deleteOrderForUser(
    orderKey: string,
    userId: string,
  ): { ok: true } | { ok: false; error: string } {
    const orders = this.readOrders();
    const idx = orders.findIndex((o) => o.$key === orderKey);
    if (idx === -1) {
      return { ok: false, error: 'Order not found.' };
    }
    if (orders[idx].userId !== userId) {
      return { ok: false, error: 'You can only delete your own orders.' };
    }
    orders.splice(idx, 1);
    this.writeOrders(orders);
    return { ok: true };
  }

  getAllOrders(): PlacedOrder[] {
    return this.readOrders().sort((a, b) => b.datePlaced - a.datePlaced);
  }

  private readOrders(): PlacedOrder[] {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.map((row) => this.normalizeOrder(row as PlacedOrder));
    } catch {
      return [];
    }
  }

  private writeOrders(orders: PlacedOrder[]) {
    localStorage.setItem(this.storageKey, JSON.stringify(orders));
  }

  /** Older stored orders may omit `paymentStatus`. */
  private normalizeOrder(o: PlacedOrder): PlacedOrder {
    if (o.paymentStatus) {
      return o;
    }
    return {
      ...o,
      paymentStatus: 'paid',
    };
  }
}
