import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Product } from '../interfaces/product';

@Pipe({
  name: 'productText',
  pure: false,
})
export class ProductTextPipe implements PipeTransform {
  constructor(private translate: TranslateService) {}

  transform(
    product: Product | null | undefined,
    field: 'title' | 'description' = 'title',
  ): string {
    if (!product) {
      return '';
    }
    const fallback =
      field === 'title' ? product.title || '' : product.longDescription || '';
    const suffix = field === 'title' ? 'TITLE' : 'DESCRIPTION';
    const key = `PRODUCTS.${product.$key}.${suffix}`;
    const translated = this.translate.instant(key);
    return translated && translated !== key ? translated : fallback;
  }
}
