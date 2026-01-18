import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchComponent } from '../../shared/components/toggle-switch.component';
import { AdminService, Organization, PaginatedResponse } from '../../services/admin.service';
import { OrgContextService } from '../../services/org-context.service';

@Component({
  selector: 'app-admin-organizations',
  standalone: true,
  imports: [CommonModule, FormsModule, ToggleSwitchComponent],
  template: `
    <div class="admin-organizations">
      <div class="page-header">
        <h1 class="page-title">Organizations</h1>
        <button class="btn-primary" (click)="openCreateModal()">+ New Organization</button>
      </div>

      <div class="loading" *ngIf="loading">Loading organizations...</div>

      <div class="table-container" *ngIf="!loading && organizations">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let org of organizations.data" [class.active-row]="selectedOrgId === org.id">
              <td class="cell-name">{{ org.name }}</td>
              <td class="cell-slug"><code>{{ org.slug }}</code></td>
              <td>
                <app-toggle-switch
                  [checked]="org.isActive"
                  [activeLabel]="'Active'"
                  [inactiveLabel]="'Inactive'"
                  (change)="toggleOrgStatus(org, $event)"
                ></app-toggle-switch>
              </td>
              <td>{{ org.createdAt | date:'shortDate' }}</td>
              <td class="cell-actions">
                <button
                  class="action-btn action-btn-switch"
                  [class.active]="selectedOrgId === org.id"
                  (click)="switchToOrg(org)"
                  [title]="selectedOrgId === org.id ? 'Currently working in this org' : 'Switch to this organization'"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="17 1 21 5 17 9"/>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                    <polyline points="7 23 3 19 7 15"/>
                    <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                  </svg>
                </button>
                <button class="action-btn" (click)="viewOrg(org)" title="View Details">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
                <button class="action-btn action-btn-primary" (click)="inviteOrgAdmin(org)" title="Invite Org Admin">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pagination" *ngIf="organizations.pagination.totalPages > 1">
          <button [disabled]="organizations.pagination.page === 1" (click)="loadPage(organizations.pagination.page - 1)">Previous</button>
          <span>Page {{ organizations.pagination.page }} of {{ organizations.pagination.totalPages }}</span>
          <button [disabled]="organizations.pagination.page === organizations.pagination.totalPages" (click)="loadPage(organizations.pagination.page + 1)">Next</button>
        </div>
      </div>

      <!-- Create Modal -->
      <div class="modal-overlay" *ngIf="showCreateModal" (click)="closeCreateModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>Create Organization</h2>
          <form (ngSubmit)="createOrganization()">
            <div class="form-group">
              <label>Name *</label>
              <input type="text" [(ngModel)]="newOrg.name" name="name" (input)="onNameChange()" required placeholder="Acme Corporation">
            </div>
            <div class="form-group">
              <label>Slug *</label>
              <input type="text" [(ngModel)]="newOrg.slug" name="slug" (input)="slugManuallyEdited = true" required placeholder="acme-corp" pattern="[a-z0-9-]+">
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="closeCreateModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="creating">{{ creating ? 'Creating...' : 'Create' }}</button>
            </div>
            <div class="error-message" *ngIf="createError">{{ createError }}</div>
          </form>
        </div>
      </div>

      <!-- View Modal -->
      <div class="modal-overlay" *ngIf="selectedOrg" (click)="selectedOrg = null">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>{{ selectedOrg.name }}</h2>
          <div class="detail-list">
            <div class="detail-row"><span>Slug:</span> <code>{{ selectedOrg.slug }}</code></div>
            <div class="detail-row"><span>Status:</span> {{ selectedOrg.isActive ? 'Active' : 'Inactive' }}</div>
            <div class="detail-row"><span>Max Submissions/Month:</span> {{ selectedOrg.maxSubmissionsPerMonth || 'Unlimited' }}</div>
            <div class="detail-row"><span>Created:</span> {{ selectedOrg.createdAt | date:'medium' }}</div>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="selectedOrg = null">Close</button>
          </div>
        </div>
      </div>

      <!-- Invite Org Admin Modal -->
      <div class="modal-overlay" *ngIf="showInviteModal" (click)="closeInviteModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>Invite Organization Admin</h2>
          <p class="modal-subtitle">Create an admin account for <strong>{{ inviteOrgTarget?.name }}</strong></p>
          <form (ngSubmit)="createOrgAdmin()">
            <div class="form-group">
              <label>Email *</label>
              <input type="email" [(ngModel)]="newOrgAdmin.email" name="email" required placeholder="admin@example.com">
            </div>
            <div class="form-group">
              <label>Password *</label>
              <input type="password" [(ngModel)]="newOrgAdmin.password" name="password" required minlength="8" placeholder="Minimum 8 characters">
              <small class="form-hint">Password must be at least 8 characters</small>
            </div>
            <div class="form-group">
              <label>Name</label>
              <input type="text" [(ngModel)]="newOrgAdmin.name" name="name" placeholder="John Doe">
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="closeInviteModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="inviting || !isInviteFormValid()">
                {{ inviting ? 'Creating...' : 'Create Org Admin' }}
              </button>
            </div>
            <div class="error-message" *ngIf="inviteError">{{ inviteError }}</div>
            <div class="success-message" *ngIf="inviteSuccess">{{ inviteSuccess }}</div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-organizations { max-width: 1200px; }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .btn-primary {
      background: #1f2937;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-primary:hover { background: #374151; }
    .btn-primary:disabled { opacity: 0.6; }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
    }

    .loading {
      text-align: center;
      padding: 48px;
      background: #fff;
      border-radius: 12px;
      color: #6b7280;
    }

    .table-container {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th,
    .data-table td {
      padding: 14px 20px;
      text-align: left;
      border-bottom: 1px solid #f3f4f6;
    }

    .data-table th {
      font-size: 0.8rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      background: #f9fafb;
    }

    .cell-name { font-weight: 500; color: #1f2937; }
    .cell-slug code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; }

    .cell-actions { display: flex; gap: 8px; }

    .action-btn {
      padding: 8px;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      color: #9ca3af;
    }

    .action-btn:hover { background: #f3f4f6; color: #374151; }

    .action-btn-primary { color: #22c55e; }
    .action-btn-primary:hover { background: #dcfce7; color: #16a34a; }

    .action-btn-switch {
      color: #6b7280;
    }

    .action-btn-switch:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    .action-btn-switch.active {
      background: #22c55e;
      color: white;
    }

    .action-btn-switch.active:hover {
      background: #16a34a;
      color: white;
    }

    .active-row {
      background: #f0fdf4;
      border-left: 3px solid #22c55e;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border-top: 1px solid #e5e7eb;
    }

    .pagination button {
      padding: 8px 16px;
      border: 1px solid #d1d5db;
      background: #fff;
      border-radius: 6px;
      cursor: pointer;
    }

    .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }

    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      width: 100%;
      max-width: 480px;
    }

    .modal h2 { margin: 0 0 16px 0; font-size: 1.25rem; color: #1f2937; }

    .modal-subtitle {
      margin: -8px 0 16px 0;
      font-size: 0.9rem;
      color: #6b7280;
    }

    .form-group { margin-bottom: 12px; }
    .form-hint { display: block; margin-top: 4px; font-size: 0.8rem; color: #6b7280; }
    .form-group label { display: block; margin-bottom: 4px; font-size: 0.875rem; font-weight: 500; color: #374151; }
    .form-group input { width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 8px; }
    .form-group input:focus { outline: none; border-color: #22c55e; }

    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }

    .error-message {
      background: #fee2e2;
      color: #dc2626;
      padding: 12px;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-top: 12px;
    }

    .success-message {
      background: #d1fae5;
      color: #065f46;
      padding: 12px;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-top: 12px;
    }

    .detail-list { background: #f9fafb; padding: 16px; border-radius: 8px; }
    .detail-row { padding: 8px 0; border-bottom: 1px solid #e5e7eb; display: flex; gap: 12px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-row span:first-child { color: #6b7280; width: 150px; }
  `]
})
export class AdminOrganizationsComponent implements OnInit {
  organizations: PaginatedResponse<Organization> | null = null;
  loading = true;
  selectedOrgId: number | null = null;

