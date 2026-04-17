import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  acceptTerms = false;
  showPassword = false;

  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  async register() {
    this.errorMessage = '';

    if (!this.name.trim()) {
      this.errorMessage = 'Please enter your full name.';
      return;
    }
    if (!this.email.trim()) {
      this.errorMessage = 'Please enter your email.';
      return;
    }
    if (!this.password || this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }
    if (!this.acceptTerms) {
      this.errorMessage = 'You must accept the terms to create an account.';
      return;
    }

    this.loading = true;
    try {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/products';
      localStorage.setItem('returnUrl', returnUrl);

      await this.authService.register(this.name, this.email, this.password);
      this.router.navigate(['/']);
    } catch (err: any) {
      this.errorMessage = err?.message || 'Registration failed.';
    } finally {
      this.loading = false;
    }
  }
}

