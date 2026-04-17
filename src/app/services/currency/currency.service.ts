import { ApplicationRef, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ShopCurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'JPY';

export interface CurrencyOption {
  code: ShopCurrencyCode;
  label: string;
}

/**
 * Store prices are always in EUR; this service converts for display only.
 * Rates are static (demo) — replace with an API for production.
 */
@Injectable()
export class CurrencyService {
  private readonly storageKey = 'eshop.currency';

  /** 1 EUR = this many units of `code` — must be declared before `subject` (readInitial uses `rates`). */
  private readonly rates: Record<ShopCurrencyCode, number> = {
    EUR: 1,
    USD: 1.085,
    GBP: 0.857,
    CHF: 0.955,
    JPY: 163.5,
  };

  private readonly subject = new BehaviorSubject<ShopCurrencyCode>(this.readInitial());

  readonly currency$: Observable<ShopCurrencyCode> = this.subject.asObservable();

  readonly currencies: CurrencyOption[] = [
    { code: 'EUR', label: 'EUR · Euro' },
    { code: 'USD', label: 'USD · US dollar' },
    { code: 'GBP', label: 'GBP · Pound sterling' },
    { code: 'CHF', label: 'CHF · Swiss franc' },
    { code: 'JPY', label: 'JPY · Japanese yen' },
  ];

  constructor(private appRef: ApplicationRef) {}

  get currentCode(): ShopCurrencyCode {
    return this.subject.value;
  }

  setCurrency(code: ShopCurrencyCode): void {
    if (!(code in this.rates)) {
      return;
    }
    this.subject.next(code);
    localStorage.setItem(this.storageKey, code);
    this.appRef.tick();
  }

  /** Convert a numeric amount stored as EUR into the active currency. */
  convertFromEur(amountEur: number): number {
    const rate = this.rates[this.subject.value];
    return amountEur * rate;
  }

  private readInitial(): ShopCurrencyCode {
    const raw = localStorage.getItem(this.storageKey);
    if (raw && raw in this.rates) {
      return raw as ShopCurrencyCode;
    }
    return 'EUR';
  }
}
