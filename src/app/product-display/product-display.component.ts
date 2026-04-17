import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { take } from 'rxjs';
import { ProductAttribute } from '../interfaces/product-attribute';
import { Product } from '../interfaces/product';
import { ShoppingCart } from '../interfaces/shopping-cart';
import { AuthService } from '../services/auth/auth.service';
import { ProductService } from '../services/product/product.service';
import { ShoppingCartService } from '../services/shopping-cart/shopping-cart.service';

@Component({
  selector: 'app-product-display',
  templateUrl: './product-display.component.html',
  styleUrls: ['./product-display.component.css'],
})
export class ProductDisplayComponent implements OnInit {
  product: Product;
  /** First two gallery images only (front + side); no third / “3D” style tab. */
  pdpGalleryUrls: string[] = [];
  selectedViewIndex = 0;
  readonly viewLabels = ['Front View', 'Side View'];
  readonly stars = [1, 2, 3, 4, 5];

  cart$: Observable<ShoppingCart>;
  recommended$: Observable<Product[]> = of([]);

  reviewAuthor = '';
  reviewRating = 5;
  reviewTitle = '';
  reviewComment = '';
  submittingReview = false;
  reviewFeedback: { type: 'success' | 'error'; text: string } | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private shoppingCartService: ShoppingCartService,
    private authService: AuthService,
  ) {}

  async ngOnInit() {
    const productId = this.route.snapshot.paramMap.get('id');
    if (!productId) {
      this.router.navigate(['/products']);
      return;
    }

    this.cart$ = await this.shoppingCartService.getCart();

    this.authService.user$.pipe(take(1)).subscribe((u) => {
      if (u?.displayName?.trim()) {
        this.reviewAuthor = u.displayName.trim();
      }
    });

    this.productService
      .getProduct(productId)
      .pipe(take(1))
      .subscribe((product) => {
        if (!product) {
          this.router.navigate(['/products']);
          return;
        }

        this.product = product;
        this.pdpGalleryUrls = this.buildPdpGalleryUrls(product);

        this.recommended$ = this.productService.getRecommendedProducts(
          product.$key,
          product.category,
          4,
        );
      });
  }

  selectView(index: number) {
    this.selectedViewIndex = index;
  }

  private buildPdpGalleryUrls(p: Product): string[] {
    const vu = p.viewImageUrls;
    const hero = p.imageUrl || '';
    if (vu && vu.length >= 2) {
      return [vu[0], vu[1]];
    }
    if (vu?.length === 1) {
      return [vu[0], vu[0]];
    }
    return [hero, hero];
  }

  get selectedImageUrl(): string {
    if (!this.pdpGalleryUrls.length) return this.product?.imageUrl || '';
    const i = Math.min(
      Math.max(0, this.selectedViewIndex),
      this.pdpGalleryUrls.length - 1,
    );
    return this.pdpGalleryUrls[i] || this.product?.imageUrl || '';
  }

  get brandName(): string {
    if (!this.product?.category) return '';
    return this.product.category
      .replace('cat-', '')
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  /** Groups specification rows for the accordion-style spec blocks */
  get specificationGroups(): { title: string; attrs: ProductAttribute[] }[] {
    const list = this.product?.attributes;
    if (!list?.length) {
      return [];
    }
    const map = new Map<string, ProductAttribute[]>();
    for (const a of list) {
      const g = a.group || 'Details';
      if (!map.has(g)) {
        map.set(g, []);
      }
      map.get(g)!.push(a);
    }
    return Array.from(map.entries()).map(([title, attrs]) => ({ title, attrs }));
  }

  addToCart() {
    if (!this.product) return;
    this.shoppingCartService.addToCart(this.product);
  }

  hasDiscount(p: Product | undefined): boolean {
    if (!p?.discountPrice) return false;
    const original = Number(p.price);
    const discounted = Number(p.discountPrice);
    return (
      Number.isFinite(original) &&
      Number.isFinite(discounted) &&
      discounted < original
    );
  }

  getStarIconClass(rating: number | undefined, starIndex: number): string {
    const r = rating ?? 0;
    if (r >= starIndex) return 'fa fa-star';
    if (r >= starIndex - 0.5) return 'fa fa-star-half-o';
    return 'fa fa-star-o';
  }

  setReviewRating(n: number) {
    this.reviewRating = Math.min(5, Math.max(1, Math.round(n)));
  }

  async submitReview() {
    this.reviewFeedback = null;
    if (!this.product) {
      return;
    }
    this.submittingReview = true;
    const result = await this.productService.addCustomerReview(this.product.$key, {
      author: this.reviewAuthor,
      rating: this.reviewRating,
      title: this.reviewTitle || undefined,
      comment: this.reviewComment,
    });
    this.submittingReview = false;

    if (result.ok === false) {
      this.reviewFeedback = { type: 'error', text: result.error };
      return;
    }

    this.reviewFeedback = {
      type: 'success',
      text: 'Thanks — your feedback was added to this product.',
    };
    this.reviewTitle = '';
    this.reviewComment = '';
    this.productService
      .getProduct(this.product.$key)
      .pipe(take(1))
      .subscribe((pr) => {
        if (pr) {
          this.product = pr;
          this.pdpGalleryUrls = this.buildPdpGalleryUrls(pr);
          this.recommended$ = this.productService.getRecommendedProducts(
            pr.$key,
            pr.category,
            4,
          );
        }
      });
  }
}

