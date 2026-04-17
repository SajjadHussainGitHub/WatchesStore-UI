import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ProductService } from '../../services/product/product.service';
import { Product } from '../../interfaces/product';
import {
  MarketplaceChannel,
  MarketplaceExternalProduct,
  MarketplaceListing,
  MarketplaceRegion,
  MarketplacePublishRequest,
  PricingMode,
  ShippingProfile,
  MarketplaceService,
} from '../../services/marketplace/marketplace.service';
import { CategoryService } from '../../services/category/category.service';
import {
  InventorySyncResult,
  InventorySyncService,
  InventorySyncSettings,
} from '../../services/inventory-sync/inventory-sync.service';

type PublishError = { message: string };

@Component({
  selector: 'app-admin-marketplace',
  templateUrl: './admin-marketplace.component.html',
  styleUrls: ['./admin-marketplace.component.css'],
})
export class AdminMarketplaceComponent implements OnInit, OnDestroy {
  channels: MarketplaceChannel[] = ['DummyJSON', 'FakeStore'];
  regions: MarketplaceRegion[] = ['Global', 'North America', 'Europe', 'Middle East', 'APAC'];
  pricingModes: { id: PricingMode; label: string; hint: string }[] = [
    { id: 'Keep', label: 'Keep base price', hint: 'Best for competitive visibility.' },
    { id: 'Increase3', label: 'Increase by 3%', hint: 'Balances ad fees and conversion.' },
    { id: 'Increase7', label: 'Increase by 7%', hint: 'Protects premium margin.' },
  ];
  shippingProfiles: { id: ShippingProfile; hint: string }[] = [
    { id: 'Standard', hint: 'Reliable baseline courier profile.' },
    { id: 'Expedited', hint: 'Faster delivery boost.' },
    { id: 'Premium White-Glove', hint: 'Luxury handoff experience.' },
  ];
  qualityCheckOptions = [
    'Title length & SEO',
    'Image coverage',
    'Model/SKU completeness',
    'Price floor guard',
    'Category mapping',
  ];

  selectedChannel: MarketplaceChannel = 'DummyJSON';
  selectedRegion: MarketplaceRegion = 'Global';
  selectedPricingMode: PricingMode = 'Keep';
  selectedShippingProfile: ShippingProfile = 'Standard';
  inventoryBufferPercent = 8;
  selectedQualityChecks: string[] = [...this.qualityCheckOptions];
  adminNote = '';
  products: Product[] = [];
  filteredProducts: Product[] = [];

  // productIds selected for current publish operation
  selectedProductIds: string[] = [];

  query = '';
  errorMessage = '';
  publishLoading = false;
  importQuery = '';
  importLoading = false;
  importMessage = '';
  externalResults: MarketplaceExternalProduct[] = [];
  externalError = '';
  selectedImportChannels: MarketplaceChannel[] = ['DummyJSON', 'FakeStore'];
  importingExternalIds = new Set<string>();
  syncSettings: InventorySyncSettings = {
    enabled: false,
    intervalMinutes: 30,
    channels: ['DummyJSON', 'FakeStore'],
    inventoryBufferPercent: 8,
  };
  inventorySyncLoading = false;
  inventorySyncMessage = '';
  inventorySyncError = '';
  lastInventorySync: InventorySyncResult | null = null;

  listings: MarketplaceListing[] = [];
  private sub?: Subscription;
  private listingsSub?: Subscription;
  private syncSettingsSub?: Subscription;

  constructor(
    private productService: ProductService,
    private marketplaceService: MarketplaceService,
    private categoryService: CategoryService,
    private inventorySyncService: InventorySyncService,
  ) {}

  ngOnInit(): void {
    this.sub = this.productService.getAll().subscribe((products) => {
      this.products = products;
      this.filteredProducts = products;
    });

    this.listingsSub = this.marketplaceService.getListings().subscribe((listings) => {
      this.listings = listings;
    });
    this.syncSettingsSub = this.inventorySyncService
      .getSettings()
      .subscribe((settings) => (this.syncSettings = { ...settings }));
    this.lastInventorySync = this.inventorySyncService.readLastResult();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.listingsSub?.unsubscribe();
    this.syncSettingsSub?.unsubscribe();
  }

