import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { ShoppingListService } from '../../services/shopping-list.service';
import { HamburgerMenuComponent } from '../hamburger-menu/hamburger-menu';

@Component({
  selector: 'app-day-selection',
  imports: [HamburgerMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen active">
      <header class="app-header">
        <div class="header-top">
          <h1 class="app-title">Diet Shopping List</h1>
          <div class="header-actions">
            <button class="btn-text-action" (click)="listService.toggleSelectAll()">
              {{ listService.allSelected() ? 'Deselect All' : 'Select All' }}
            </button>
            <app-hamburger-menu (adminSelected)="adminSelected.emit()" />
          </div>
        </div>
        <p class="app-subtitle">Select the days you want to include in your plan.</p>
      </header>

      <main class="screen-content">
        @if (!listService.dietData()) {
          <div class="loading-placeholder">
            <div class="loading-spinner" aria-hidden="true"></div>
            <span>Loading diet data…</span>
          </div>
        } @else {
          <div class="days-grid" role="group" aria-label="Day selection">
            @for (num of listService.dayNumbers(); track num) {
              <div
                class="day-card"
                [class.selected]="listService.selectedDays().has(num)"
                role="checkbox"
                [attr.aria-checked]="listService.selectedDays().has(num)"
                tabindex="0"
                (click)="listService.toggleDay(num)"
                (keydown.enter)="listService.toggleDay(num)"
                (keydown.space)="$event.preventDefault(); listService.toggleDay(num)">
                <div class="day-card-top">
                  <span class="day-label">Day</span>
                  <span class="day-check" aria-hidden="true">✓</span>
                </div>
                <div class="day-number">{{ padDay(num) }}</div>
                <div class="day-multipliers"
                  (click)="$event.stopPropagation()"
                  (keydown.enter)="$event.stopPropagation()"
                  (keydown.space)="$event.stopPropagation()">
                  @for (owner of listService.ownersForDay(num); track owner) {
                    <div class="day-multiplier-row">
                      <span class="day-multiplier-owner">{{ owner }}</span>
                      <div class="day-multiplier-controls">
                        <button
                          class="day-mult-btn"
                          (click)="listService.setMultiplier(num, owner, -1)"
                          [attr.aria-label]="'Decrease multiplier for ' + owner + ' on day ' + num">−</button>
                        <span class="day-mult-value">×{{ listService.getMultiplier(num, owner) }}</span>
                        <button
                          class="day-mult-btn"
                          (click)="listService.setMultiplier(num, owner, 1)"
                          [attr.aria-label]="'Increase multiplier for ' + owner + ' on day ' + num">+</button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </main>

      <div class="sticky-bottom">
        <button
          class="btn-primary btn-full"
          [disabled]="!listService.canGenerate()"
          (click)="listService.generateList()">
          <span class="btn-icon" aria-hidden="true">🛒</span>
          Generate Shopping List
        </button>
      </div>
    </div>
  `,
})
export class DaySelectionComponent {
  readonly adminSelected = output<void>();
  listService = inject(ShoppingListService);

  padDay(num: number): string {
    return String(num).padStart(2, '0');
  }
}
