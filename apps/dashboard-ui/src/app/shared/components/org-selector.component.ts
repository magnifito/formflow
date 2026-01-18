import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AdminService, Organization } from '../../services/admin.service';
import { OrgContextService } from '../../services/org-context.service';

@Component({
  selector: 'app-org-selector',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="org-selector">
      <label class="selector-label">Working in:</label>
      <div class="org-display">
        <span class="org-name" [class.no-org]="selectedOrgId === null">
          {{ selectedOrgId === null ? 'No organization selected' : getSelectedOrgName() }}
        </span>
        <a routerLink="/admin/organizations" class="switch-link">Switch</a>
      </div>
    </div>
  `,
  styles: [`
    .org-selector {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .selector-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #6b7280;
      white-space: nowrap;
    }

    .org-display {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .org-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: #1f2937;
      padding: 6px 12px;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      min-width: 200px;
    }

    .org-name.no-org {
      border-color: #fbbf24;
      background: #fffbeb;
      color: #d97706;
    }

    .switch-link {
      font-size: 0.875rem;
      color: #1f2937;
      text-decoration: none;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .switch-link:hover {
      background: #e5e7eb;
    }
  `]
})
export class OrgSelectorComponent implements OnInit, OnDestroy {
  organizations: Organization[] = [];
  selectedOrgId: number | null = null;
  private subscription?: Subscription;
  private routerSubscription?: Subscription;

  constructor(
    private adminService: AdminService,
    private orgContextService: OrgContextService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    // Load available organizations first
    await this.loadOrganizations();

    // Subscribe to organization context changes
    this.subscription = this.orgContextService.selectedOrgId$.subscribe(
      async (orgId) => {
        const previousOrgId = this.selectedOrgId;
        this.selectedOrgId = orgId;
        
        // Reload organizations if:
        // 1. OrgId changed to a new non-null value, OR
        // 2. OrgId is set but we don't have it in our list
        if (orgId !== null && (previousOrgId !== orgId || !this.organizations.find(o => o.id === orgId))) {
          await this.loadOrganizations();
          this.cdr.detectChanges();
        }
      }
    );

    // Reload organizations when navigating to admin/organizations page
    // This catches cases where a new org was just created
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(async (event: NavigationEnd) => {
        if (event.url.includes('/admin/organizations')) {
          await this.loadOrganizations();
          this.cdr.detectChanges();
        }
      });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
  }

  async loadOrganizations() {
    try {
      this.organizations = await this.adminService.getAllOrganizations();
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  }

  getSelectedOrgName(): string {
    if (this.selectedOrgId === null) {
      return '';
    }
    const org = this.organizations.find(o => o.id === this.selectedOrgId);
    return org ? org.name : '';
  }
}
