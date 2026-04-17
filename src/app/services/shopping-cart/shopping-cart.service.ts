import { Injectable } from '@angular/core';
import { Product } from '../../interfaces/product';
import { ShoppingCart } from '../../interfaces/shopping-cart';
import { BehaviorSubject, Observable, map } from 'rxjs';

@Injectable()
export class ShoppingCartService {
  private readonly storageKey = 'eshop.cart.items';
  private cartItemsSubject = new BehaviorSubject<{ [productId: string]: any }>(
    this.readItems(),
  );

  // Public API

  async getCart(): Promise<Observable<ShoppingCart>> {
    return this.cartItemsSubject.asObservable().pipe(map((items) => new ShoppingCart(items)));
  }

  async addToCart(product: Product) {
    this.updateItem(product, 1);
  }

  async removeFromCart(product: Product) {
    this.updateItem(product, -1);
  }

  /** Removes a product line from the cart entirely (e.g. mini-cart delete). */
  async removeLineFromCart(productId: string) {
    const items = this.readItems();
    if (!items[productId]) {
      return;
    }
    delete items[productId];
    this.writeItems(items);
  }

  async clearCart() {
    this.writeItems({});
  }

  // Private Functions

  private async updateItem(product: Product, change: number) {
    const items = this.readItems();
    const currentItem = items[product.$key];
    const quantity = ((currentItem && currentItem.quantity) || 0) + change;

    if (quantity <= 0) {
      delete items[product.$key];
    } else {
      const unitPrice = product.discountPrice
        ? Number(product.discountPrice)
        : Number(product.price);
      items[product.$key] = {
        title: product.title,
        imageUrl: product.imageUrl,
        modelNumber: product.modelNumber,
        price: unitPrice,
        quantity,
      };
    }

    this.writeItems(items);
  }

  private readItems(): { [productId: string]: any } {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : {};
  }

  private writeItems(items: { [productId: string]: any }) {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
    this.cartItemsSubject.next(items);
  }
}
