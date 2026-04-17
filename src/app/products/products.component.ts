import { Observable, switchMap } from 'rxjs';
import { ShoppingCartService } from './../services/shopping-cart/shopping-cart.service';
import { Product } from './../interfaces/product';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from './../services/product/product.service';
import { Component, OnInit } from '@angular/core';
import { ShoppingCart } from '../interfaces/shopping-cart';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css'],
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  category: string;
  searchKeyword = '';
  cart$: Observable<ShoppingCart>;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private shoppingCartService: ShoppingCartService,
  ) {}

  async ngOnInit() {
    this.cart$ = await this.shoppingCartService.getCart();
    this.populateProducts();
  }

  private populateProducts() {
    this.productService
      .getAll()
      .pipe(
        switchMap((products) => {
          this.products = products;
          return this.route.queryParamMap;
        }),
      )
      .subscribe((params) => {
        this.category = params.get('category');
        this.searchKeyword = params.get('q') || '';
        this.applyFilter();
      });
  }

  private applyFilter() {
    const keyword = this.searchKeyword.trim().toLowerCase();

    let filtered = this.category
      ? this.products.filter((p) => p.category === this.category)
      : this.products;

    if (!keyword) {
      this.filteredProducts = filtered;
      return;
    }

    this.filteredProducts = filtered.filter((p) => {
      const brand = (p.category || '')
        .replace('cat-', '')
        .replace(/-/g, ' ')
        .toLowerCase();

      return (
        (p.title || '').toLowerCase().includes(keyword) ||
        brand.includes(keyword)
      );
    });
  }
}
