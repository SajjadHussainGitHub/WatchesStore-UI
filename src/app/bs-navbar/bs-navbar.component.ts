import { Observable } from 'rxjs';
import { ShoppingCartService } from './../services/shopping-cart/shopping-cart.service';
import { AppUser } from './../interfaces/app-user';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { ShoppingCart } from '../interfaces/shopping-cart';
import { Router, ActivatedRoute } from '@angular/router';
import { CurrencyService, ShopCurrencyCode } from '../services/currency/currency.service';
import {
  UiLanguageCode,
  UiLanguageService,
} from '../services/ui-language/ui-language.service';

@Component({
  selector: 'bs-navbar',
  templateUrl: './bs-navbar.component.html',
  styleUrls: ['./bs-navbar.component.css'],
})
export class BsNavbarComponent implements OnInit {
  appUser: AppUser;
  cart$: Observable<ShoppingCart>;
  searchKeyword = '';
  readonly languages: Array<{ code: UiLanguageCode; labelKey: string }> = [
    { code: 'en', labelKey: 'LANG.ENGLISH' },
    { code: 'ar', labelKey: 'LANG.ARABIC' },
    { code: 'fr', labelKey: 'LANG.FRENCH' },
    { code: 'de', labelKey: 'LANG.GERMAN' },
  ];
  selectedLanguage: UiLanguageCode = 'en';

  constructor(
    private authService: AuthService,
    private shoppingCartService: ShoppingCartService,
    private router: Router,
    private route: ActivatedRoute,
    readonly currencyService: CurrencyService,
    private uiLanguage: UiLanguageService,
  ) {}

  async ngOnInit() {
    this.authService.appUser$.subscribe((appUser) => (this.appUser = appUser));
    this.cart$ = await this.shoppingCartService.getCart();
    this.selectedLanguage = this.uiLanguage.init();
  }

  logout() {
    this.authService.logout();
  }

  onSearch() {
    const q = this.searchKeyword.trim();
    const category = this.route.snapshot.queryParamMap.get('category');

    const queryParams: any = {};
    if (q) queryParams.q = q;
    if (category) queryParams.category = category;

    this.router.navigate(['/products'], {
      queryParams: Object.keys(queryParams).length ? queryParams : undefined,
    });
  }

  removeCartLine(productId: string, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.shoppingCartService.removeLineFromCart(productId);
  }

  selectCurrency(code: ShopCurrencyCode) {
    this.currencyService.setCurrency(code);
  }

  selectLanguage(code: UiLanguageCode) {
    this.selectedLanguage = code;
    this.uiLanguage.setLanguage(code);
  }
}
