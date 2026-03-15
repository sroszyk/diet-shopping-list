import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ShoppingListService } from '../../services/shopping-list.service';
import { ToastService } from '../../services/toast.service';
import { IngredientCardComponent } from '../ingredient-card/ingredient-card';
import { CATEGORY_META } from '../../models/diet.types';

@Component({
  selector: 'app-shopping-list',
  imports: [IngredientCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen active">
      <header class="app-header app-header--secondary">
        <div class="header-top">
          <button
            class="btn-icon-only"
            aria-label="Back to day selection"
            (click)="listService.goToDays()">&#8592;</button>
          <div class="header-center">
            <h2 class="screen-title">Shopping List</h2>
            <span class="screen-subtitle">EDIT MODE</span>
          </div>
          <button
            class="btn-text-action btn-text-action--danger"
            (click)="resetList()">Reset</button>
        </div>
      </header>

      <div class="stats-bar" aria-label="Shopping list statistics">
        <div class="stat-chip">
          <div class="stat-chip-label"><span aria-hidden="true">⚖️</span> Weight</div>
          <div class="stat-chip-value">{{ totalWeight() }}g</div>
        </div>
        <div class="stat-chip">
          <div class="stat-chip-label"><span aria-hidden="true">🛒</span> Items</div>
          <div class="stat-chip-value">{{ activeCount() }} total</div>
        </div>
        <div class="stat-chip">
          <div class="stat-chip-label"><span aria-hidden="true">✅</span> In Stock</div>
          <div class="stat-chip-value">{{ inStockCount() }} marked</div>
        </div>
      </div>

      <main class="screen-content screen-content--list">
        @for (group of groupedIngredients(); track group[0]) {
          <section class="category-section">
            <div class="category-header">
              <div class="category-title cat-{{ group[0] }}">
                <span class="category-dot dot-{{ group[0] }}" aria-hidden="true"></span>
                {{ categoryLabel(group[0]) }}
              </div>
              <span class="category-count">{{ group[1].length }} ITEMS</span>
            </div>
            @for (ing of group[1]; track ing.id) {
              <app-ingredient-card [item]="ing" />
            }
          </section>
        }
      </main>

      <div class="sticky-bottom">
        <button class="btn-primary btn-full" (click)="listService.finalize()">
          <span class="btn-icon" aria-hidden="true">🛍️</span>
          Finalize List
        </button>
      </div>
    </div>
  `,
})
export class ShoppingListComponent {
  listService = inject(ShoppingListService);
  private toastService = inject(ToastService);

  readonly totalWeight = computed(() =>
    this.listService.activeIngredients().reduce((s, i) => s + i.adjustedWeight, 0)
  );

  readonly activeCount = computed(() => this.listService.activeIngredients().length);

  readonly inStockCount = computed(() =>
    this.listService.ingredients().filter(i => i.excluded).length
  );

  readonly groupedIngredients = computed(() =>
    this.listService.groupedIngredients(this.listService.ingredients())
  );

  categoryLabel(type: string): string {
    const meta = CATEGORY_META[type as keyof typeof CATEGORY_META];
    return (meta?.label ?? type).toUpperCase();
  }

  resetList(): void {
    const ingredients = this.listService.ingredients();
    if (!ingredients.length) return;
    if (confirm('Reset all edits?')) {
      this.listService.resetList();
      this.toastService.show('List reset to original');
    }
  }
}
