import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DietDataService } from './services/diet-data.service';
import { ShoppingListService } from './services/shopping-list.service';
import { AdminConfigService } from './services/admin-config.service';
import { DaySelectionComponent } from './components/day-selection/day-selection';
import { ShoppingListComponent } from './components/shopping-list/shopping-list';
import { SummaryComponent } from './components/summary/summary';
import { ToastComponent } from './components/toast/toast';
import { ReplaceModalComponent } from './components/replace-modal/replace-modal';
import { AdminPanelComponent } from './components/admin-panel/admin-panel';

@Component({
  selector: 'app-root',
  imports: [
    DaySelectionComponent,
    ShoppingListComponent,
    SummaryComponent,
    ToastComponent,
    ReplaceModalComponent,
    AdminPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (adminOpen()) {
      <div class="admin-screen screen active">
        <header class="app-header">
          <div class="header-top">
            <button
              class="btn-icon-only"
              aria-label="Back"
              (click)="closeAdmin()">&#8592;</button>
            <div class="header-center">
              <h1 class="screen-title">Admin</h1>
            </div>
            <div class="header-spacer"></div>
          </div>
        </header>
        <main class="screen-content">
          <app-admin-panel />
        </main>
      </div>
    } @else {
      @if (listService.screen() === 'days') {
        <app-day-selection (adminSelected)="openAdmin()" />
      }
      @if (listService.screen() === 'list') {
        <app-shopping-list (adminSelected)="openAdmin()" />
      }
      @if (listService.screen() === 'summary') {
        <app-summary (adminSelected)="openAdmin()" />
      }
    }
    <app-toast />
    <app-replace-modal />
  `,
})
export class App implements OnInit {
  private dietDataService = inject(DietDataService);
  private adminConfigService = inject(AdminConfigService);
  listService = inject(ShoppingListService);

  readonly adminOpen = signal(false);

  ngOnInit(): void {
    this.dietDataService.loadDietData().subscribe({
      next: data => this.listService.setDietData(data),
      error: err => console.error('Failed to load diet data:', err),
    });
    this.adminConfigService.loadConfig();
  }

  openAdmin(): void {
    this.adminOpen.set(true);
  }

  closeAdmin(): void {
    this.adminOpen.set(false);
  }
}
