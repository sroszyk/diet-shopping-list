import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { IngredientItem } from '../../models/diet.types';
import { ShoppingListService } from '../../services/shopping-list.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-ingredient-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ingredient-card" [class.excluded]="item().excluded">
      <div class="ingredient-row">
        <div class="ingredient-icon icon-{{ effectiveType() }}" aria-hidden="true">
          {{ meta().icon }}
        </div>
        <div class="ingredient-info">
          <div class="ingredient-name">{{ item().name }}</div>
          <div class="ingredient-meta">{{ weightDisplay() }}</div>
        </div>
        <div class="ingredient-actions">
          <label
            class="toggle-wrap"
            [title]="item().excluded ? 'Mark as needed' : 'Mark as in stock'">
            <input
              type="checkbox"
              [checked]="!item().excluded"
              (change)="toggleExclude()"
              [attr.aria-label]="item().excluded ? 'Mark ' + item().name + ' as needed' : 'Mark ' + item().name + ' as in stock'" />
            <span class="toggle-slider"></span>
          </label>
          <button
            class="expand-btn"
            [class.open]="expanded()"
            [attr.aria-expanded]="expanded()"
            [attr.aria-label]="'Toggle details for ' + item().name"
            (click)="expanded.update(v => !v)">▼</button>
        </div>
      </div>

      @if (expanded()) {
        <div class="ingredient-expanded open">
          @if (!item().custom) {
            <div class="adjust-row">
              <span class="adjust-label">Adjust total grams:</span>
              <div class="adjust-controls">
                <button
                  class="adjust-btn"
                  [attr.aria-label]="'Decrease weight of ' + item().name"
                  (click)="listService.adjustWeight(item().id, -10)">−</button>
                <span class="adjust-value">{{ item().adjustedWeight }}</span>
                <button
                  class="adjust-btn"
                  [attr.aria-label]="'Increase weight of ' + item().name"
                  (click)="listService.adjustWeight(item().id, 10)">+</button>
              </div>
            </div>

            <div class="usage-label">Used in plan:</div>
            <div class="usage-list">
              @for (u of item().usages; track $index) {
                <div class="usage-item">
                  <span class="usage-item-name">Day {{ u.day }}: {{ u.dish }} ({{ u.owner }})</span>
                  <span class="usage-item-amount">{{ u.weight }}g</span>
                </div>
              }
            </div>
          }

          <div class="card-actions">
            @if (!item().custom) {
              <button class="replace-btn" (click)="startReplace()">↔ REPLACE ITEM</button>
            }
            <button
              class="delete-btn"
              [attr.aria-label]="'Remove ' + item().name + ' from list'"
              title="Remove from list"
              (click)="deleteItem()">🗑️</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class IngredientCardComponent {
  item = input.required<IngredientItem>();

  listService = inject(ShoppingListService);
  private toastService = inject(ToastService);

  expanded = signal(false);

  readonly effectiveType = computed(() =>
    this.listService.getEffectiveType(this.item().name, this.item().type)
  );

  readonly meta = computed(() =>
    this.listService.getCategoryMeta(this.effectiveType())
  );

  weightDisplay(): string {
    const i = this.item();
    if (i.custom) {
      return i.freeQuantity ? i.freeQuantity : 'Custom item';
    }
    const miara = i.miara ? ` (${i.miara})` : '';
    return i.adjustedWeight !== i.totalWeight
      ? `${i.adjustedWeight}G (orig. ${i.totalWeight}G)${miara}`
      : `${i.adjustedWeight}G NEEDED${miara}`;
  }

  toggleExclude(): void {
    this.listService.toggleExclude(this.item().id);
  }

  startReplace(): void {
    this.listService.replacingId.set(this.item().id);
  }

  deleteItem(): void {
    this.listService.deleteItem(this.item().id);
    this.toastService.show('Item removed from list');
  }
}
