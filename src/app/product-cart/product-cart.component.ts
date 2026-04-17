import { ShoppingCartService } from './../services/shopping-cart/shopping-cart.service';
import { Component, OnInit, Input } from '@angular/core';
import { Product } from '../interfaces/product';
import { ShoppingCart } from '../interfaces/shopping-cart';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'product-cart',
  templateUrl: './product-cart.component.html',
  styleUrls: ['./product-cart.component.css']
})
export class ProductCartComponent {
  @Input('product') product: Product;
  // tslint:disable-next-line:no-input-rename
  @Input('show-actions') showActions = true;
  // tslint:disable-next-line:no-input-rename
  @Input('shopping-cart') shoppingCart: ShoppingCart;

  constructor(private cartService: ShoppingCartService) { }

  readonly stars = [1, 2, 3, 4, 5];

  hasDiscount(p: Product): boolean {
    if (!p.discountPrice) return false;
    const original = Number(p.price);
    const discounted = Number(p.discountPrice);
    return (
      Number.isFinite(original) &&
      Number.isFinite(discounted) &&
      discounted < original
    );
  }

  getStarIconClass(rating: number | undefined, starIndex: number): string {
    const r = rating ?? 0;

    if (r >= starIndex) return 'fa fa-star';
    // Half-star support for nicer UI (Font Awesome v4)
    if (r >= starIndex - 0.5) return 'fa fa-star-half-o';
    return 'fa fa-star-o';
  }

  addToCart() {
    return this.cartService.addToCart(this.product);
  }

}
