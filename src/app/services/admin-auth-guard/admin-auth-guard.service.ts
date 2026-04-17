import { CanActivate } from '@angular/router';
import { Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { Observable, map } from 'rxjs';

@Injectable()
export class AdminAuthGuardService implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(): Observable<boolean> {
    return this.authService.appUser$.pipe(map((appUser) => !!appUser?.isAdmin));
  }
}
