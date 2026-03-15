import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="toast"
      [class.show]="toastService.visible()"
      aria-live="polite"
      aria-atomic="true">
      {{ toastService.message() }}
    </div>
  `,
})
export class ToastComponent {
  toastService = inject(ToastService);
}
