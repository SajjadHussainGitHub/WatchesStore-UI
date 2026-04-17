import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { take } from 'rxjs';
import {
  buildPlacedOrderSnapshot,
  createEmptyShippingAddress,
  PaymentMethod,
  ShippingAddress,
} from '../interfaces/order';
import { ShoppingCart } from '../interfaces/shopping-cart';
import { AuthService } from '../services/auth/auth.service';
import { OrderService } from '../services/order/order.service';
import { ShippingService } from '../services/shipping/shipping.service';
import { ShoppingCartService } from '../services/shopping-cart/shopping-cart.service';

@Component({
  selector: 'app-check-out',
  templateUrl: './check-out.component.html',
  styleUrls: ['./check-out.component.css'],
})
export class CheckOutComponent implements OnInit, OnDestroy {
  cart$: Observable<ShoppingCart>;
  readonly steps = [
    { n: 1, label: 'Contact & address' },
    { n: 2, label: 'Shipping' },
    { n: 3, label: 'Review & payment' },
  ];

  currentStep = 1;
  submitting = false;
  placeOrderError: string | null = null;

  address: ShippingAddress = createEmptyShippingAddress();
  selectedShippingId = 'standard';
  paymentMethod: PaymentMethod = 'card';

  private userId = '';
  private sub = new Subscription();

  constructor(
    private router: Router,
    private authService: AuthService,
    private shoppingCartService: ShoppingCartService,
    private orderService: OrderService,
    readonly shippingService: ShippingService,
  ) {}

  async ngOnInit() {
    this.cart$ = await this.shoppingCartService.getCart();

    this.sub.add(
      this.authService.user$.subscribe((u) => {
        this.userId = u?.uid ?? '';
      }),
    );

    this.authService.user$.pipe(take(1)).subscribe((u) => {
      if (u?.email) {
        this.address.email = u.email;
      }
      if (u?.displayName) {
        this.address.fullName = u.displayName;
      }
    });

    this.sub.add(
      this.cart$.subscribe((cart) => {
        if (cart && cart.totalItemsCount === 0) {
          this.router.navigate(['/shopping-cart'], {
            queryParams: { empty: '1' },
          });
        }
      }),
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  nextStep(): void {
    this.placeOrderError = null;
    if (this.currentStep === 1 && !this.isStep1Valid()) {
      return;
    }
    if (this.currentStep === 2 && !this.selectedShippingId) {
      return;
    }
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  prevStep(): void {
    this.placeOrderError = null;
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(n: number): void {
    if (n < this.currentStep) {
      this.currentStep = n;
      this.placeOrderError = null;
    }
  }

  isStep1Valid(): boolean {
    const a = this.address;
    return !!(
      a.fullName?.trim() &&
      a.line1?.trim() &&
      a.city?.trim() &&
      a.stateRegion?.trim() &&
      a.postalCode?.trim() &&
      a.countryCode &&
      a.phone?.trim() &&
      a.email?.trim() &&
      this.emailLooksValid(a.email)
    );
  }

  private emailLooksValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  async confirmOrder(cart: ShoppingCart): Promise<void> {
    this.placeOrderError = null;
    if (!this.userId) {
      this.placeOrderError = 'Please sign in again to complete your order.';
      return;
    }
    const method = this.shippingService.getMethodById(this.selectedShippingId);
    if (!method) {
      this.placeOrderError = 'Select a shipping option.';
      return;
    }
    this.submitting = true;
    try {
      const snapshot = buildPlacedOrderSnapshot(
        this.userId,
        cart,
        this.address,
        method,
        this.shippingService.taxRate,
        this.shippingService.taxLabel,
        this.paymentMethod,
      );
      const result = await this.orderService.placeOrder(snapshot);
      if (this.paymentMethod === 'card') {
        await this.router.navigate(['/payment', result.key]);
      } else {
        await this.router.navigate(['/order-success', result.key]);
      }
    } catch {
      this.placeOrderError = 'Something went wrong. Please try again.';
    } finally {
      this.submitting = false;
    }
  }

  subtotalEur(cart: ShoppingCart): number {
    return Math.round(cart.totalPrice * 100) / 100;
  }

  shippingEur(): number {
    return this.shippingService.getMethodById(this.selectedShippingId)?.priceEur ?? 0;
  }

  taxEur(cart: ShoppingCart): number {
    const sub = this.subtotalEur(cart);
    const ship = this.shippingEur();
    return Math.round((sub + ship) * this.shippingService.taxRate * 100) / 100;
  }

  totalEur(cart: ShoppingCart): number {
    return Math.round((this.subtotalEur(cart) + this.shippingEur() + this.taxEur(cart)) * 100) / 100;
  }

  countryName(code: string): string {
    return this.shippingService.countries.find((c) => c.code === code)?.name ?? code ?? '';
  }
}
