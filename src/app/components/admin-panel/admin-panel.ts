import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminConfigService } from '../../services/admin-config.service';
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
        <p class="admin-panel-subtitle">Manage ingredient types</p>
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
  private toastService = inject(ToastService);

  readonly icons = COMMON_ICONS;
  readonly newName = signal('');
  readonly selectedIcon = signal('');

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

  save(): void {
    this.adminService.saveConfig();
    this.toastService.show('Configuration saved');
  }

  download(): void {
    this.adminService.downloadConfig();
  }
}
