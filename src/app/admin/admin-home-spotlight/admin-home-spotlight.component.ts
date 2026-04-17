import { Component } from '@angular/core';
import { combineLatest, map } from 'rxjs';
import { Product } from '../../interfaces/product';
import { HomeSpotlightService } from '../../services/home-spotlight/home-spotlight.service';
import { ProductService } from '../../services/product/product.service';

@Component({
  selector: 'app-admin-home-spotlight',
  templateUrl: './admin-home-spotlight.component.html',
  styleUrls: ['./admin-home-spotlight.component.css'],
})
export class AdminHomeSpotlightComponent {
  addError: string | null = null;
  selectedProductId = '';

  readonly vm$ = combineLatest([
    this.productService.getAll(),
    this.homeSpotlight.spotlightIds$,
  ]).pipe(
    map(([products, ids]) => {
      const byKey = new Map(products.map((p) => [p.$key, p]));
      const rows = ids.map((id) => ({
        id,
        product: byKey.get(id),
        missing: !byKey.has(id),
      }));
      const inSlider = new Set(ids);
      const available = products
        .filter((p) => !inSlider.has(p.$key))
        .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
      return { rows, available, count: ids.length, max: this.homeSpotlight.maxSlides };
    }),
  );

  constructor(
    private productService: ProductService,
    private homeSpotlight: HomeSpotlightService,
  ) {}

  add(): void {
    this.addError = null;
    const r = this.homeSpotlight.addProductId(this.selectedProductId);
    if (r.ok) {
      this.selectedProductId = '';
    } else {
      this.addError = r.error ?? 'Could not add.';
    }
  }

  removeAt(index: number): void {
    this.homeSpotlight.removeAt(index);
  }

  moveUp(index: number): void {
    this.homeSpotlight.moveUp(index);
  }

  moveDown(index: number): void {
    this.homeSpotlight.moveDown(index);
  }

  clear(): void {
    if (!confirm('Clear the curated list? The home page will use the automatic carousel again.')) {
      return;
    }
    this.homeSpotlight.clear();
  }
}
