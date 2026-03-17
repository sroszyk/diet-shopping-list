import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-hamburger-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hamburger-wrap">
      <button
        class="hamburger-btn"
        type="button"
        [attr.aria-expanded]="open()"
        aria-label="Open menu"
        aria-controls="hamburger-drawer"
        (click)="toggleMenu()">
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
      </button>

      @if (open()) {
        <div
          class="hamburger-overlay"
          role="presentation"
          (click)="closeMenu()">
        </div>
        <nav
          id="hamburger-drawer"
          class="hamburger-drawer"
          role="navigation"
          aria-label="Navigation menu">
          <div class="hamburger-drawer-header">
            <span class="hamburger-drawer-title">Menu</span>
            <button
              class="btn-icon-only hamburger-close"
              type="button"
              aria-label="Close menu"
              (click)="closeMenu()">✕</button>
          </div>
          <ul class="hamburger-menu-list" role="list">
            <li>
              <button
                class="hamburger-menu-item"
                type="button"
                (click)="selectAdmin()">
                <span aria-hidden="true">⚙️</span>
                Admin
              </button>
            </li>
          </ul>
        </nav>
      }
    </div>
  `,
})
export class HamburgerMenuComponent {
  readonly adminSelected = output<void>();

  readonly open = signal(false);

  toggleMenu(): void {
    this.open.update(v => !v);
  }

  closeMenu(): void {
    this.open.set(false);
  }

  selectAdmin(): void {
    this.closeMenu();
    this.adminSelected.emit();
  }
}
