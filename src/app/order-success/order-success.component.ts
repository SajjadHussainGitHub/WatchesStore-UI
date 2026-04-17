import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs';
import { PlacedOrder } from '../interfaces/order';
import { OrderService } from '../services/order/order.service';

@Component({
  selector: 'app-order-success',
  templateUrl: './order-success.component.html',
  styleUrls: ['./order-success.component.css'],
})
export class OrderSuccessComponent implements OnInit {
  order: PlacedOrder | null = null;
  orderId = '';

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(take(1)).subscribe((pm) => {
      this.orderId = pm.get('id') ?? '';
      if (this.orderId) {
        this.order = this.orderService.getOrderByKey(this.orderId);
      }
    });
  }
}