  toggleProduct(productId: string, checked: boolean) {
    this.selectedProductIds = checked
      ? [...new Set([...this.selectedProductIds, productId])]
      : this.selectedProductIds.filter((id) => id !== productId);
  }

  isSelected(productId: string): boolean {
    return this.selectedProductIds.includes(productId);
  }

  filterProducts() {
    const q = this.query.trim().toLowerCase();
    this.filteredProducts = q
      ? this.products.filter((p) => p.title.toLowerCase().includes(q))
      : this.products;
  }

  resetSelection() {
    this.selectedProductIds = [];
    this.errorMessage = '';
  }

  async publishSelected() {
    this.errorMessage = '';
    this.publishLoading = true;

    try {
      if (!this.selectedProductIds.length) {
        throw { message: 'Select at least one product to publish.' } as PublishError;
      }

      const request: MarketplacePublishRequest = {
        channel: this.selectedChannel,
        productIds: this.selectedProductIds,
        region: this.selectedRegion,
        pricingMode: this.selectedPricingMode,
        shippingProfile: this.selectedShippingProfile,
        inventoryBufferPercent: this.inventoryBufferPercent,
        qualityChecks: this.selectedQualityChecks,
        adminNote: this.adminNote,
      };
      await this.marketplaceService.publish(request);

      // Clear selection after publish success
      this.resetSelection();
    } catch (err: any) {
      this.errorMessage = err?.message || 'Publish failed.';
    } finally {
      this.publishLoading = false;
    }
  }

  getSelectedCount(): number {
    return this.selectedProductIds.length;
  }

  toggleQualityCheck(label: string, checked: boolean) {
    this.selectedQualityChecks = checked
      ? [...new Set([...this.selectedQualityChecks, label])]
      : this.selectedQualityChecks.filter((x) => x !== label);
  }

  isQualityCheckEnabled(label: string): boolean {
    return this.selectedQualityChecks.includes(label);
  }

  getPublishedCount(): number {
    return this.listings.filter((l) => l.status === 'Published').length;
  }

  getEstimatedReachTotal(): number {
    return this.listings.reduce((sum, l) => sum + (l.estimatedReach || 0), 0);
  }

  isImportChannelSelected(channel: MarketplaceChannel): boolean {
    return this.selectedImportChannels.includes(channel);
  }

  toggleImportChannel(channel: MarketplaceChannel, checked: boolean) {
    this.selectedImportChannels = checked
      ? [...new Set([...this.selectedImportChannels, channel])]
      : this.selectedImportChannels.filter((c) => c !== channel);
  }

  async runInventorySyncNow() {
    this.inventorySyncLoading = true;
    this.inventorySyncError = '';
    this.inventorySyncMessage = '';
    try {
      const result = await this.inventorySyncService.runSyncNow({
        channels: this.syncSettings.channels,
        inventoryBufferPercent: this.syncSettings.inventoryBufferPercent,
      });
      this.lastInventorySync = result;
      this.inventorySyncMessage =
        `Inventory sync completed. Matched ${result.matched}/${result.scanned}, ` +
        `updated ${result.updated} products.`;
    } catch {
      this.inventorySyncError =
        'Inventory sync failed. Check marketplace connectors and try again.';
    } finally {
      this.inventorySyncLoading = false;
    }
  }

  saveInventorySyncSettings() {
    this.syncSettings = this.inventorySyncService.updateSettings(this.syncSettings);
    this.inventorySyncMessage = this.syncSettings.enabled
      ? `Auto sync enabled every ${this.syncSettings.intervalMinutes} minutes.`
      : 'Auto sync disabled.';
    this.inventorySyncError = '';
  }

  toggleInventorySyncChannel(channel: MarketplaceChannel, checked: boolean) {
    const next = checked
      ? [...new Set([...this.syncSettings.channels, channel])]
      : this.syncSettings.channels.filter((c) => c !== channel);
    const fallbackChannel = this.channels.find((c) => c !== channel) || this.channels[0];
    this.syncSettings = {
      ...this.syncSettings,
      channels: next.length ? next : [fallbackChannel],
    };
  }

  isInventorySyncChannelSelected(channel: MarketplaceChannel): boolean {
    return this.syncSettings.channels.includes(channel);
  }

