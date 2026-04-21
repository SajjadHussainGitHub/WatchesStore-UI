import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type UiLanguageCode = 'en' | 'ar' | 'fr' | 'de';

@Injectable({ providedIn: 'root' })
export class UiLanguageService {
  private readonly storageKey = 'eshop.ui.language';
  readonly supported: UiLanguageCode[] = ['en', 'ar', 'fr', 'de'];

  constructor(private translate: TranslateService) {
    this.translate.addLangs(this.supported);
    this.translate.setDefaultLang('en');
  }

  init(): UiLanguageCode {
    const saved = (localStorage.getItem(this.storageKey) || '').toLowerCase();
    const initial = this.isSupported(saved) ? (saved as UiLanguageCode) : 'en';
    this.translate.use(initial);
    this.updateDocumentDirection(initial);
    return initial;
  }

  setLanguage(code: UiLanguageCode): void {
    this.translate.use(code);
    localStorage.setItem(this.storageKey, code);
    this.updateDocumentDirection(code);
  }

  private isSupported(code: string): boolean {
    return this.supported.includes(code as UiLanguageCode);
  }

  private updateDocumentDirection(code: UiLanguageCode): void {
    const rtl = code === 'ar';
    document.documentElement.lang = code;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  }
}
