import { Component } from '@angular/core';
import { AuthService, DEMO_LOGIN_ACCOUNTS } from '../services/auth/auth.service';
import { ActivatedRoute, Router } from '@angular/router';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  /** Shown on the page for local demo sign-in. */
  readonly demoAccounts = DEMO_LOGIN_ACCOUNTS;

  email = '';
  password = '';
  rememberMe = true;
  showPassword = false;
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  fillAccount(index: number): void {
    const a = DEMO_LOGIN_ACCOUNTS[index];
    if (!a) {
      return;
    }
    this.email = a.email;
    this.password = a.password;
  }

  async login() {
    this.loading = true;
    this.errorMessage = '';

    try {
      const returnUrl =
        this.route.snapshot.queryParamMap.get('returnUrl') || '/products';
      localStorage.setItem('returnUrl', returnUrl);

      await this.authService.login(this.email, this.password);
      this.router.navigate(['/']);
    } catch (err: any) {
      this.errorMessage = err?.message || 'Login failed. Please try again.';
    } finally {
      this.loading = false;
    }
  }

}
