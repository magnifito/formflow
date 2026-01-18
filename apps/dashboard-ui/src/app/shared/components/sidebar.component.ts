import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L28 9V23L16 30L4 23V9L16 2Z" fill="#22c55e" stroke="#16a34a" stroke-width="2"/>
            <path d="M16 8L22 11.5V18.5L16 22L10 18.5V11.5L16 8Z" fill="white"/>
          </svg>
        </div>
        <span class="logo-text">FormFlow</span>
      </div>

      <div class="sidebar-section">
        <span class="section-label">{{ sectionLabel }}</span>
        <nav class="nav-list">
          <a *ngFor="let item of navItems"
             [routerLink]="item.route"
             routerLinkActive="active"
             [routerLinkActiveOptions]="{exact: item.route === '/dashboard'}"
             class="nav-item">
            <span class="nav-icon" [innerHTML]="item.icon"></span>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        </nav>
      </div>

      <div class="sidebar-footer" *ngIf="showBackLink">
        <a [routerLink]="backLinkRoute" class="nav-item back-link">
          <span class="nav-icon">&#8592;</span>
          <span class="nav-label">{{ backLinkText }}</span>
        </a>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 240px;
      height: 100vh;
      background: #fff;
      border-right: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 100;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
    }

    .logo-text {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
    }

    .sidebar-section {
      flex: 1;
      padding: 16px 0;
    }

    .section-label {
      display: block;
      padding: 8px 24px;
      font-size: 0.7rem;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .nav-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 24px;
      color: #4b5563;
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 500;
      transition: all 0.15s ease;
      border-left: 3px solid transparent;
    }

    .nav-item:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    .nav-item.active {
      background: #f0fdf4;
      color: #16a34a;
      border-left-color: #22c55e;
    }

    .nav-icon {
      font-size: 1.1rem;
      width: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sidebar-footer {
      padding: 16px 0;
      border-top: 1px solid #e5e7eb;
    }

    .back-link {
      color: #6b7280;
    }

    .back-link:hover {
      color: #374151;
      background: #f3f4f6;
    }
  `]
})
export class SidebarComponent {
  @Input() sectionLabel = 'TENANT';
  @Input() navItems: NavItem[] = [];
  @Input() showBackLink = false;
  @Input() backLinkText = 'Back';
  @Input() backLinkRoute = '/dashboard';
}