  showCreateModal = false;
  creating = false;
  createError = '';
  newOrg = { name: '', slug: '' };
  slugManuallyEdited = false;

  selectedOrg: Organization | null = null;

  showInviteModal = false;
  inviting = false;
  inviteError = '';
  inviteSuccess = '';
  inviteOrgTarget: Organization | null = null;
  newOrgAdmin = { email: '', password: '', name: '' };

  constructor(
    private adminService: AdminService,
    private orgContextService: OrgContextService
  ) {}

  async ngOnInit() {
    // Subscribe to organization context changes
    this.orgContextService.selectedOrgId$.subscribe(
      orgId => this.selectedOrgId = orgId
    );

    await this.loadOrganizations();
  }

  async loadOrganizations() {
    this.loading = true;
    try {
      this.organizations = await this.adminService.getOrganizations();
      
      // Auto-create default organization if none exist
      if (this.organizations && this.organizations.data.length === 0) {
        try {
          // Check if 'default' slug already exists (edge case)
          const existing = this.organizations.data.find(org => org.slug === 'default');
          if (!existing) {
            await this.adminService.createOrganization({
              name: 'Default Organization',
              slug: 'default'
            });
          }
          // Reload organizations after creating default
          this.organizations = await this.adminService.getOrganizations();
        } catch (err: any) {
          // If 'default' already exists, that's fine - just use it
          if (err.message && err.message.includes('already exists')) {
            this.organizations = await this.adminService.getOrganizations();
          } else {
            console.error('Failed to create default organization:', err);
          }
        }
      }
      
      // Auto-select default or first organization if no org is selected
      if (this.organizations && this.organizations.data.length > 0 && !this.selectedOrgId) {
        const defaultOrg = this.organizations.data.find(org => org.slug === 'default') || this.organizations.data[0];
        this.switchToOrg(defaultOrg);
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
    } finally {
      this.loading = false;
    }
  }

  async loadPage(page: number) {
    this.loading = true;
    try {
      this.organizations = await this.adminService.getOrganizations(page);
    } catch (err) {
      console.error('Failed to load page:', err);
    } finally {
      this.loading = false;
    }
  }

  onNameChange() {
    if (!this.slugManuallyEdited) {
      this.newOrg.slug = this.generateSlug(this.newOrg.name);
    }
  }

  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/-+/g, '-') // Replace multiple dashes with single dash
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
  }

  openCreateModal() {
    this.showCreateModal = true;
    this.newOrg = { name: '', slug: '' };
    this.slugManuallyEdited = false;
    this.createError = '';
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.newOrg = { name: '', slug: '' };
    this.slugManuallyEdited = false;
    this.createError = '';
  }

  async createOrganization() {
    this.creating = true;
    this.createError = '';
    try {
      await this.adminService.createOrganization({
        name: this.newOrg.name,
        slug: this.newOrg.slug
      });
      this.closeCreateModal();
      await this.loadOrganizations();
    } catch (err: any) {
      this.createError = err.message;
    } finally {
      this.creating = false;
    }
  }

  viewOrg(org: Organization) {
    this.selectedOrg = org;
  }

  async toggleOrgStatus(org: Organization, isActive: boolean) {
    try {
      await this.adminService.updateOrganization(org.id, { isActive });
      org.isActive = isActive;
    } catch (err) {
      console.error('Failed to update org status:', err);
    }
  }

  inviteOrgAdmin(org: Organization) {
    this.inviteOrgTarget = org;
    this.showInviteModal = true;
    this.inviteError = '';
    this.inviteSuccess = '';
    this.newOrgAdmin = { email: '', password: '', name: '' };
  }

  closeInviteModal() {
    this.showInviteModal = false;
    this.inviteOrgTarget = null;
    this.inviteError = '';
    this.inviteSuccess = '';
    this.newOrgAdmin = { email: '', password: '', name: '' };
  }

  isInviteFormValid(): boolean {
    return !!(
      this.newOrgAdmin.email &&
      this.newOrgAdmin.password &&
      this.newOrgAdmin.password.length >= 8
    );
  }

  async createOrgAdmin() {
    if (!this.isInviteFormValid() || !this.inviteOrgTarget) {
      return;
    }

    this.inviting = true;
    this.inviteError = '';
    this.inviteSuccess = '';

    try {
      const newUser = await this.adminService.createUser({
        email: this.newOrgAdmin.email,
        password: this.newOrgAdmin.password,
        name: this.newOrgAdmin.name || undefined,
        organizationId: this.inviteOrgTarget.id,
        role: 'org_admin'
      });

      this.inviteSuccess = `Organization admin ${newUser.email} created successfully!`;

      // Reset form
      this.newOrgAdmin = { email: '', password: '', name: '' };

      // Close modal after 2 seconds
      setTimeout(() => {
        this.closeInviteModal();
      }, 2000);

    } catch (err: any) {
      this.inviteError = err.message || 'Failed to create org admin. Please try again.';
      console.error('Failed to create org admin:', err);
    } finally {
      this.inviting = false;
    }
  }

  switchToOrg(org: Organization) {
    this.orgContextService.setSelectedOrgId(org.id);
  }
}
