import { Product } from "./product";

export class ShoppingCartItem {
  $key: string;
  title: string;
  imageUrl: string;
  modelNumber?: string;
  price: number;
  quantity: number;

  constructor(init?: Partial<ShoppingCartItem>) {
    Object.assign(this, init);

  }



  get totalPrice() {
    return this.quantity * this.price;
  }
}
