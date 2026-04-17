import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { ProductService } from '../services/product/product.service';
import { Product } from '../interfaces/product';

type Crumb = { label: string; url?: string };

@Component({
  selector: 'app-breadcrumbs',
  templateUrl: './breadcrumbs.component.html',
  styleUrls: ['./breadcrumbs.component.css'],
})
export class BreadcrumbsComponent implements OnInit, OnDestroy {
  breadcrumbs: Crumb[] = [];
  private destroy$ = new Subject<void>();

  constructor(private router: Router, private productService: ProductService) {}

  ngOnInit() {
    this.build();
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.build());
  }

  private build() {
    const urlPath = this.router.url.split('?')[0];
    const parts = urlPath.split('/').filter(Boolean);

    if (parts.length === 0) {
      this.breadcrumbs = [{ label: 'Home', url: '/' }];
      return;
    }

    const [p0, p1] = parts;

    if (p0 === 'products') {
      if (p1) {
        this.breadcrumbs = [{ label: 'Collections', url: '/products' }, { label: 'Product' }];
        this.productService
          .getProduct(p1)
          .pipe(takeUntil(this.destroy$))
          .subscribe((product: Product) => {
            if (!product) return;
            this.breadcrumbs = [
              { label: 'Collections', url: '/products' },
              { label: product.title || 'Product' },
            ];
          });
        return;
      }

      this.breadcrumbs = [{ label: 'Collections', url: '/products' }];
      return;
    }

    if (p0 === 'shopping-cart') {
      this.breadcrumbs = [{ label: 'Cart', url: '/shopping-cart' }];
      return;
    }

    if (p0 === 'check-out') {
      this.breadcrumbs = [{ label: 'Checkout', url: '/check-out' }];
      return;
    }

    if (p0 === 'payment' && parts[1]) {
      this.breadcrumbs = [
        { label: 'Checkout', url: '/check-out' },
        { label: 'Payment', url: `/payment/${parts[1]}` },
      ];
      return;
    }

    if (p0 === 'order-success') {
      this.breadcrumbs = [{ label: 'Order Success' }];
      return;
    }

    if (p0 === 'my' && p1 === 'orders') {
      this.breadcrumbs = [{ label: 'My Orders', url: '/my/orders' }];
      return;
    }

    if (p0 === 'login') {
      this.breadcrumbs = [{ label: 'Sign In', url: '/login' }];
      return;
    }

    if (p0 === 'register') {
      this.breadcrumbs = [{ label: 'Register', url: '/register' }];
      return;
    }

    if (p0 === 'admin') {
      if (parts[1] === 'products') {
        if (parts[2] === 'bulk-upload') {
          this.breadcrumbs = [
            { label: 'Admin', url: '/admin/products' },
            { label: 'Bulk Upload', url: '/admin/products/bulk-upload' },
          ];
        } else if (parts[2]) {
          this.breadcrumbs = [{ label: 'Admin', url: '/admin/products' }, { label: 'Edit Product' }];
        } else {
          this.breadcrumbs = [{ label: 'Admin Products', url: '/admin/products' }];
        }
        return;
      }

      if (parts[1] === 'orders') {
        this.breadcrumbs = [{ label: 'Admin Orders', url: '/admin/orders' }];
        return;
      }

      if (parts[1] === 'categories') {
        this.breadcrumbs = [
          { label: 'Admin', url: '/admin/products' },
          { label: 'Categories', url: '/admin/categories' },
        ];
        return;
      }

      if (parts[1] === 'home-spotlight') {
        this.breadcrumbs = [
          { label: 'Admin', url: '/admin/products' },
          { label: 'Home slider', url: '/admin/home-spotlight' },
        ];
        return;
      }

      if (parts[1] === 'marketplace') {
        this.breadcrumbs = [
          { label: 'Admin', url: '/admin/products' },
          { label: 'Marketplace', url: '/admin/marketplace' },
        ];
        return;
      }

      this.breadcrumbs = [{ label: 'Admin' }];
      return;
    }

    this.breadcrumbs = [{ label: 'Home', url: '/' }];
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