  async searchExternalProducts() {
    this.externalError = '';
    this.importMessage = '';
    this.externalResults = [];
    const q = this.importQuery.trim();
    if (!q) {
      this.externalError = 'Enter keyword or model number to search.';
      return;
    }
    if (!this.selectedImportChannels.length) {
      this.externalError = 'Select at least one marketplace channel.';
      return;
    }
    this.importLoading = true;
    try {
      this.externalResults = await this.marketplaceService.searchExternalProducts(
        q,
        this.selectedImportChannels,
      );
      if (!this.externalResults.length) {
        this.externalError = 'No matching marketplace products were found.';
      }
    } catch {
      this.externalError = 'External search failed. Please try again.';
    } finally {
      this.importLoading = false;
    }
  }

  async importExternalProduct(row: MarketplaceExternalProduct) {
    this.importMessage = '';
    this.externalError = '';
    this.importingExternalIds.add(row.externalId);
    try {
      const existing = this.products.find(
        (p) =>
          p.modelNumber?.toLowerCase() === row.modelNumber.toLowerCase(),
      );
      if (existing) {
        this.externalError = `Model ${row.modelNumber} already exists in system.`;
        return;
      }

      const categoryKey = this.resolveOrCreateCategory(row.categoryName);
      const price = Number(row.price || 0);
      const discountPercent = row.discountPercent || 0;
      const discountPrice =
        discountPercent > 0
          ? (price * (1 - discountPercent / 100)).toFixed(2)
          : undefined;

      await this.productService.create({
        title: row.title,
        category: categoryKey,
        modelNumber: row.modelNumber,
        imageUrl: row.imageUrl,
        price: price.toFixed(2),
        discountPercent: discountPercent || undefined,
        discountPrice,
        rating: row.rating,
        ratingCount: row.ratingCount,
        longDescription: row.description,
      });
      this.importMessage = `Imported ${row.title} (${row.modelNumber}) successfully.`;
    } catch {
      this.externalError = 'Import failed for selected external product.';
    } finally {
      this.importingExternalIds.delete(row.externalId);
    }
  }

  private resolveOrCreateCategory(categoryName: string): string {
    const name = categoryName.trim();
    const existing = this.categoryService.categoriesSnapshot.find(
      (c) =>
        c.name.toLowerCase() === name.toLowerCase() ||
        c.$key.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      return existing.$key;
    }
    const add = this.categoryService.addCategory(name);
    if (!add.ok) {
      return this.categoryService.keyFromName(name);
    }
    const created = this.categoryService.categoriesSnapshot.find(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    );
    return created?.$key || this.categoryService.keyFromName(name);
  }

  private findProductsByIds(ids: string[]): Product[] {
    const set = new Set(ids);
    return this.products.filter((p) => set.has(p.$key));
  }

  exportFeedForChannel(listing: MarketplaceListing) {
    const items = this.findProductsByIds(listing.productIds);

    const feed = {
      channel: listing.channel,
      generatedAt: new Date().toISOString(),
      feedVersion: listing.feedVersion,
      publishConfig: {
        region: listing.region,
        pricingMode: listing.pricingMode,
        shippingProfile: listing.shippingProfile,
        inventoryBufferPercent: listing.inventoryBufferPercent,
        qualityChecks: listing.qualityChecks,
        estimatedReach: listing.estimatedReach,
        estimatedMarginImpactPercent: listing.estimatedMarginImpactPercent,
        adminNote: listing.adminNote || '',
      },
      store: {
        name: 'Watches Store',
      },
      items: items.map((p) => ({
        id: p.$key,
        title: p.title,
        modelNumber: p.modelNumber,
        price: p.price,
        category: p.category,
        imageUrl: p.imageUrl,
        viewImageUrls: p.viewImageUrls || [p.imageUrl],
      })),
      notes:
        'This feed is generated for admin review. Connect AWS / AliBaba APIs if you want real publishing.',
    };

    const json = JSON.stringify(feed, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `marketplace-feed-${listing.channel}-${listing.$key}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  downloadPublishedFeedFromListing(listing: MarketplaceListing) {
    this.exportFeedForChannel(listing);
  }
}

