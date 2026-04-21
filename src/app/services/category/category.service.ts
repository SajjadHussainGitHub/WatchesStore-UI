import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Category {
  $key: string;
  name: string;
}

export interface AddCategoryResult {
  ok: boolean;
  error?: string;
}

@Injectable()
export class CategoryService {
  private readonly storageKey = 'eshop.categories';
  private readonly brands = [
    'Rolex',
    'Omega',
    'Seiko',
    'Casio',
    'Tissot',
  ];

  private readonly categoriesSubject = new BehaviorSubject<Category[]>(this.readCategories());

  getCategories(): Observable<Category[]> {
    return this.categoriesSubject.asObservable();
  }

  /** Snapshot of the current list (sorted by name). */
  get categoriesSnapshot(): Category[] {
    return [...this.categoriesSubject.value];
  }

  addCategory(name: string): AddCategoryResult {
    const trimmed = (name ?? '').trim();
    if (!trimmed) {
      return { ok: false, error: 'Name is required.' };
    }
    const $key = this.keyFromName(trimmed);
    if (this.categoriesSubject.value.some((c) => c.$key === $key)) {
      return { ok: false, error: 'A category with this name already exists.' };
    }
    const next = [...this.categoriesSubject.value, { $key, name: trimmed }].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
    this.persist(next);
    return { ok: true };
  }

  deleteCategory($key: string): void {
    const next = this.categoriesSubject.value.filter((c) => c.$key !== $key);
    if (next.length === this.categoriesSubject.value.length) {
      return;
    }
    this.persist(next);
  }

  /** Same rules as product seeding / migration (`cat-slug`). */
  keyFromName(name: string): string {
    return `cat-${name.toLowerCase().replace(/\s+/g, '-')}`;
  }

  private buildDefaultCategories(): Category[] {
    return this.brands.map((brand) => ({
      $key: this.keyFromName(brand),
      name: brand,
    }));
  }

  private persist(categories: Category[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(categories));
    this.categoriesSubject.next(categories);
  }

  private readCategories(): Category[] {
    const seed = this.buildDefaultCategories();
    const allowed = new Set(seed.map((c) => c.$key));
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      localStorage.setItem(this.storageKey, JSON.stringify(seed));
      return [...seed];
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      const list = this.normalizeList(parsed);
      const filtered = list.filter((c) => allowed.has(c.$key));
      const byKey = new Map(filtered.map((c) => [c.$key, c]));
      const merged = seed.map((s) => byKey.get(s.$key) || s);
      localStorage.setItem(this.storageKey, JSON.stringify(merged));
      return merged;
    } catch {
      localStorage.setItem(this.storageKey, JSON.stringify(seed));
      return [...seed];
    }
  }

  private normalizeList(parsed: unknown): Category[] {
    if (!Array.isArray(parsed)) {
      return [];
    }
    const out: Category[] = [];
    const seen = new Set<string>();
    for (const row of parsed) {
      if (!row || typeof row !== 'object') {
        continue;
      }
      const r = row as Record<string, unknown>;
      const $key = typeof r['$key'] === 'string' ? r['$key'] : '';
      const name = typeof r['name'] === 'string' ? r['name'] : '';
      if ($key && name && !seen.has($key)) {
        seen.add($key);
        out.push({ $key, name });
      }
    }
    return out;
  }
}
