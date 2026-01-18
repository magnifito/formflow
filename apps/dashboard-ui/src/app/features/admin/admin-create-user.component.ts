import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, Organization, User } from '../../services/admin.service';

@Component({
  selector: 'app-admin-create-user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="create-user-page">
      <div class="page-header">
        <h1 class="page-title">Create New User</h1>
        <button class="btn-secondary" (click)="goBack()">← Back to Users</button>
      </div>

      <div class="form-card">
        <form (ngSubmit)="createUser()">
          <div class="form-group">
            <label for="email">Email *</label>
            <input
              id="email"
              type="email"
              [(ngModel)]="formData.email"
              name="email"
              required
              placeholder="user@example.com"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="password">Password *</label>
            <input
              id="password"
              type="password"
              [(ngModel)]="formData.password"
              name="password"
              required
              minlength="8"
              placeholder="Minimum 8 characters"
              class="form-input"
            />
            <small class="form-hint">Password must be at least 8 characters</small>
          </div>

          <div class="form-group">
            <label for="name">Name</label>
            <input
              id="name"
              type="text"
              [(ngModel)]="formData.name"
              name="name"
              placeholder="John Doe"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="organization">Organization *</label>
            <select
              id="organization"
              [(ngModel)]="formData.organizationId"
              name="organization"
              required
              class="form-select"
              [disabled]="loadingOrgs"
            >
              <option [ngValue]="null">{{ loadingOrgs ? 'Loading...' : 'Select an organization' }}</option>
              <option *ngFor="let org of organizations" [ngValue]="org.id">
                {{ org.name }} ({{ org.slug }}){{ org.isActive ? '' : ' - INACTIVE' }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="role">Role *</label>
            <select
              id="role"
              [(ngModel)]="formData.role"
              name="role"
              required
              class="form-select"
            >
              <option value="member">Member</option>
              <option value="org_admin">Organization Admin</option>
            </select>
            <small class="form-hint">
              Organization Admins can manage forms and settings within their organization
            </small>
          </div>

          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>

          <div class="success-message" *ngIf="successMessage">
            {{ successMessage }}
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="creating || !isFormValid()">
              {{ creating ? 'Creating...' : 'Create User' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .create-user-page {
      max-width: 600px;
    }

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

    .form-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 32px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }

    .form-input, .form-select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.9rem;
    }

    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: #1f2937;
    }

    .form-input:disabled, .form-select:disabled {
      background: #f3f4f6;
      cursor: not-allowed;
    }

    .form-hint {
      display: block;
      margin-top: 4px;
      font-size: 0.8rem;
      color: #6b7280;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
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

    .btn-primary:hover:not(:disabled) {
      background: #374151;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .error-message {
      background: #fee2e2;
      color: #dc2626;
      padding: 12px;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-bottom: 16px;
    }

    .success-message {
      background: #d1fae5;
      color: #065f46;
      padding: 12px;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-bottom: 16px;
    }
  `]
})
export class AdminCreateUserComponent implements OnInit {
  formData = {
    email: '',
    password: '',
    name: '',
    organizationId: null as number | null,
    role: 'member' as 'member' | 'org_admin'
  };

  organizations: Organization[] = [];
  loadingOrgs = false;
  creating = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadOrganizations();
  }

  async loadOrganizations() {
    this.loadingOrgs = true;
    try {
      this.organizations = await this.adminService.getAllOrganizations();
      // Filter to only active organizations
      this.organizations = this.organizations.filter(org => org.isActive);
    } catch (err) {
      console.error('Failed to load organizations:', err);
      this.errorMessage = 'Failed to load organizations. Please refresh the page.';
    } finally {
      this.loadingOrgs = false;
    }
  }

  isFormValid(): boolean {
    return !!(
      this.formData.email &&
      this.formData.password &&
      this.formData.password.length >= 8 &&
      this.formData.organizationId &&
      this.formData.role
    );
  }

  async createUser() {
    if (!this.isFormValid()) {
      return;
    }

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const newUser = await this.adminService.createUser({
        email: this.formData.email,
        password: this.formData.password,
        name: this.formData.name || undefined,
        organizationId: this.formData.organizationId!,
        role: this.formData.role
      });

      this.successMessage = `User ${newUser.email} created successfully!`;

      // Reset form
      this.formData = {
        email: '',
        password: '',
        name: '',
        organizationId: null,
        role: 'member'
      };

      // Redirect to users list after 2 seconds
      setTimeout(() => {
        void this.router.navigate(['/admin/users']);
      }, 2000);

    } catch (err: any) {
      this.errorMessage = err.message || 'Failed to create user. Please try again.';
      console.error('Failed to create user:', err);
    } finally {
      this.creating = false;
    }
  }

  goBack() {
    void this.router.navigate(['/admin/users']);
  }
}
