import { Component, OnInit } from '@angular/core';
import { take } from 'rxjs';
import { PlacedOrder } from '../interfaces/order';
import { AuthService } from '../services/auth/auth.service';
import { OrderService } from '../services/order/order.service';

@Component({
  selector: 'app-my-orders',
  templateUrl: './my-orders.component.html',
  styleUrls: ['./my-orders.component.css'],
})
export class MyOrdersComponent implements OnInit {
  orders: PlacedOrder[] = [];
  deleting = new Set<string>();
  deleteError = '';
  private userId = '';

  constructor(
    private authService: AuthService,
    private orderService: OrderService,
  ) {}

  ngOnInit() {
    this.authService.user$.pipe(take(1)).subscribe((u) => {
      this.userId = u?.uid || '';
      this.orders = this.userId ? this.orderService.getOrdersForUser(this.userId) : [];
    });
  }

  formatDate(ts: number): string {
    return new Date(ts).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  deleteOrder(order: PlacedOrder): void {
    this.deleteError = '';
    if (!this.userId || !order?.$key) {
      this.deleteError = 'Unable to delete this order right now.';
      return;
    }
    if (!confirm(`Delete order ${order.$key}? This cannot be undone.`)) {
      return;
    }
    this.deleting.add(order.$key);
    const result = this.orderService.deleteOrderForUser(order.$key, this.userId);
    this.deleting.delete(order.$key);
    if (result.ok === false) {
      this.deleteError = result.error;
      return;
    }
    this.orders = this.orders.filter((o) => o.$key !== order.$key);
  }
}
