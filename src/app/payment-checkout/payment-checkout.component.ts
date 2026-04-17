import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, take } from 'rxjs';
import { PlacedOrder } from '../interfaces/order';
import { AuthService } from '../services/auth/auth.service';
import { OrderService } from '../services/order/order.service';
import { PaymentGatewayService } from '../services/payment-gateway/payment-gateway.service';

@Component({
  selector: 'app-payment-checkout',
  templateUrl: './payment-checkout.component.html',
  styleUrls: ['./payment-checkout.component.css'],
})
export class PaymentCheckoutComponent implements OnInit, OnDestroy {
  order: PlacedOrder | null = null;
  orderId = '';
  userId = '';
  loading = true;
  error: string | null = null;

  cardName = '';
  cardNumber = '';
  cardExpiry = '';
  cardCvv = '';

  processing = false;
  payError: string | null = null;

  private sub = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private orderService: OrderService,
    private paymentGateway: PaymentGatewayService,
  ) {}

  ngOnInit() {
    this.sub.add(
      this.authService.user$.subscribe((u) => {
        this.userId = u?.uid ?? '';
      }),
    );

    this.route.paramMap.pipe(take(1)).subscribe((pm) => {
      this.orderId = pm.get('orderId') ?? '';
      if (!this.orderId) {
        this.loading = false;
        this.router.navigate(['/']);
        return;
      }
      this.authService.user$.pipe(take(1)).subscribe((u) => {
        this.userId = u?.uid ?? '';
        if (!this.userId) {
          this.loading = false;
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: `/payment/${this.orderId}` },
          });
          return;
        }
        this.order = this.orderService.getOrderByKey(this.orderId);
        this.loading = false;
        if (!this.order) {
          this.error = 'We couldn’t find this order.';
          return;
        }
        if (this.order.userId !== this.userId) {
          this.error = 'You don’t have access to this payment.';
          return;
        }
        if (this.order.paymentStatus !== 'pending_online') {
          this.router.navigate(['/order-success', this.orderId]);
          return;
        }
        if (this.order.paymentMethod !== 'card') {
          this.router.navigate(['/order-success', this.orderId]);
          return;
        }
        if (this.order.shippingAddress?.fullName) {
          this.cardName = this.order.shippingAddress.fullName;
        }
      });
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  get formValid(): boolean {
    return (
      this.cardName.trim().length >= 2 &&
      this.paymentGateway.isValidCardNumber(this.cardNumber) &&
      this.paymentGateway.isValidExpiry(this.cardExpiry) &&
      this.paymentGateway.isValidCvv(this.cardCvv)
    );
  }

  get cardBrand(): string {
    return this.paymentGateway.detectBrand(this.cardNumber);
  }

  get cardNumberError(): string {
    if (!this.cardNumber?.trim()) return 'Card number is required.';
    if (!this.paymentGateway.isValidCardNumber(this.cardNumber)) return 'Enter a valid card number.';
    return '';
  }

  get expiryError(): string {
    if (!this.cardExpiry?.trim()) return 'Expiry is required.';
    if (!this.paymentGateway.isValidExpiry(this.cardExpiry)) return 'Use a valid future date (MM/YY).';
    return '';
  }

  get cvvError(): string {
    if (!this.cardCvv?.trim()) return 'Security code is required.';
    if (!this.paymentGateway.isValidCvv(this.cardCvv)) return 'Use a 3 or 4 digit security code.';
    return '';
  }

  onCardNumberChange(value: string): void {
    this.cardNumber = this.paymentGateway.formatCardNumber(value);
  }

  onExpiryChange(value: string): void {
    this.cardExpiry = this.paymentGateway.formatExpiry(value);
  }

  onCvvChange(value: string): void {
    this.cardCvv = this.paymentGateway.sanitizeCvv(value);
  }

  async submitPayment(): Promise<void> {
    this.payError = null;
    if (!this.formValid || !this.orderId || !this.userId) {
      this.payError = 'Please complete all card fields.';
      return;
    }
    if (!this.order) {
      this.payError = 'Order details are missing.';
      return;
    }
    this.processing = true;
    const tokenized = await this.paymentGateway.tokenizeCard({
      holderName: this.cardName,
      cardNumber: this.cardNumber,
      expiry: this.cardExpiry,
      cvv: this.cardCvv,
    });
    if (!tokenized.ok || !tokenized.token) {
      this.processing = false;
      this.payError = tokenized.error || 'Unable to verify card details.';
      return;
    }
    const charged = await this.paymentGateway.authorizePayment(
      this.order.total,
      tokenized.token,
    );
    if (!charged.ok) {
      this.processing = false;
      this.payError = charged.error || 'Payment authorization failed.';
      return;
    }
    const result = await this.orderService.completeOnlinePayment(
      this.orderId,
      this.userId,
      charged.gatewayReference,
    );
    this.processing = false;
    if (result.ok === false) {
      this.payError = result.error;
      return;
    }
    await this.router.navigate(['/order-success', this.orderId]);
  }
}
