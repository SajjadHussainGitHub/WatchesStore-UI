import { AuthService } from './../auth/auth.service';
import { Injectable } from '@angular/core';
import { CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { map } from 'rxjs';

@Injectable()
export class AuthGuardService implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivate(route, state: RouterStateSnapshot) {
    return this.authService.user$.pipe(map((user) => {
      // tslint:disable-next-line:curly
      if (user) return true;

      this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: state.url,
        },
      });
      return false;
    }));
  }
}
