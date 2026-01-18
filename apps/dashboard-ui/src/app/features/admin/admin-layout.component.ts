import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { SidebarComponent, NavItem } from '../../shared/components/sidebar.component';
import { HeaderComponent } from '../../shared/components/header.component';
import { fetchUrl } from '../../global-vars';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="admin-layout">
      <app-sidebar
        [sectionLabel]="'ADMIN'"
        [navItems]="navItems"
        [showBackLink]="true"
        [backLinkText]="'Back to Tenant'"
        [backLinkRoute]="'/dashboard'"
      ></app-sidebar>
      
      <div class="main-area">
        <app-header
          [organizationName]="'Super Admin'"
          [userName]="userName"
          [role]="'org_admin'"
          [isSuperAdmin]="true"
          (logout)="handleLogout()"
        ></app-header>
        
        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      min-height: 100vh;
      background: #f9fafb;
    }

    .main-area {
      flex: 1;
      margin-left: 240px;
    }

    .content {
      margin-top: 64px;
      padding: 24px;
      min-height: calc(100vh - 64px);
    }
  `]
})
export class AdminLayoutComponent implements OnInit {
  private readonly TOKEN_KEY = 'FB_jwt_token';
  private readonly USER_ID_KEY = 'FB_user_id';

  userName = '';

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: '&#9638;&#9638;', route: '/admin' },
    { label: 'Organizations', icon: '&#127970;', route: '/admin/organizations' },
    { label: 'Users', icon: '&#128101;', route: '/admin/users' },
    { label: 'Submissions', icon: '&#128203;', route: '/admin/submissions' }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadUserData();
  }

  async loadUserData() {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userId = localStorage.getItem(this.USER_ID_KEY);

    if (!token || !userId) {
      this.handleLogout();
      return;
    }

    try {
      const response = await fetch(`${fetchUrl}/api/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        // Clear auth and redirect to login for any auth/user-related errors
        // This handles 401, 403, 404 (user not found after DB reset), etc.
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          this.handleLogout();
        } else {
          // For other errors, still clear auth to prevent blank screens
          console.error('Failed to load user data:', response.status, response.statusText);
          this.handleLogout();
        }
        return;
      }
      
      const user = await response.json();
      this.userName = user.name || user.email;
    } catch (error) {
      console.error('Failed to load user data:', error);
      // On network/parsing errors, clear auth and redirect to login
      this.handleLogout();
    }
  }

  handleLogout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    this.router.navigate(['/login']);
  }
}
