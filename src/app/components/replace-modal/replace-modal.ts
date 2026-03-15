import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ShoppingListService } from '../../services/shopping-list.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-replace-modal',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (listService.replacingId()) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-box">
          <h3 class="modal-title" id="modal-title">Replace Item</h3>
          <p class="modal-desc">{{ replaceDesc() }}</p>
          <input
            type="text"
            class="modal-input"
            placeholder="Replacement name…"
            [(ngModel)]="newName"
            (keydown.enter)="confirm()"
            (keydown.escape)="cancel()"
            #replaceInput
            aria-label="Replacement item name" />
          <div class="modal-actions">
            <button class="btn-secondary" (click)="cancel()">Cancel</button>
            <button class="btn-primary" (click)="confirm()">Replace</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ReplaceModalComponent {
  listService = inject(ShoppingListService);
  private toastService = inject(ToastService);

  newName = signal('');

  replaceDesc() {
    const id = this.listService.replacingId();
    if (!id) return '';
    const ing = this.listService.ingredients().find(i => i.id === id);
    return ing ? `Replace "${ing.name}" with:` : 'Enter the replacement item name:';
  }

  confirm(): void {
    const name = this.newName().trim();
    if (!name) return;
    const id = this.listService.replacingId();
    if (id) {
      this.listService.replaceItem(id, name);
      this.toastService.show(`Replaced with "${name}"`);
    }
    this.listService.replacingId.set(null);
    this.newName.set('');
  }

  cancel(): void {
    this.listService.replacingId.set(null);
    this.newName.set('');
  }
}
