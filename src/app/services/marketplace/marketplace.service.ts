import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type MarketplaceChannel = 'DummyJSON' | 'FakeStore';
export type MarketplaceRegion = 'Global' | 'North America' | 'Europe' | 'Middle East' | 'APAC';
export type ShippingProfile = 'Standard' | 'Expedited' | 'Premium White-Glove';
export type PricingMode = 'Keep' | 'Increase3' | 'Increase7';

export type MarketplaceStatus = 'Ready' | 'Published';

export interface MarketplaceListing {
  $key: string;
  channel: MarketplaceChannel;
  productIds: string[];
  status: MarketplaceStatus;
  createdAt: string; // ISO
  publishedAt?: string; // ISO
  region: MarketplaceRegion;
  pricingMode: PricingMode;
  shippingProfile: ShippingProfile;
  inventoryBufferPercent: number;
  qualityChecks: string[];
  feedVersion: string;
  estimatedReach: number;
  estimatedMarginImpactPercent: number;
  adminNote?: string;
}

export interface MarketplacePublishRequest {
  channel: MarketplaceChannel;
  productIds: string[];
  region: MarketplaceRegion;
  pricingMode: PricingMode;
  shippingProfile: ShippingProfile;
  inventoryBufferPercent: number;
  qualityChecks: string[];
  adminNote?: string;
}

export interface MarketplaceExternalProduct {
  externalId: string;
  channel: MarketplaceChannel;
  title: string;
  modelNumber: string;
  categoryName: string;
  price: number;
  imageUrl: string;
  description: string;
  rating: number;
  ratingCount: number;
  discountPercent?: number;
}

export interface MarketplaceInventorySignal {
  channel: MarketplaceChannel;
  modelNumber: string;
  title: string;
  stock: number;
}

@Injectable()
export class MarketplaceService {
  private readonly storageKey = 'eshop.marketplace.listings';

  private listingsSubject = new BehaviorSubject<MarketplaceListing[]>(
    this.readListings(),
  );

  getListings(): Observable<MarketplaceListing[]> {
    return this.listingsSubject.asObservable();
  }

  /**
   * Connector-ready external marketplace search.
   * Today this uses a curated demo catalog; replace this method body with API calls.
   */
  async searchExternalProducts(
    keywordOrModel: string,
    channels: MarketplaceChannel[],
  ): Promise<MarketplaceExternalProduct[]> {
    const q = (keywordOrModel || '').trim().toLowerCase();
    if (!q) {
      return [];
    }
    const requested = new Set(channels);
    const tasks: Promise<MarketplaceExternalProduct[]>[] = [];
    if (requested.has('DummyJSON')) {
      tasks.push(this.fetchFromDummyJson(q));
    }
    if (requested.has('FakeStore')) {
      tasks.push(this.fetchFromFakeStore(q));
    }
    const settled = await Promise.allSettled(tasks);
    const merged = settled
      .filter((s): s is PromiseFulfilledResult<MarketplaceExternalProduct[]> => s.status === 'fulfilled')
      .flatMap((s) => s.value);
    return merged.slice(0, 50);
  }

  /**
   * Pulls inventory signals from external connectors for local stock sync.
   */
  async fetchInventorySignals(
    channels: MarketplaceChannel[],
  ): Promise<MarketplaceInventorySignal[]> {
    const requested = new Set(channels);
    const tasks: Promise<MarketplaceInventorySignal[]>[] = [];
    if (requested.has('DummyJSON')) {
      tasks.push(this.fetchInventorySignalsFromDummyJson());
    }
    if (requested.has('FakeStore')) {
      tasks.push(this.fetchInventorySignalsFromFakeStore());
    }
    const settled = await Promise.allSettled(tasks);
    return settled
      .filter((s): s is PromiseFulfilledResult<MarketplaceInventorySignal[]> => s.status === 'fulfilled')
      .flatMap((s) => s.value);
  }

  /**
   * Simulates publishing products to a marketplace channel.
   * (We store publish history + generate feeds on-demand in the UI.)
   */
  async publish(input: MarketplacePublishRequest): Promise<void> {
    const listings = this.readListings();

    const nowDate = new Date();
    const now = new Date().toISOString();
    const key = `mp-${nowDate.getTime()}`;
    const reachBase = input.channel === 'DummyJSON' ? 120000 : 95000;
    const regionFactor =
      input.region === 'Global'
        ? 1
        : input.region === 'North America'
          ? 0.55
          : input.region === 'Europe'
            ? 0.48
            : input.region === 'Middle East'
              ? 0.3
              : 0.42;
    const shippingFactor =
      input.shippingProfile === 'Premium White-Glove'
        ? 1.18
        : input.shippingProfile === 'Expedited'
          ? 1.08
          : 1;
    const estimatedReach = Math.round(
      reachBase * regionFactor * shippingFactor * Math.max(1, input.productIds.length / 4),
    );
    const estimatedMarginImpactPercent =
      input.pricingMode === 'Increase7' ? 5.1 : input.pricingMode === 'Increase3' ? 2.4 : -0.7;
    const feedVersion = `${nowDate.getUTCFullYear()}.${(nowDate.getUTCMonth() + 1)
      .toString()
      .padStart(2, '0')}.${nowDate.getUTCDate().toString().padStart(2, '0')}-${nowDate
      .getUTCHours()
      .toString()
      .padStart(2, '0')}${nowDate.getUTCMinutes().toString().padStart(2, '0')}`;

    listings.unshift({
      $key: key,
      channel: input.channel,
      productIds: [...input.productIds],
      status: 'Published',
      createdAt: now,
      publishedAt: now,
      region: input.region,
      pricingMode: input.pricingMode,
      shippingProfile: input.shippingProfile,
      inventoryBufferPercent: input.inventoryBufferPercent,
      qualityChecks: [...input.qualityChecks],
      feedVersion,
      estimatedReach,
      estimatedMarginImpactPercent,
      adminNote: input.adminNote?.trim() || undefined,
    });

    localStorage.setItem(this.storageKey, JSON.stringify(listings));
    this.listingsSubject.next(listings);
  }

