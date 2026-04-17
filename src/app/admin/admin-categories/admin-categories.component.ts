import { Component } from '@angular/core';
import { Category, CategoryService } from '../../services/category/category.service';

@Component({
  selector: 'app-admin-categories',
  templateUrl: './admin-categories.component.html',
  styleUrls: ['./admin-categories.component.css'],
})
export class AdminCategoriesComponent {
  newName = '';
  addError: string | null = null;
  categories$ = this.categoryService.getCategories();

  constructor(private categoryService: CategoryService) {}

  add(): void {
    this.addError = null;
    const result = this.categoryService.addCategory(this.newName);
    if (result.ok) {
      this.newName = '';
    } else {
      this.addError = result.error ?? 'Could not add category.';
    }
  }

  remove(c: Category): void {
    if (!confirm(`Remove category “${c.name}”? Products that still use this key will not update automatically.`)) {
      return;
    }
    this.categoryService.deleteCategory(c.$key);
  }
}
