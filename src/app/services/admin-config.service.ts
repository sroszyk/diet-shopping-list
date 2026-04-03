import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AdminConfig, IngredientTypeConfig, CATEGORY_META, IngredientType } from '../models/diet.types';

const STORAGE_KEY = 'admin_config';

@Injectable({ providedIn: 'root' })
export class AdminConfigService {
  private http = inject(HttpClient);

  readonly config = signal<AdminConfig>({ ingredientTypes: [] });
  readonly loaded = signal(false);

  loadConfig(): void {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        this.config.set(JSON.parse(cached) as AdminConfig);
        this.loaded.set(true);
        return;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    this.http.get<AdminConfig>('./admin_config.json').subscribe({
      next: data => {
        this.config.set(data);
        this.loaded.set(true);
      },
      error: err => console.error('Failed to load admin config:', err),
    });
  }

  addIngredientType(type: IngredientTypeConfig): void {
    this.config.update(cfg => ({
      ...cfg,
      ingredientTypes: [...cfg.ingredientTypes, type],
    }));
  }

  updateIngredientCategory(ingredientName: string, category: string): void {
    this.config.update(cfg => ({
      ...cfg,
      ingredientCategories: {
        ...(cfg.ingredientCategories ?? {}),
        [ingredientName]: category,
      },
    }));
  }

  getIngredientCategory(ingredientName: string, defaultCategory: string): string {
    return this.config().ingredientCategories?.[ingredientName] ?? defaultCategory;
  }

  getCategoryMeta(typeName: string): { label: string; icon: string; order: number } {
    const builtin = CATEGORY_META[typeName as IngredientType];
    const lowerName = typeName.toLowerCase();
    const types = this.config().ingredientTypes;
    const idx = types.findIndex(
      t => t.name === typeName || t.name.toLowerCase() === lowerName,
    );
    if (idx >= 0) {
      return {
        label: builtin ? builtin.label : types[idx].name,
        icon: types[idx].icon,
        order: builtin ? builtin.order : 10 + idx,
      };
    }
    if (builtin) return builtin;
    return { label: typeName, icon: '📦', order: 99 };
  }

  saveConfig(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config()));
  }

  downloadConfig(): void {
    const json = JSON.stringify(this.config(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'admin_config.json';
    a.click();
    URL.revokeObjectURL(url);
  }
}
