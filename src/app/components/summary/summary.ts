import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { ShoppingListService } from '../../services/shopping-list.service';
import { ToastService } from '../../services/toast.service';
import { CATEGORY_META } from '../../models/diet.types';
import { HamburgerMenuComponent } from '../hamburger-menu/hamburger-menu';

@Component({
  selector: 'app-summary',
  imports: [HamburgerMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen active">
      <header class="app-header app-header--secondary">
        <div class="header-top">
          <button
            class="btn-icon-only"
            aria-label="Back to shopping list"
            (click)="listService.goToList()">&#8592;</button>
          <div class="header-center">
            <h2 class="screen-title">Final List</h2>
            <span class="screen-subtitle">READY TO SHOP</span>
          </div>
          <app-hamburger-menu (adminSelected)="adminSelected.emit()" />
        </div>
      </header>

      <main class="screen-content screen-content--list">
        <div class="summary-total-card">
          <div class="summary-total-title">Your Shopping List</div>
          <div class="summary-total-value">{{ totalItems() }} items</div>
          <div class="summary-total-sub">
            ~{{ totalWeight() }}g total • Days: {{ selectedDaysStr() }}
          </div>
        </div>

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
              <div class="summary-item">
                <span class="summary-item-name">
                  {{ categoryIcon(ing.type) }} {{ ing.name }}
                </span>
                <span class="summary-item-amount">{{ ing.adjustedWeight }}g</span>
              </div>
            }
          </section>
        }
      </main>

      <div class="sticky-bottom sticky-bottom--row">
        <button class="btn-primary btn-flex" (click)="copyList()">
          <span class="btn-icon" aria-hidden="true">📋</span>
          Copy Full List
        </button>
        <button class="btn-secondary btn-flex" (click)="listService.startOver()">
          <span class="btn-icon" aria-hidden="true">🔄</span>
          Start Over
        </button>
      </div>
    </div>
  `,
})
export class SummaryComponent {
  readonly adminSelected = output<void>();
  listService = inject(ShoppingListService);
  private toastService = inject(ToastService);

  readonly totalItems = computed(() => this.listService.activeIngredients().length);

  readonly totalWeight = computed(() =>
    this.listService.activeIngredients().reduce((s, i) => s + i.adjustedWeight, 0)
  );

  readonly selectedDaysStr = computed(() =>
    this.listService.getSelectedDaysSorted().join(', ')
  );

  readonly groupedIngredients = computed(() =>
    this.listService.groupedIngredients(this.listService.activeIngredients())
  );

  categoryLabel(type: string): string {
    const meta = CATEGORY_META[type as keyof typeof CATEGORY_META];
    return (meta?.label ?? type).toUpperCase();
  }

  categoryIcon(type: string): string {
    const meta = CATEGORY_META[type as keyof typeof CATEGORY_META];
    return meta?.icon ?? '📦';
  }

  copyList(): void {
    const days = this.listService.getSelectedDaysSorted().join(', ');
    const groups = this.listService.groupedIngredients(this.listService.activeIngredients());
    const lines = [`Diet Shopping List — Days: ${days}`, ''];
    groups.forEach(([type, items]) => {
      const meta = CATEGORY_META[type as keyof typeof CATEGORY_META];
      lines.push(`--- ${(meta?.label ?? type).toUpperCase()} ---`);
      items.forEach(ing => lines.push(`• ${ing.name}: ${ing.adjustedWeight}g`));
      lines.push('');
    });
    const text = lines.join('\n');

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() =>
        this.toastService.show('List copied to clipboard ✓')
      );
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.toastService.show('List copied to clipboard ✓');
    }
  }
}
