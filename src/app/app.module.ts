import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from './services/auth/auth.service';
import { UserService } from './services/user/user.service';
import { ShoppingCartService } from './services/shopping-cart/shopping-cart.service';
import { OrderService } from './services/order/order.service';

import { AppComponent } from './app.component';
import { BsNavbarComponent } from './bs-navbar/bs-navbar.component';
import { HomeComponent } from './home/home.component';
import { ProductsComponent } from './products/products.component';
import { ShoppingCartComponent } from './shopping-cart/shopping-cart.component';
import { CheckOutComponent } from './check-out/check-out.component';
import { PaymentCheckoutComponent } from './payment-checkout/payment-checkout.component';
import { OrderSuccessComponent } from './order-success/order-success.component';
import { MyOrdersComponent } from './my-orders/my-orders.component';
import { AdminProductsComponent } from './admin/admin-products/admin-products.component';
import { AdminOrdersComponent } from './admin/admin-orders/admin-orders.component';
import { LoginComponent } from './login/login.component';
import { AuthGuardService } from './services/auth-guard/auth-guard.service';
import { AdminAuthGuardService } from './services/admin-auth-guard/admin-auth-guard.service';
import { ProductFormComponent } from './admin/product-form/product-form.component';
import { CategoryService } from './services/category/category.service';
import { ProductService } from './services/product/product.service';
import { ProductFilterComponent } from './product-filter/product-filter.component';
import { ProductCartComponent } from './product-cart/product-cart.component';
import { ProductQuantityComponent } from './product-quantity/product-quantity.component';
import { ShoppingCartSummaryComponent } from './shopping-cart-summary/shopping-cart-summary.component';
import { ProductDisplayComponent } from './product-display/product-display.component';
import { RegisterComponent } from './register/register.component';
import { BreadcrumbsComponent } from './breadcrumbs/breadcrumbs.component';
import { AdminMarketplaceComponent } from './admin/admin-marketplace/admin-marketplace.component';
import { AdminCategoriesComponent } from './admin/admin-categories/admin-categories.component';
import { AdminHomeSpotlightComponent } from './admin/admin-home-spotlight/admin-home-spotlight.component';
import { AdminBulkProductsComponent } from './admin/admin-bulk-products/admin-bulk-products.component';
import { MarketplaceService } from './services/marketplace/marketplace.service';
import { CurrencyService } from './services/currency/currency.service';
import { ShopCurrencyPipe } from './pipes/shop-currency.pipe';
import { HomeSpotlightService } from './services/home-spotlight/home-spotlight.service';
import { ShippingService } from './services/shipping/shipping.service';

@NgModule({
  declarations: [
    AppComponent,
    BsNavbarComponent,
    HomeComponent,
    ProductsComponent,
    ProductDisplayComponent,
    ShoppingCartComponent,
    CheckOutComponent,
    PaymentCheckoutComponent,
    OrderSuccessComponent,
    MyOrdersComponent,
    AdminProductsComponent,
    AdminOrdersComponent,
    LoginComponent,
    RegisterComponent,
    ProductFormComponent,
    ProductFilterComponent,
    ProductCartComponent,
    ProductQuantityComponent,
    ShoppingCartSummaryComponent,
    BreadcrumbsComponent,
    AdminMarketplaceComponent,
    AdminCategoriesComponent,
    AdminHomeSpotlightComponent,
    AdminBulkProductsComponent,
    ShopCurrencyPipe,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    NgbModule,
    RouterModule.forRoot([
      // Anonymous User
      {
        path: '',
        component: HomeComponent,
      },
      {
        path: 'products',
        component: ProductsComponent,
      },
      {
        path: 'products/:id',
        component: ProductDisplayComponent,
      },
      {
        path: 'shopping-cart',
        component: ShoppingCartComponent,
      },
      {
        path: 'login',
        component: LoginComponent,
      },
      {
        path: 'register',
        component: RegisterComponent,
      },

      // Access for Registered Users
      {
        path: 'check-out',
        component: CheckOutComponent,
        canActivate: [AuthGuardService],
      },
      {
        path: 'payment/:orderId',
        component: PaymentCheckoutComponent,
        canActivate: [AuthGuardService],
      },
      {
        path: 'order-success/:id',
        component: OrderSuccessComponent,
        canActivate: [AuthGuardService],
      },
      {
        path: 'my/orders',
        component: MyOrdersComponent,
        canActivate: [AuthGuardService],
      },

      // Admin Routes
      {
        path: 'admin/products/new',
        component: ProductFormComponent,
        canActivate: [AuthGuardService, AdminAuthGuardService],
      },
      {
        path: 'admin/products/bulk-upload',
        component: AdminBulkProductsComponent,
        canActivate: [AuthGuardService, AdminAuthGuardService],
      },
      {
        path: 'admin/products/:id',
        component: ProductFormComponent,
        canActivate: [AuthGuardService, AdminAuthGuardService],
      },
      {
        path: 'admin/categories',
        component: AdminCategoriesComponent,
        canActivate: [AuthGuardService, AdminAuthGuardService],
      },
      {
        path: 'admin/home-spotlight',
        component: AdminHomeSpotlightComponent,
        canActivate: [AuthGuardService, AdminAuthGuardService],
      },
      {
        path: 'admin/products',
        component: AdminProductsComponent,
        canActivate: [AuthGuardService, AdminAuthGuardService],
      },
      {
        path: 'admin/orders',
        component: AdminOrdersComponent,
        canActivate: [AuthGuardService, AdminAuthGuardService],
      },
      {
        path: 'admin/marketplace',
        component: AdminMarketplaceComponent,
        canActivate: [AuthGuardService, AdminAuthGuardService],
      },
    ]),
  ],
  providers: [
    AuthService,
    AuthGuardService,
    UserService,
    AdminAuthGuardService,
    CategoryService,
    HomeSpotlightService,
    ShippingService,
    ProductService,
    ShoppingCartService,
    OrderService,
    MarketplaceService,
    CurrencyService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
