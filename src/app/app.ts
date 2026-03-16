import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { DietDataService } from './services/diet-data.service';
import { ShoppingListService } from './services/shopping-list.service';
import { DaySelectionComponent } from './components/day-selection/day-selection';
import { ShoppingListComponent } from './components/shopping-list/shopping-list';
import { SummaryComponent } from './components/summary/summary';
import { ToastComponent } from './components/toast/toast';
import { ReplaceModalComponent } from './components/replace-modal/replace-modal';

@Component({
  selector: 'app-root',
  imports: [
    DaySelectionComponent,
    ShoppingListComponent,
    SummaryComponent,
    ToastComponent,
    ReplaceModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (listService.screen() === 'days') {
      <app-day-selection />
    }
    @if (listService.screen() === 'list') {
      <app-shopping-list />
    }
    @if (listService.screen() === 'summary') {
      <app-summary />
    }
    <app-toast />
    <app-replace-modal />
  `,
})
export class App implements OnInit {
  private dietDataService = inject(DietDataService);
  listService = inject(ShoppingListService);

  ngOnInit(): void {
    this.dietDataService.loadDietData().subscribe({
      next: data => this.listService.setDietData(data),
      error: err => console.error('Failed to load diet data:', err),
    });
  }
}
