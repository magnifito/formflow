import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrgSelectorComponent } from './org-selector.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, OrgSelectorComponent],
  template: `
    <header class="header">
      <div class="header-left">
        <h1 class="org-name">{{ organizationName }}</h1>
        <app-org-selector *ngIf="isSuperAdmin"></app-org-selector>
      </div>

      <div class="header-right">
        <button class="notification-btn" title="Notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>

        <div class="user-menu" (click)="toggleDropdown()">
          <div class="user-avatar">
            <img *ngIf="avatarUrl" [src]="avatarUrl" alt="User">
            <span *ngIf="!avatarUrl" class="avatar-placeholder">{{ getInitials() }}</span>
          </div>
          <span class="user-role" [class.admin]="role === 'org_admin' || isSuperAdmin">
            {{ isSuperAdmin ? 'Super Admin' : (role === 'org_admin' ? 'Org Admin' : 'Member') }}
          </span>
          <svg class="dropdown-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>

          <div class="dropdown-menu" *ngIf="dropdownOpen">
            <a routerLink="/settings" class="dropdown-item">Settings</a>
            <a *ngIf="isSuperAdmin" routerLink="/admin" class="dropdown-item">Admin Panel</a>
            <button class="dropdown-item" (click)="onLogout()">Logout</button>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      height: 64px;
      background: #fff;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      position: fixed;
      top: 0;
      left: 240px;
      right: 0;
      z-index: 90;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .org-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .notification-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6b7280;
      transition: all 0.15s;
    }

    .notification-btn:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      position: relative;
      transition: background 0.15s;
    }

    .user-menu:hover {
      background: #f3f4f6;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      overflow: hidden;
      background: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder {
      font-size: 0.875rem;
      font-weight: 600;
      color: #6b7280;
    }

    .user-role {
      font-size: 0.8rem;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 4px;
      background: #f3f4f6;
      color: #6b7280;
    }

    .user-role.admin {
      background: #dcfce7;
      color: #16a34a;
    }

    .dropdown-arrow {
      color: #9ca3af;
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      min-width: 160px;
      overflow: hidden;
      z-index: 100;
    }

    .dropdown-item {
      display: block;
      width: 100%;
      padding: 10px 16px;
      text-align: left;
      border: none;
      background: none;
      color: #374151;
      font-size: 0.9rem;
      cursor: pointer;
      text-decoration: none;
    }

    .dropdown-item:hover {
      background: #f3f4f6;
    }
  `]
})
export class HeaderComponent {
  @Input() organizationName = '';
  @Input() userName = '';
  @Input() avatarUrl = '';
  @Input() role: 'member' | 'org_admin' = 'member';
  @Input() isSuperAdmin = false;
  @Output() logout = new EventEmitter<void>();

  dropdownOpen = false;

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  getInitials(): string {
    if (!this.userName) return '?';
    return this.userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  onLogout() {
    this.logout.emit();
  }
}
