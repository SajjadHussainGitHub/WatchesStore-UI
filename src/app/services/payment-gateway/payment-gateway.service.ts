import { Injectable } from '@angular/core';

export interface CardPayload {
  holderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

export interface TokenizeResult {
  ok: boolean;
  token?: string;
  error?: string;
}

export interface ChargeResult {
  ok: boolean;
  gatewayReference?: string;
  error?: string;
}

/**
 * Demo gateway adapter.
 * Replace with your backend/PSP API integration for production.
 */
@Injectable({ providedIn: 'root' })
export class PaymentGatewayService {
  sanitizeCardNumber(input: string): string {
    return (input || '').replace(/\D/g, '');
  }

  formatCardNumber(input: string): string {
    const digits = this.sanitizeCardNumber(input).slice(0, 19);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  }

  formatExpiry(input: string): string {
    const digits = (input || '').replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  sanitizeCvv(input: string): string {
    return (input || '').replace(/\D/g, '').slice(0, 4);
  }

  isValidCardNumber(input: string): boolean {
    const digits = this.sanitizeCardNumber(input);
    if (digits.length < 13 || digits.length > 19) return false;
    return this.luhn(digits);
  }

  isValidExpiry(input: string): boolean {
    const m = /^(\d{2})\/(\d{2})$/.exec((input || '').trim());
    if (!m) return false;
    const mm = Number(m[1]);
    const yy = Number(m[2]);
    if (!Number.isFinite(mm) || mm < 1 || mm > 12) return false;
    const now = new Date();
    const currentYY = now.getFullYear() % 100;
    const currentMM = now.getMonth() + 1;
    return yy > currentYY || (yy === currentYY && mm >= currentMM);
  }

  isValidCvv(input: string): boolean {
    return /^\d{3,4}$/.test((input || '').trim());
  }

  detectBrand(cardNumber: string): string {
    const n = this.sanitizeCardNumber(cardNumber);
    if (/^4/.test(n)) return 'Visa';
    if (/^5[1-5]/.test(n) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(n)) return 'Mastercard';
    if (/^3[47]/.test(n)) return 'AmEx';
    if (/^6(?:011|5)/.test(n)) return 'Discover';
    return 'Card';
  }

  async tokenizeCard(payload: CardPayload): Promise<TokenizeResult> {
    if (!payload.holderName.trim()) {
      return { ok: false, error: 'Name on card is required.' };
    }
    if (!this.isValidCardNumber(payload.cardNumber)) {
      return { ok: false, error: 'Card number is invalid.' };
    }
    if (!this.isValidExpiry(payload.expiry)) {
      return { ok: false, error: 'Expiry date is invalid.' };
    }
    if (!this.isValidCvv(payload.cvv)) {
      return { ok: false, error: 'Security code is invalid.' };
    }
    const token = `tok_${Math.random().toString(36).slice(2, 14)}`;
    return { ok: true, token };
  }

  async authorizePayment(amountEur: number, token: string): Promise<ChargeResult> {
    if (!token?.startsWith('tok_')) {
      return { ok: false, error: 'Payment token is invalid.' };
    }
    if (!Number.isFinite(amountEur) || amountEur <= 0) {
      return { ok: false, error: 'Payment amount is invalid.' };
    }
    const gatewayReference = `gw_${Date.now().toString(36)}`;
    return { ok: true, gatewayReference };
  }

  private luhn(digits: string): boolean {
    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = Number(digits.charAt(i));
      if (shouldDouble) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }
}
