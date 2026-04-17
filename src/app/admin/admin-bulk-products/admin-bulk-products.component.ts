import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
import { CategoryService } from '../../services/category/category.service';
import { ProductService } from '../../services/product/product.service';

interface BulkRowPreview {
  rowNumber: number;
  title: string;
  price: string;
  categoryInput: string;
  categoryResolved: string;
  modelNumber: string;
  imageUrl: string;
  discountPrice?: string;
  discountPercent?: number;
  rating?: number;
  ratingCount?: number;
  longDescription?: string;
  errors: string[];
}

@Component({
  selector: 'app-admin-bulk-products',
  templateUrl: './admin-bulk-products.component.html',
  styleUrls: ['./admin-bulk-products.component.css'],
})
export class AdminBulkProductsComponent {
  rows: BulkRowPreview[] = [];
  importing = false;
  resultMessage = '';
  errorMessage = '';
  fileName = '';

  constructor(
    private categoryService: CategoryService,
    private productService: ProductService,
  ) {}

  downloadDemoTemplate(): void {
    const sampleCategory = this.categoryService.categoriesSnapshot[0];
    const sampleCategoryName = sampleCategory?.name || 'Rolex';
    const sheetRows = [
      {
        title: 'Rolex Submariner Demo',
        price: 1299.99,
        category: sampleCategoryName,
        modelNumber: 'RX-DEMO-001',
        imageUrl: 'assets/products/1.jpg',
        discountPrice: 1199.99,
        discountPercent: 8,
        rating: 4.7,
        ratingCount: 182,
        longDescription:
          'Demo import row. Replace values and keep header names unchanged.',
      },
      {
        title: 'Omega Speedmaster Demo',
        price: 999.5,
        category: sampleCategoryName,
        modelNumber: 'OM-DEMO-010',
        imageUrl: 'assets/products/2.jpg',
        discountPrice: '',
        discountPercent: '',
        rating: '',
        ratingCount: '',
        longDescription: '',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'bulk-products-template.xlsx');
  }

  onFileSelected(event: Event): void {
    this.errorMessage = '';
    this.resultMessage = '';
    this.rows = [];
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    const file = input.files[0];
    this.fileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const first = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(first, {
          defval: '',
        });
        this.rows = this.buildPreview(rawRows);
        if (!this.rows.length) {
          this.errorMessage = 'Sheet is empty. Add product rows and upload again.';
        }
      } catch {
        this.errorMessage = 'Invalid Excel file. Please upload a valid .xlsx sheet.';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async importRows(): Promise<void> {
    this.errorMessage = '';
    this.resultMessage = '';
    if (!this.rows.length) {
      this.errorMessage = 'Upload and preview a sheet first.';
      return;
    }
    const invalid = this.rows.filter((r) => r.errors.length);
    if (invalid.length) {
      this.errorMessage = `Fix ${invalid.length} row(s) with errors before importing.`;
      return;
    }
    this.importing = true;
    try {
      let success = 0;
      for (const row of this.rows) {
        await this.productService.create({
          title: row.title,
          price: row.price,
          category: row.categoryResolved,
          modelNumber: row.modelNumber || undefined,
          imageUrl: row.imageUrl || undefined,
          discountPrice: row.discountPrice || undefined,
          discountPercent: row.discountPercent || undefined,
          rating: row.rating || undefined,
          ratingCount: row.ratingCount || undefined,
          longDescription: row.longDescription || undefined,
        });
        success++;
      }
      this.resultMessage = `Imported ${success} products successfully.`;
    } catch {
      this.errorMessage = 'Import failed midway. Please review your data and retry.';
    } finally {
      this.importing = false;
    }
  }

  get validCount(): number {
    return this.rows.filter((r) => !r.errors.length).length;
  }

  private buildPreview(rawRows: Record<string, unknown>[]): BulkRowPreview[] {
    const categories = this.categoryService.categoriesSnapshot;
    const categoryByKey = new Map(categories.map((c) => [c.$key.toLowerCase(), c.$key]));
    const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.$key]));

    return rawRows.map((row, i) => {
      const title = this.toText(row['title']);
      const price = this.toText(row['price']);
      const categoryInput = this.toText(row['category']);
      const modelNumber = this.toText(row['modelNumber']);
      const imageUrl = this.toText(row['imageUrl']);
      const discountPrice = this.toText(row['discountPrice']);
      const discountPercent = this.toNumber(row['discountPercent']);
      const rating = this.toNumber(row['rating']);
      const ratingCount = this.toNumber(row['ratingCount']);
      const longDescription = this.toText(row['longDescription']);
      const errors: string[] = [];

      if (!title) errors.push('Missing title');
      const pNum = Number(price);
      if (!price || !Number.isFinite(pNum) || pNum < 0) errors.push('Invalid price');

      const catKey =
        categoryByKey.get(categoryInput.toLowerCase()) ||
        categoryByName.get(categoryInput.toLowerCase()) ||
        '';
      if (!catKey) errors.push('Unknown category');

      if (discountPrice) {
        const dNum = Number(discountPrice);
        if (!Number.isFinite(dNum) || dNum < 0 || dNum >= pNum) {
          errors.push('Invalid discountPrice');
        }
      }
      if (discountPercent != null && (discountPercent < 0 || discountPercent > 95)) {
        errors.push('Invalid discountPercent');
      }
      if (rating != null && (rating < 0 || rating > 5)) {
        errors.push('Invalid rating');
      }
      if (ratingCount != null && ratingCount < 0) {
        errors.push('Invalid ratingCount');
      }

      return {
        rowNumber: i + 2,
        title,
        price,
        categoryInput,
        categoryResolved: catKey,
        modelNumber,
        imageUrl,
        discountPrice: discountPrice || undefined,
        discountPercent: discountPercent ?? undefined,
        rating: rating ?? undefined,
        ratingCount: ratingCount ?? undefined,
        longDescription: longDescription || undefined,
        errors,
      };
    });
  }

  private toText(v: unknown): string {
    return (v ?? '').toString().trim();
  }

  private toNumber(v: unknown): number | null {
    const t = this.toText(v);
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  }
}

