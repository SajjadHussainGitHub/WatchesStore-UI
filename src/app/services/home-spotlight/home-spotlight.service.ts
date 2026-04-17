import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Curated product IDs for the home page “New arrivals & brands” carousel.
 * When empty, {@link HomeComponent} falls back to automatic brand + newest-product slides.
 */
@Injectable()
export class HomeSpotlightService {
  private readonly storageKey = 'eshop.homeSpotlight';
  /** Upper bound so the carousel stays usable. */
  readonly maxSlides = 12;

  private readonly subject = new BehaviorSubject<string[]>(this.read());

  readonly spotlightIds$: Observable<string[]> = this.subject.asObservable();

  getIds(): string[] {
    return [...this.subject.value];
  }

  setIds(ids: string[]): void {
    const seen = new Set<string>();
    const next: string[] = [];
    for (const id of ids) {
      if (typeof id !== 'string' || !id.trim()) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      next.push(id);
      if (next.length >= this.maxSlides) break;
    }
    localStorage.setItem(this.storageKey, JSON.stringify(next));
    this.subject.next(next);
  }

  addProductId(id: string): { ok: boolean; error?: string } {
    const trimmed = id?.trim();
    if (!trimmed) {
      return { ok: false, error: 'Select a product.' };
    }
    const cur = this.subject.value;
    if (cur.includes(trimmed)) {
      return { ok: false, error: 'That product is already in the slider.' };
    }
    if (cur.length >= this.maxSlides) {
      return { ok: false, error: `Maximum ${this.maxSlides} products.` };
    }
    this.setIds([...cur, trimmed]);
    return { ok: true };
  }

  removeAt(index: number): void {
    const cur = [...this.subject.value];
    if (index < 0 || index >= cur.length) return;
    cur.splice(index, 1);
    this.setIds(cur);
  }

  /** Restore automatic carousel (newest products + brand slides). */
  clear(): void {
    this.setIds([]);
  }

  moveUp(index: number): void {
    if (index <= 0) return;
    const cur = [...this.subject.value];
    [cur[index - 1], cur[index]] = [cur[index], cur[index - 1]];
    this.setIds(cur);
  }

  moveDown(index: number): void {
    const cur = [...this.subject.value];
    if (index < 0 || index >= cur.length - 1) return;
    [cur[index], cur[index + 1]] = [cur[index + 1], cur[index]];
    this.setIds(cur);
  }

  private read(): string[] {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((x): x is string => typeof x === 'string' && !!x.trim());
    } catch {
      return [];
    }
  }
}
