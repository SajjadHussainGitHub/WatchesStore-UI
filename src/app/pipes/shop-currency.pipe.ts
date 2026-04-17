import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyService } from '../services/currency/currency.service';

/**
 * Formats a value stored in **EUR** using the shopper’s selected currency.
 * `pure: false` so the display updates when currency changes.
 */
@Pipe({
  name: 'shopCurrency',
  pure: false,
})
export class ShopCurrencyPipe implements PipeTransform {
  private currency = inject(CurrencyService);

  transform(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const eur = typeof value === 'string' ? parseFloat(value) : value;
    if (!Number.isFinite(eur)) {
      return '';
    }
    const code = this.currency.currentCode;
    const converted = this.currency.convertFromEur(eur);
    const opts: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: code,
    };
    if (code === 'JPY') {
      opts.minimumFractionDigits = 0;
      opts.maximumFractionDigits = 0;
    } else {
      opts.minimumFractionDigits = 2;
      opts.maximumFractionDigits = 2;
    }
    return new Intl.NumberFormat(undefined, opts).format(converted);
  }
}
