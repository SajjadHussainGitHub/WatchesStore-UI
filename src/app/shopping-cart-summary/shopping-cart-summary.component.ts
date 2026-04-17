import { Component, Input } from '@angular/core';
import { ShoppingCart } from '../interfaces/shopping-cart';

@Component({
  selector: 'shopping-cart-summary',
  templateUrl: './shopping-cart-summary.component.html',
  styleUrls: ['./shopping-cart-summary.component.css'],
})
export class ShoppingCartSummaryComponent {
  @Input('cart') cart: ShoppingCart;

  /** When true, show subtotal / shipping / tax / total (checkout). */
  @Input() showBreakdown = false;
  @Input() subtotalEur = 0;
  @Input() shippingEur = 0;
  @Input() taxEur = 0;
  @Input() totalEur = 0;
  @Input() taxLabel = 'Tax';
}
