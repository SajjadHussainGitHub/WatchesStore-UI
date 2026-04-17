import { Injectable } from '@angular/core';

export interface ShippingMethodOption {
  id: string;
  label: string;
  description: string;
  eta: string;
  /** Amount in EUR (store currency). */
  priceEur: number;
}

export interface CountryOption {
  code: string;
  name: string;
}

@Injectable()
export class ShippingService {
  /** VAT-style rate applied to subtotal + shipping (demo). */
  readonly taxRate = 0.05;
  readonly taxLabel = 'VAT (5%)';

  readonly methods: ShippingMethodOption[] = [
    {
      id: 'standard',
      label: 'Standard delivery',
      description: 'Tracked courier, signature on delivery where available.',
      eta: '5–7 business days',
      priceEur: 0,
    },
    {
      id: 'express',
      label: 'Express',
      description: 'Priority handling and faster routing.',
      eta: '2–3 business days',
      priceEur: 12.9,
    },
    {
      id: 'overnight',
      label: 'Overnight',
      description: 'Where service exists; cut-off times apply.',
      eta: 'Next business day',
      priceEur: 29.9,
    },
  ];

  readonly countries: CountryOption[] = [
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IT', name: 'Italy' },
    { code: 'ES', name: 'Spain' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'BE', name: 'Belgium' },
    { code: 'AT', name: 'Austria' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'PK', name: 'Pakistan' },
    { code: 'IN', name: 'India' },
    { code: 'AU', name: 'Australia' },
    { code: 'JP', name: 'Japan' },
  ].sort((a, b) => a.name.localeCompare(b.name, 'en'));

  getMethodById(id: string): ShippingMethodOption | undefined {
    return this.methods.find((m) => m.id === id);
  }
}
