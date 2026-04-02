import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { ShoppingListService } from '../../services/shopping-list.service';
import { ToastService } from '../../services/toast.service';
import { IngredientCardComponent } from '../ingredient-card/ingredient-card';
import { CATEGORY_META, IngredientType } from '../../models/diet.types';
import { HamburgerMenuComponent } from '../hamburger-menu/hamburger-menu';

@Component({
  selector: 'app-shopping-list',
  imports: [IngredientCardComponent, HamburgerMenuComponent],
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
          <div class="header-actions">
            <button
              class="btn-text-action btn-text-action--danger"
              (click)="resetList()">Reset</button>
            <app-hamburger-menu (adminSelected)="adminSelected.emit()" />
          </div>
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

        <section class="custom-item-section">
          @if (!showCustomForm()) {
            <button
              class="custom-item-toggle"
              aria-expanded="false"
              (click)="showCustomForm.set(true)">
              <span aria-hidden="true">➕</span> Add Custom Item
            </button>
          } @else {
            <div class="custom-item-form" role="form" aria-label="Add custom item">
              <div class="custom-item-form-title">Add Custom Item</div>
              <div class="custom-item-field">
                <label for="custom-category" class="custom-item-label">Category</label>
                <select
                  id="custom-category"
                  class="custom-item-select"
                  [value]="customType()"
                  (change)="customType.set($any($event.target).value)">
                  @for (entry of categoryEntries; track entry.type) {
                    <option [value]="entry.type">{{ entry.icon }} {{ entry.label }}</option>
                  }
                </select>
              </div>
              <div class="custom-item-field">
                <label for="custom-name" class="custom-item-label">Item name</label>
                <input
                  id="custom-name"
                  type="text"
                  class="custom-item-input"
                  placeholder="e.g. Almond milk"
                  [value]="customName()"
                  (input)="customName.set($any($event.target).value)"
                  (keydown.enter)="addCustomItem()"
                  aria-required="true" />
              </div>
              <div class="custom-item-field">
                <label for="custom-qty" class="custom-item-label">Quantity <span class="custom-item-optional">(optional)</span></label>
                <input
                  id="custom-qty"
                  type="text"
                  class="custom-item-input"
                  placeholder="e.g. a handful, 2 packs"
                  [value]="customQty()"
                  (input)="customQty.set($any($event.target).value)"
                  (keydown.enter)="addCustomItem()" />
              </div>
              <div class="custom-item-actions">
                <button class="btn-secondary" (click)="cancelCustomItem()">Cancel</button>
                <button
                  class="btn-primary"
                  [disabled]="!customName().trim()"
                  (click)="addCustomItem()">Add Item</button>
              </div>
            </div>
          }
        </section>
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
  readonly adminSelected = output<void>();
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

  readonly showCustomForm = signal(false);
  readonly customName = signal('');
  readonly customQty = signal('');
  readonly customType = signal<IngredientType>('vegetable');

  readonly categoryEntries = (Object.entries(CATEGORY_META) as [IngredientType, { label: string; icon: string; order: number }][])
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([type, meta]) => ({ type, label: meta.label, icon: meta.icon }));

  categoryLabel(type: string): string {
    const meta = CATEGORY_META[type as keyof typeof CATEGORY_META];
    return (meta?.label ?? type).toUpperCase();
  }

  addCustomItem(): void {
    const name = this.customName().trim();
    if (!name) return;
    this.listService.addCustomItem(name, this.customType(), this.customQty());
    this.toastService.show(`"${name}" added to list`);
    this.cancelCustomItem();
  }

  cancelCustomItem(): void {
    this.showCustomForm.set(false);
    this.customName.set('');
    this.customQty.set('');
    this.customType.set('vegetable');
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