  private readListings(): MarketplaceListing[] {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as MarketplaceListing[];
    } catch {
      return [];
    }
  }

  private async fetchFromDummyJson(queryLower: string): Promise<MarketplaceExternalProduct[]> {
    const response = await fetch('https://dummyjson.com/products?limit=100');
    if (!response.ok) return [];
    const json = (await response.json()) as {
      products?: Array<{
        id: number;
        title: string;
        price: number;
        category: string;
        thumbnail?: string;
        description?: string;
        rating?: number;
        stock?: number;
        discountPercentage?: number;
      }>;
    };
    const list = Array.isArray(json.products) ? json.products : [];
    return list
      .filter((p) =>
        `${p.title} ${p.category} DJ-${p.id}`.toLowerCase().includes(queryLower),
      )
      .map((p) => ({
        externalId: `dummyjson-${p.id}`,
        channel: 'DummyJSON' as MarketplaceChannel,
        title: p.title,
        modelNumber: `DJ-${p.id}`,
        categoryName: this.toTitleCase((p.category || 'general').replace(/-/g, ' ')),
        price: Number(p.price || 0),
        imageUrl: p.thumbnail || 'assets/products/watch-1.png',
        description: p.description || 'Imported from free source.',
        rating: Number.isFinite(Number(p.rating)) ? Number(p.rating) : 4.2,
        ratingCount: Math.max(10, Number(p.stock || 50)),
        discountPercent: Number.isFinite(Number(p.discountPercentage))
          ? Math.round(Number(p.discountPercentage))
          : undefined,
      }));
  }

  private async fetchFromFakeStore(queryLower: string): Promise<MarketplaceExternalProduct[]> {
    const response = await fetch('https://fakestoreapi.com/products');
    if (!response.ok) return [];
    const list = (await response.json()) as Array<{
      id: number;
      title: string;
      price: number;
      category: string;
      image?: string;
      description?: string;
      rating?: { rate?: number; count?: number };
    }>;
    if (!Array.isArray(list)) return [];
    return list
      .filter((p) =>
        `${p.title} ${p.category} FS-${p.id}`.toLowerCase().includes(queryLower),
      )
      .map((p) => ({
        externalId: `fakestore-${p.id}`,
        channel: 'FakeStore' as MarketplaceChannel,
        title: p.title,
        modelNumber: `FS-${p.id}`,
        categoryName: this.toTitleCase((p.category || 'general').replace(/-/g, ' ')),
        price: Number(p.price || 0),
        imageUrl: p.image || 'assets/products/watch-2.png',
        description: p.description || 'Imported from free source.',
        rating: Number.isFinite(Number(p.rating?.rate)) ? Number(p.rating?.rate) : 4,
        ratingCount: Number.isFinite(Number(p.rating?.count)) ? Number(p.rating?.count) : 80,
      }));
  }

  private async fetchInventorySignalsFromDummyJson(): Promise<MarketplaceInventorySignal[]> {
    const response = await fetch('https://dummyjson.com/products?limit=100');
    if (!response.ok) return [];
    const json = (await response.json()) as {
      products?: Array<{
        id: number;
        title: string;
        stock?: number;
      }>;
    };
    const list = Array.isArray(json.products) ? json.products : [];
    return list.map((p) => ({
      channel: 'DummyJSON',
      modelNumber: `DJ-${p.id}`,
      title: p.title,
      stock: Math.max(0, Math.floor(Number(p.stock) || 0)),
    }));
  }

  private async fetchInventorySignalsFromFakeStore(): Promise<MarketplaceInventorySignal[]> {
    const response = await fetch('https://fakestoreapi.com/products');
    if (!response.ok) return [];
    const list = (await response.json()) as Array<{
      id: number;
      title: string;
      rating?: { count?: number };
    }>;
    if (!Array.isArray(list)) return [];
    return list.map((p) => ({
      channel: 'FakeStore',
      modelNumber: `FS-${p.id}`,
      title: p.title,
      // FakeStore has no stock; derive a stable estimate from popularity count.
      stock: Math.max(0, Math.floor(Number(p.rating?.count) || 0)),
    }));
  }

  private toTitleCase(text: string): string {
    return text
      .split(' ')
      .filter(Boolean)
      .map((x) => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase())
      .join(' ');
  }
}

