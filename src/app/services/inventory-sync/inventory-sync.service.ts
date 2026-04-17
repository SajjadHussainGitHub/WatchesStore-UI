import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Product } from '../../interfaces/product';
import {
  MarketplaceChannel,
  MarketplaceInventorySignal,
  MarketplaceService,
} from '../marketplace/marketplace.service';
import { ProductService } from '../product/product.service';

export interface InventorySyncSettings {
  enabled: boolean;
  intervalMinutes: number;
  channels: MarketplaceChannel[];
  inventoryBufferPercent: number;
}

export interface InventorySyncResult {
  syncedAt: string;
  scanned: number;
  matched: number;
  updated: number;
}

@Injectable()
export class InventorySyncService implements OnDestroy {
  private readonly settingsStorageKey = 'eshop.inventory.sync.settings';
  private readonly resultStorageKey = 'eshop.inventory.sync.lastResult';
  private readonly defaultSettings: InventorySyncSettings = {
    enabled: false,
    intervalMinutes: 30,
    channels: ['DummyJSON', 'FakeStore'],
    inventoryBufferPercent: 8,
  };
  private timerId?: ReturnType<typeof setInterval>;
  private readonly settingsSubject = new BehaviorSubject<InventorySyncSettings>(
    this.readSettings(),
  );

  constructor(
    private productService: ProductService,
    private marketplaceService: MarketplaceService,
  ) {
    this.applyTimer(this.settingsSubject.value);
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  getSettings() {
    return this.settingsSubject.asObservable();
  }

  getCurrentSettings(): InventorySyncSettings {
    return this.settingsSubject.value;
  }

  readLastResult(): InventorySyncResult | null {
    const raw = localStorage.getItem(this.resultStorageKey);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as InventorySyncResult;
    } catch {
      return null;
    }
  }

  updateSettings(patch: Partial<InventorySyncSettings>): InventorySyncSettings {
    const next = this.normalizeSettings({ ...this.settingsSubject.value, ...patch });
    localStorage.setItem(this.settingsStorageKey, JSON.stringify(next));
    this.settingsSubject.next(next);
    this.applyTimer(next);
    return next;
  }

  async runSyncNow(
    override?: Partial<Pick<InventorySyncSettings, 'channels' | 'inventoryBufferPercent'>>,
  ): Promise<InventorySyncResult> {
    const cfg = this.normalizeSettings({ ...this.settingsSubject.value, ...override });
    const syncedAt = new Date().toISOString();
    const products = await firstValueFrom(this.productService.getAll());
    const signals = await this.marketplaceService.fetchInventorySignals(cfg.channels);
    const signalIndex = this.buildSignalIndex(signals);
    const updates: Array<{ productId: string; inventoryQty: number; syncedAt: string }> = [];
    let matched = 0;

    for (const product of products) {
      const source = this.resolveSignalForProduct(product, signalIndex);
      if (!source) {
        continue;
      }
      matched++;
      const adjusted = Math.max(
        0,
        Math.floor(source.stock * (1 - cfg.inventoryBufferPercent / 100)),
      );
      updates.push({
        productId: product.$key,
        inventoryQty: adjusted,
        syncedAt,
      });
    }

    const write = this.productService.updateInventoryBulk(updates);
    const result: InventorySyncResult = {
      syncedAt,
      scanned: products.length,
      matched,
      updated: write.updated,
    };
    localStorage.setItem(this.resultStorageKey, JSON.stringify(result));
    return result;
  }

  private applyTimer(settings: InventorySyncSettings): void {
    this.stopTimer();
    if (!settings.enabled) {
      return;
    }
    const ms = Math.max(1, settings.intervalMinutes) * 60 * 1000;
    this.timerId = setInterval(() => {
      this.runSyncNow().catch(() => {
        // Best effort scheduler; manual sync reports errors in UI.
      });
    }, ms);
  }

  private stopTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = undefined;
    }
  }

  private readSettings(): InventorySyncSettings {
    const raw = localStorage.getItem(this.settingsStorageKey);
    if (!raw) {
      return { ...this.defaultSettings };
    }
    try {
      return this.normalizeSettings(JSON.parse(raw) as InventorySyncSettings);
    } catch {
      return { ...this.defaultSettings };
    }
  }

  private normalizeSettings(input: InventorySyncSettings): InventorySyncSettings {
    const channelSet = new Set<MarketplaceChannel>(
      Array.isArray(input.channels) ? input.channels : this.defaultSettings.channels,
    );
    const channels = (['DummyJSON', 'FakeStore'] as MarketplaceChannel[]).filter((c) =>
      channelSet.has(c),
    );
    return {
      enabled: !!input.enabled,
      intervalMinutes: Math.min(360, Math.max(1, Number(input.intervalMinutes) || 30)),
      channels: channels.length ? channels : [...this.defaultSettings.channels],
      inventoryBufferPercent: Math.min(
        40,
        Math.max(0, Number(input.inventoryBufferPercent) || 0),
      ),
    };
  }

  private buildSignalIndex(signals: MarketplaceInventorySignal[]) {
    const byModel = new Map<string, MarketplaceInventorySignal>();
    const byTitle = new Map<string, MarketplaceInventorySignal>();
    for (const s of signals) {
      byModel.set(this.normalize(s.modelNumber), s);
      byTitle.set(this.normalize(s.title), s);
    }
    return { byModel, byTitle, all: signals };
  }

  private resolveSignalForProduct(
    product: Product,
    index: {
      byModel: Map<string, MarketplaceInventorySignal>;
      byTitle: Map<string, MarketplaceInventorySignal>;
      all: MarketplaceInventorySignal[];
    },
  ): MarketplaceInventorySignal | null {
    const modelKey = this.normalize(product.modelNumber || '');
    if (modelKey && index.byModel.has(modelKey)) {
      return index.byModel.get(modelKey) || null;
    }
    const titleKey = this.normalize(product.title || '');
    if (!titleKey) {
      return null;
    }
    if (index.byTitle.has(titleKey)) {
      return index.byTitle.get(titleKey) || null;
    }
    return (
      index.all.find((s) => {
        const external = this.normalize(s.title);
        return external.includes(titleKey) || titleKey.includes(external);
      }) || null
    );
  }

  private normalize(text: string): string {
    return (text || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ');
  }
}
