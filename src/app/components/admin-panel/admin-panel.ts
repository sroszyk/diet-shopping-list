import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminConfigService } from '../../services/admin-config.service';
import { ShoppingListService } from '../../services/shopping-list.service';
import { ToastService } from '../../services/toast.service';

const COMMON_ICONS = [
  '🍎', '🥦', '🧀', '🥩', '🍞', '🥚', '🐟', '🍗',
  '🥕', '🧅', '🧄', '🍅', '🥑', '🍋', '🍇', '🍓',
  '🫐', '🍊', '🥝', '🌽', '🥜', '🫘', '🍄', '🧂',
  '🥛', '🫙', '🧈', '🍯', '🌾', '🫚',
];

@Component({
  selector: 'app-admin-panel',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-panel" role="region" aria-label="Admin panel">
      <header class="admin-panel-header">
        <h2 class="admin-panel-title">⚙️ Admin</h2>
        <p class="admin-panel-subtitle">Manage ingredient types and categories</p>
      </header>

      <section class="admin-section">
        <h3 class="admin-section-heading">Ingredient Types</h3>
        <ul class="admin-type-list" aria-label="Defined ingredient types">
          @for (type of adminService.config().ingredientTypes; track type.name) {
            <li class="admin-type-item">
              <span class="admin-type-icon" aria-hidden="true">{{ type.icon }}</span>
              <span class="admin-type-name">{{ type.name }}</span>
            </li>
          }
        </ul>
      </section>

      <section class="admin-section">
        <h3 class="admin-section-heading">Add Ingredient Type</h3>
        <div class="admin-add-form">
          <input
            class="admin-input"
            type="text"
            placeholder="Type name (e.g. spice)"
            [ngModel]="newName()"
            (ngModelChange)="newName.set($event)"
            aria-label="New ingredient type name"
            (keydown.enter)="addType()" />
          <p class="admin-icon-label">Select icon:</p>
          <div class="admin-icon-grid" role="group" aria-label="Select icon">
            @for (icon of icons; track icon) {
              <button
                class="admin-icon-btn"
                [class.selected]="selectedIcon() === icon"
                type="button"
                [attr.aria-label]="'Select icon ' + icon"
                [attr.aria-pressed]="selectedIcon() === icon"
                (click)="selectIcon(icon)">{{ icon }}</button>
            }
          </div>
          @if (selectedIcon()) {
            <div class="admin-selected-preview">
              Selected: <span aria-hidden="true">{{ selectedIcon() }}</span>
            </div>
          }
          <button
            class="btn-primary btn-full admin-add-btn"
            type="button"
            [disabled]="!canAdd()"
            (click)="addType()">
            + Add Type
          </button>
        </div>
      </section>

      <section class="admin-section">
        <h3 class="admin-section-heading">Ingredient Category Assignments</h3>
        @if (allIngredients().length === 0) {
          <p class="admin-no-ingredients">No ingredient data loaded yet.</p>
        } @else {
          <div class="admin-ingredient-search">
            <input
              class="admin-input"
              type="search"
              placeholder="Search ingredients…"
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              aria-label="Search ingredients" />
          </div>
          <ul class="admin-ingredient-list" aria-label="Ingredient category assignments">
            @for (ing of filteredIngredients(); track ing.name) {
              <li class="admin-ingredient-item">
                <span class="admin-ingredient-name">{{ ing.name }}</span>
                <select
                  class="admin-ingredient-select"
                  [value]="adminService.getIngredientCategory(ing.name, ing.defaultType)"
                  (change)="updateCategory(ing.name, $any($event.target).value)"
                  [attr.aria-label]="'Category for ' + ing.name">
                  @for (type of adminService.config().ingredientTypes; track type.name) {
                    <option [value]="type.name">{{ type.icon }} {{ type.name }}</option>
                  }
                </select>
              </li>
            }
          </ul>
          @if (filteredIngredients().length === 0) {
            <p class="admin-no-ingredients">No ingredients match your search.</p>
          }
        }
      </section>

      <div class="admin-actions">
        <button class="btn-secondary btn-flex" type="button" (click)="save()">
          <span aria-hidden="true">💾</span> Save
        </button>
        <button class="btn-secondary btn-flex" type="button" (click)="download()">
          <span aria-hidden="true">⬇️</span> Download configuration
        </button>
      </div>
    </div>
  `,
})
export class AdminPanelComponent {
  readonly adminService = inject(AdminConfigService);
  private shoppingListService = inject(ShoppingListService);
  private toastService = inject(ToastService);

  readonly icons = COMMON_ICONS;
  readonly newName = signal('');
  readonly selectedIcon = signal('');
  readonly searchQuery = signal('');

  readonly allIngredients = computed(() => {
    const data = this.shoppingListService.dietData();
    if (!data) return [];
    const map = new Map<string, string>();
    for (const day of data.days) {
      for (const meal of day.meals) {
        for (const dish of meal.dishes) {
          for (const ing of dish.ingredients) {
            if (!map.has(ing.name)) {
              map.set(ing.name, ing.type);
            }
          }
        }
      }
    }
    return [...map.entries()]
      .map(([name, defaultType]) => ({ name, defaultType }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly filteredIngredients = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const all = this.allIngredients();
    if (!q) return all;
    return all.filter(i => i.name.toLowerCase().includes(q));
  });

  canAdd(): boolean {
    return this.newName().trim().length > 0 && this.selectedIcon().length > 0;
  }

  selectIcon(icon: string): void {
    this.selectedIcon.set(this.selectedIcon() === icon ? '' : icon);
  }

  addType(): void {
    const name = this.newName().trim();
    const icon = this.selectedIcon();
    if (!name || !icon) return;
    const exists = this.adminService.config().ingredientTypes.some(
      t => t.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      this.toastService.show(`Type "${name}" already exists`);
      return;
    }
    this.adminService.addIngredientType({ name, icon });
    this.newName.set('');
    this.selectedIcon.set('');
    this.toastService.show(`Added type "${name}"`);
  }

  updateCategory(ingredientName: string, category: string): void {
    this.adminService.updateIngredientCategory(ingredientName, category);
  }

  save(): void {
    this.adminService.saveConfig();
    this.toastService.show('Configuration saved');
  }

  download(): void {
    this.adminService.downloadConfig();
  }
}
