import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, Observable, combineLatest } from 'rxjs';
import { CategoryService } from '../services/category/category.service';
import { HomeSpotlightService } from '../services/home-spotlight/home-spotlight.service';
import { ProductService } from '../services/product/product.service';
import { ShoppingCartService } from '../services/shopping-cart/shopping-cart.service';
import { Product } from '../interfaces/product';
import { ShoppingCart } from '../interfaces/shopping-cart';

export type HomeHighlightSlide =
  | { kind: 'brand'; category: { $key: string; name: string } }
  | { kind: 'product'; product: Product };

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, OnDestroy {
  cart$: Observable<ShoppingCart>;
  featuredProducts: Product[] = [];
  trendingProducts: Product[] = [];
  featuredCategories: { $key: string; name: string }[] = [];
  /** Alternating brand promos + newest products for the hero carousel, or curated products only */
  highlightSlides: HomeHighlightSlide[] = [];
  /** True when admin curated list is driving the carousel (not the automatic mix). */
  curatedSpotlight = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private categoryService: CategoryService,
    private homeSpotlight: HomeSpotlightService,
    private productService: ProductService,
    private shoppingCartService: ShoppingCartService,
  ) {}

  async ngOnInit() {
    this.cart$ = await this.shoppingCartService.getCart();

    this.subscriptions.push(
      combineLatest([
        this.productService.getAll(),
        this.categoryService.getCategories(),
        this.homeSpotlight.spotlightIds$,
      ]).subscribe(([products, categories, spotlightIds]) => {
        this.featuredProducts = products.slice(0, 8);
        this.trendingProducts = products.slice(8, 16);
        this.featuredCategories = categories.slice(0, 6);
        this.applyHighlightSlides(products, categories, spotlightIds);
      }),
    );
  }

  private applyHighlightSlides(
    products: Product[],
    categories: { $key: string; name: string }[],
    spotlightIds: string[],
  ) {
    if (spotlightIds?.length) {
      const curated: HomeHighlightSlide[] = [];
      for (const id of spotlightIds) {
        const product = products.find((p) => p.$key === id);
        if (product) {
          curated.push({ kind: 'product', product });
        }
      }
      if (curated.length) {
        this.highlightSlides = curated;
        this.curatedSpotlight = true;
        return;
      }
    }
    this.curatedSpotlight = false;
    this.buildAutomaticHighlightSlides(products, categories);
  }

  /** Default: alternate brand slides + newest products (legacy behaviour). */
  private buildAutomaticHighlightSlides(
    products: Product[],
    categories: { $key: string; name: string }[],
  ) {
    const brands = categories.slice(0, 4);
    const newest = products.slice(-4).reverse();
    const slides: HomeHighlightSlide[] = [];
    const n = Math.min(brands.length, newest.length, 4);
    for (let i = 0; i < n; i++) {
      slides.push({ kind: 'brand', category: brands[i] });
      slides.push({ kind: 'product', product: newest[i] });
    }
    this.highlightSlides = slides;
  }

  slideId(slide: HomeHighlightSlide): string {
    return slide.kind === 'brand'
      ? `brand-${slide.category.$key}`
      : `product-${slide.product.$key}`;
  }

  hasDiscount(p: Product): boolean {
    if (!p.discountPrice) {
      return false;
    }
    const original = Number(p.price);
    const discounted = Number(p.discountPrice);
    return (
      Number.isFinite(original) &&
      Number.isFinite(discounted) &&
      discounted < original
    );
  }

  ngOnDestroy() {
    for (const sub of this.subscriptions) sub.unsubscribe();
  }
}
