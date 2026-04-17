import { UserService } from './../user/user.service';
import { AppUser } from './../../interfaces/app-user';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, switchMap } from 'rxjs';

export interface AuthUser {
  uid: string;
  displayName: string;
  email: string;
}

/** Built-in demo users (local auth). Shown on the login page. */
export const DEMO_LOGIN_ACCOUNTS = [
  {
    role: 'Customer' as const,
    name: 'Watches Customer',
    email: 'customer@watches.local',
    password: 'password',
    isAdmin: false,
  },
  {
    role: 'Admin' as const,
    name: 'Watches Admin',
    email: 'admin@watches.local',
    password: 'admin',
    isAdmin: true,
  },
];

@Injectable()
export class AuthService {
  private readonly authStorageKey = 'eshop.auth.user';
  private userSubject = new BehaviorSubject<AuthUser | null>(this.readAuthUser());
  user$: Observable<AuthUser | null> = this.userSubject.asObservable();

  constructor(private userService: UserService) {
    this.seedDefaultUsers();
  }

  async login(email: string, password: string): Promise<void> {
    const authUser = this.userService.verifyCredentials(email, password);
    localStorage.setItem(this.authStorageKey, JSON.stringify(authUser));
    this.userSubject.next(authUser);
  }

  async register(name: string, email: string, password: string): Promise<void> {
    this.userService.registerCustomer(name, email, password, false);
    await this.login(email, password);
  }

  logout() {
    localStorage.removeItem(this.authStorageKey);
    this.userSubject.next(null);
  }

  get appUser$(): Observable<AppUser | null> {
    return this.user$.pipe(
      switchMap((user) => {
      if (user) return this.userService.get(user.uid);

        return of(null);
      }),
    );
  }

  private readAuthUser(): AuthUser | null {
    const raw = localStorage.getItem(this.authStorageKey);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }

  private seedDefaultUsers() {
    const emailToUid = (email: string) =>
      `user-${email.trim().toLowerCase()}`;

    try {
      const rawUsers = localStorage.getItem('eshop.users');
      let users: Record<string, any> = {};
      if (rawUsers) {
        users = JSON.parse(rawUsers) as Record<string, any>;
      }

      let changed = false;
      for (const d of DEMO_LOGIN_ACCOUNTS) {
        const uid = emailToUid(d.email);
        const existing = users[uid];

        // Overwrite only if the account is missing or doesn't match defaults.
        if (
          !existing ||
          existing.password !== d.password ||
          existing.isAdmin !== d.isAdmin ||
          existing.name !== d.name
        ) {
          users[uid] = {
            name: d.name,
            email: d.email,
            isAdmin: d.isAdmin,
            password: d.password,
          };
          changed = true;
        }
      }

      if (changed) {
        localStorage.setItem('eshop.users', JSON.stringify(users));
      }
    } catch {
      // If localStorage is corrupted/unavailable, ignore seeding errors.
    }
  }
}
