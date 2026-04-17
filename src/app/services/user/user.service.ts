import { Injectable } from '@angular/core';
import { AppUser } from '../../interfaces/app-user';
import { of } from 'rxjs';
import { AuthUser } from '../auth/auth.service';

type StoredUser = AppUser & { password: string };

@Injectable()
export class UserService {
  private readonly storageKey = 'eshop.users';

  private readUsers(): Record<string, StoredUser> {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? (JSON.parse(raw) as Record<string, StoredUser>) : {};
  }

  get(uid: string) {
    const users = this.readUsers();
    return of((users[uid] || null) as AppUser | null);
  }

  registerCustomer(
    name: string,
    email: string,
    password: string,
    isAdmin = false,
  ) {
    const uid = this.emailToUid(email);
    const users = this.readUsers();

    if (users[uid]) {
      throw new Error('Email is already registered.');
    }

    users[uid] = {
      name,
      email,
      isAdmin,
      password,
    } as any;

    localStorage.setItem(this.storageKey, JSON.stringify(users));
    return uid;
  }

  verifyCredentials(email: string, password: string): AuthUser {
    const uid = this.emailToUid(email);
    const users = this.readUsers();
    const user: any = users[uid];

    if (!user) {
      throw new Error('Invalid email or password.');
    }

    if (user.password !== password) {
      throw new Error('Invalid email or password.');
    }

    return {
      uid,
      displayName: user.name,
      email: user.email,
    };
  }

  private emailToUid(email: string): string {
    return `user-${email.trim().toLowerCase()}`;
  }
}
