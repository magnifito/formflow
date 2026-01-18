import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { ToggleSwitchComponent } from '../../shared/components/toggle-switch.component';
import { OrganizationService, Form } from '../../services/organization.service';
import { AdminService } from '../../services/admin.service';
import { OrgContextService } from '../../services/org-context.service';
import { fetchUrl } from '../../global-vars';

@Component({
  selector: 'app-org-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, StatCardComponent, ToggleSwitchComponent],
  template: `
    <div class="org-dashboard">
      <h1 class="page-title">Dashboard</h1>

      <!-- Stats Row -->
      <div class="stats-row">
        <app-stat-card
          title="My Forms"
          [value]="forms.length"
          icon="&#128196;"
        ></app-stat-card>

        <app-stat-card
          title="Total Submissions (Month)"
          [value]="submissionsThisMonth"
          [suffix]="submissionLimit ? '/ ' + submissionLimit + ' Limit' : ''"
          icon="&#128203;"
          [showProgress]="!!submissionLimit"
          [progressPercent]="submissionLimit ? (submissionsThisMonth / submissionLimit * 100) : 0"
        ></app-stat-card>
      </div>

      <!-- Recent Forms Table -->
      <div class="forms-section">
        <div class="section-header">
          <h2 class="section-title">Recent Forms</h2>
          <button class="create-form-btn" (click)="showCreateModal = true">
            Create New Form
          </button>
        </div>

        <div class="forms-table-container" *ngIf="forms.length > 0">
          <table class="forms-table">
            <thead>
              <tr>
                <th>Form Name</th>
                <th>Endpoint URL</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let form of forms">
                <td class="form-name">{{ form.name }}</td>
                <td class="form-url">
                  <span class="url-text">{{ getSubmitUrl(form) }}</span>
                  <button class="copy-btn" (click)="copyUrl(form)" title="Copy URL">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </button>
                </td>
                <td class="form-status">
                  <app-toggle-switch
                    [checked]="form.isActive"
                    [activeLabel]="'Active'"
                    [inactiveLabel]="'Inactive'"
                    (change)="toggleFormStatus(form, $event)"
                  ></app-toggle-switch>
                </td>
                <td class="form-actions">
                  <button class="action-btn" (click)="deleteForm(form)" title="Delete">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                  <button class="action-btn" (click)="editForm(form)" title="Edit">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="action-btn" title="More options">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="1"/>
                      <circle cx="19" cy="12" r="1"/>
                      <circle cx="5" cy="12" r="1"/>
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="empty-state" *ngIf="forms.length === 0 && !loading">
          <p>You haven't created any forms yet.</p>
        </div>

        <div class="loading-state" *ngIf="loading">
          Loading forms...
        </div>
      </div>

      <!-- Create Form Modal -->
      <div class="modal-overlay" *ngIf="showCreateModal" (click)="showCreateModal = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>Create New Form</h2>

          <!-- Context information for super admins -->
          <div class="context-info" *ngIf="isSuperAdmin">
            <div class="info-box" [class.info-box-warning]="!selectedOrgId">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                <strong *ngIf="selectedOrgId">Creating form for: {{ selectedOrgName }}</strong>
                <strong *ngIf="!selectedOrgId">Creating personal form</strong>
                <p *ngIf="!selectedOrgId">This form will be under your personal account. To create a form for an organization, select it from the dropdown above first.</p>
                <button type="button" class="link-btn" *ngIf="!selectedOrgId" (click)="goToOrganizations()">
                  → Go to Organizations to create/select one
                </button>
              </div>
            </div>
          </div>

          <form (ngSubmit)="createForm()">
            <div class="form-group">
              <label>Form Name *</label>
              <input type="text" [(ngModel)]="newForm.name" name="name" required placeholder="e.g., Contact Form">
            </div>
            <div class="form-group">
              <label>Description</label>
              <input type="text" [(ngModel)]="newForm.description" name="description" placeholder="Optional description">
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="showCreateModal = false">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="creating || !newForm.name">
                {{ creating ? 'Creating...' : 'Create Form' }}
              </button>
            </div>
            <div class="error-message" *ngIf="createError">{{ createError }}</div>
          </form>
        </div>
      </div>

      <!-- Edit Form Modal -->
      <div class="modal-overlay" *ngIf="editingForm" (click)="editingForm = null">
        <div class="modal modal-large" (click)="$event.stopPropagation()">
          <h2>Edit Form</h2>
          <form (ngSubmit)="saveForm()">
            <div class="form-group">
              <label>Form Name *</label>
              <input type="text" [(ngModel)]="editingForm.name" name="name" required>
            </div>
            <div class="form-group">
              <label>Description</label>
              <input type="text" [(ngModel)]="editingForm.description" name="description">
            </div>

            <!-- Security Settings (collapsible) -->
            <div class="security-section">
              <button type="button" class="security-toggle" (click)="showSecuritySettings = !showSecuritySettings">
                <span>Security Settings</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" [style.transform]="showSecuritySettings ? 'rotate(180deg)' : ''">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              <div class="security-content" *ngIf="showSecuritySettings">
                <p class="security-hint">Override organization default security settings for this form.</p>

                <div class="form-group checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="editingForm.useOrgSecuritySettings" name="useOrgSecuritySettings">
                    <span>Use organization default security settings</span>
                  </label>
                </div>

                <div *ngIf="!editingForm.useOrgSecuritySettings" class="security-fields">
                  <!-- Rate Limiting -->
                  <div class="security-subgroup">
                    <div class="security-subheader">
                      <h4>Rate Limiting</h4>
                      <label class="toggle-switch-small">
                        <input type="checkbox" [(ngModel)]="editingForm.rateLimitEnabled" name="rateLimitEnabled">
                        <span class="slider"></span>
                      </label>
                    </div>
                    <div *ngIf="editingForm.rateLimitEnabled" class="inline-fields">
                      <div class="inline-field">
                        <label>Max requests</label>
                        <input type="number" [(ngModel)]="editingForm.rateLimitMaxRequests" name="rateLimitMaxRequests" min="1" max="1000">
                      </div>
                      <div class="inline-field">
                        <label>Window (sec)</label>
                        <input type="number" [(ngModel)]="editingForm.rateLimitWindowSeconds" name="rateLimitWindowSeconds" min="1" max="3600">
                      </div>
                      <div class="inline-field">
                        <label>Max/hour</label>
                        <input type="number" [(ngModel)]="editingForm.rateLimitMaxRequestsPerHour" name="rateLimitMaxRequestsPerHour" min="1" max="10000">
                      </div>
                    </div>
                  </div>

                  <!-- Time Throttling -->
                  <div class="security-subgroup">
                    <div class="security-subheader">
                      <h4>Time Throttling</h4>
                      <label class="toggle-switch-small">
                        <input type="checkbox" [(ngModel)]="editingForm.minTimeBetweenSubmissionsEnabled" name="minTimeBetweenSubmissionsEnabled">
                        <span class="slider"></span>
                      </label>
                    </div>
                    <div *ngIf="editingForm.minTimeBetweenSubmissionsEnabled" class="inline-fields">
                      <div class="inline-field">
                        <label>Min seconds between</label>
                        <input type="number" [(ngModel)]="editingForm.minTimeBetweenSubmissionsSeconds" name="minTimeBetweenSubmissionsSeconds" min="1" max="300">
                      </div>
                    </div>
                  </div>

                  <!-- Request Size -->
                  <div class="security-subgroup">
                    <h4>Request Size Limit</h4>
                    <div class="inline-fields">
                      <div class="inline-field">
                        <label>Max bytes</label>
                        <input type="number" [(ngModel)]="editingForm.maxRequestSizeBytes" name="maxRequestSizeBytes" min="1000" max="10000000">
                      </div>
                    </div>
                  </div>

                  <!-- Referer Fallback -->
                  <div class="security-subgroup">
                    <div class="security-subheader">
                      <h4>Referer Fallback</h4>
                      <label class="toggle-switch-small">
                        <input type="checkbox" [(ngModel)]="editingForm.refererFallbackEnabled" name="refererFallbackEnabled">
                        <span class="slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="editingForm = null">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving">
                {{ saving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .org-dashboard {
      max-width: 1200px;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 24px 0;
    }

    .stats-row {
      display: flex;
      gap: 20px;
      margin-bottom: 32px;
      flex-wrap: wrap;
      align-items: stretch;
    }

    .create-form-btn {
      background: #1f2937;
      color: #fff;
      border: none;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
      white-space: nowrap;
    }

    .create-form-btn:hover {
      background: #374151;
    }

    .forms-section {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
      flex-wrap: wrap;
    }

    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .section-header .create-form-btn {
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 0.9rem;
    }

    .forms-table-container {
      overflow-x: auto;
    }

    .forms-table {
      width: 100%;
      border-collapse: collapse;
    }

    .forms-table th,
    .forms-table td {
      padding: 16px 24px;
      text-align: left;
      border-bottom: 1px solid #f3f4f6;
    }

    .forms-table th {
      font-size: 0.8rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      background: #f9fafb;
    }

    .forms-table tbody tr:hover {
      background: #fafafa;
    }

    .form-name {
      font-weight: 500;
      color: #1f2937;
    }

    .form-url {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .url-text {
      font-size: 0.875rem;
      color: #6b7280;
      max-width: 280px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .copy-btn {
      padding: 6px;
      border: none;
      background: #f3f4f6;
      border-radius: 4px;
      cursor: pointer;
      color: #6b7280;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .copy-btn:hover {
      background: #e5e7eb;
      color: #374151;
    }

    .form-actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      padding: 8px;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      color: #9ca3af;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    .action-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .action-btn:first-child:hover {
      background: #fef2f2;
      color: #dc2626;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #6b7280;
    }

    .loading-state {
      text-align: center;
      padding: 48px 24px;
      color: #9ca3af;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: #fff;
      border-radius: 12px;
      padding: 24px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-large {
      max-width: 600px;
    }

    .modal h2 {
      margin: 0 0 20px 0;
      font-size: 1.25rem;
      color: #1f2937;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }

    .form-group input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.95rem;
      transition: border-color 0.15s;
      background: #fff;
      color: #1f2937;
      box-sizing: border-box;
    }

    .form-group input::placeholder {
      color: #9ca3af;
    }

    .form-group input:focus {
      outline: none;
      border-color: #22c55e;
      background: #fff;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
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
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-secondary:hover { background: #e5e7eb; }

    .error-message {
      color: #dc2626;
      font-size: 0.875rem;
      margin-top: 12px;
    }

    .context-info {
      margin-bottom: 20px;
    }

    .info-box {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      background: #dbeafe;
      border: 1px solid #93c5fd;
      border-radius: 8px;
      font-size: 0.875rem;
    }

    .info-box svg {
      flex-shrink: 0;
      color: #3b82f6;
      margin-top: 2px;
    }

    .info-box strong {
      display: block;
      color: #1e40af;
      margin-bottom: 4px;
    }

    .info-box p {
      margin: 0;
      color: #1e3a8a;
      line-height: 1.5;
    }

    .info-box-warning {
      background: #fef3c7;
      border-color: #fcd34d;
    }

    .info-box-warning svg {
      color: #f59e0b;
    }

    .info-box-warning strong {
      color: #92400e;
    }

    .info-box-warning p {
      color: #78350f;
    }

    .link-btn {
      background: none;
      border: none;
      color: #2563eb;
      cursor: pointer;
      padding: 4px 0;
      margin-top: 8px;
      font-size: 0.875rem;
      text-decoration: underline;
    }

    .link-btn:hover {
      color: #1d4ed8;
    }

    .security-section {
      margin-top: 24px;
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
    }

    .security-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 12px 0;
      background: none;
      border: none;
      font-size: 0.95rem;
      font-weight: 600;
      color: #1f2937;
      cursor: pointer;
    }

    .security-toggle svg {
      transition: transform 0.2s;
    }

    .security-content {
      margin-top: 12px;
    }

    .security-hint {
      font-size: 0.85rem;
      color: #6b7280;
      margin: 0 0 16px 0;
    }

    .checkbox-group {
      margin-bottom: 20px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .security-fields {
      margin-top: 16px;
      padding-left: 8px;
    }

    .security-subgroup {
      margin-bottom: 20px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .security-subheader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .security-subheader h4 {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: #374151;
    }

    .inline-fields {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .inline-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .inline-field label {
      font-size: 0.8rem;
      color: #6b7280;
    }

    .inline-field input[type="number"] {
      width: 100px;
      padding: 6px 8px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.9rem;
    }

    .toggle-switch-small {
      position: relative;
      display: inline-block;
      width: 36px;
      height: 20px;
    }

    .toggle-switch-small input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-switch-small .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: 0.2s;
      border-radius: 20px;
    }

    .toggle-switch-small .slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.2s;
      border-radius: 50%;
    }

    .toggle-switch-small input:checked + .slider {
      background-color: #22c55e;
    }

    .toggle-switch-small input:checked + .slider:before {
      transform: translateX(16px);
    }
  `]
})
export class OrgDashboardComponent implements OnInit {
  forms: Form[] = [];
  loading = true;
  submissionsThisMonth = 0;
  submissionLimit: number | null = null;

  showCreateModal = false;
  creating = false;
  createError = '';
  newForm = { name: '', description: '' };

  editingForm: Form | null = null;
  saving = false;
  showSecuritySettings = false;

  // Super admin context
  isSuperAdmin = false;
  selectedOrgId: number | null = null;
  selectedOrgName = '';

  constructor(
    private orgService: OrganizationService,
    private adminService: AdminService,
    private orgContextService: OrgContextService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.checkSuperAdminStatus();
    this.loadOrgContext();
    await this.loadData();
  }

  async checkSuperAdminStatus() {
    // Check if user is super admin by fetching user data
    const userId = localStorage.getItem('FB_user_id');
    const token = localStorage.getItem('FB_jwt_token');
    if (userId && token) {
      try {
        const response = await fetch(`${fetchUrl}/api/user/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const user = await response.json();
          this.isSuperAdmin = user.isSuperAdmin || false;
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    }
  }

  loadOrgContext() {
    // Subscribe to org context changes
    this.orgContextService.selectedOrgId$.subscribe(async orgId => {
      this.selectedOrgId = orgId;
      if (orgId !== null && this.isSuperAdmin) {
        // Fetch org name
        try {
          const orgs = await this.adminService.getAllOrganizations();
          const org = orgs.find(o => o.id === orgId);
          this.selectedOrgName = org?.name || '';
        } catch (e) {
          // Fallback
          this.selectedOrgName = `Organization ${orgId}`;
        }
      } else {
        this.selectedOrgName = '';
      }
    });
  }

  async loadData() {
    this.loading = true;
    try {
      // Load forms
      this.forms = await this.orgService.getForms();
      
      // Load stats
      try {
        const stats = await this.orgService.getStats();
        this.submissionsThisMonth = stats.submissionsThisMonth;
        this.submissionLimit = stats.submissionLimit;
      } catch (e) {
        // Stats endpoint may not exist yet
        console.log('Stats endpoint not available');
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      this.loading = false;
    }
  }

  getSubmitUrl(form: Form): string {
    return `${fetchUrl}/submit/${form.submitHash}`;
  }

  copyUrl(form: Form) {
    navigator.clipboard.writeText(this.getSubmitUrl(form));
  }

  async toggleFormStatus(form: Form, isActive: boolean) {
    try {
      await this.orgService.updateForm(form.id, { isActive });
      form.isActive = isActive;
    } catch (err) {
      console.error('Failed to update form status:', err);
      // Revert the toggle
      form.isActive = !isActive;
    }
  }

  async createForm() {
    this.creating = true;
    this.createError = '';
    try {
      console.log('Creating form with data:', {
        name: this.newForm.name,
        description: this.newForm.description || undefined
      });
      console.log('Current org context:', this.orgContextService.getSelectedOrgId());

      await this.orgService.createForm({
        name: this.newForm.name,
        description: this.newForm.description || undefined
      });
      this.showCreateModal = false;
      this.newForm = { name: '', description: '' };
      await this.loadData();
    } catch (err: any) {
      console.error('Form creation error:', err);
      this.createError = err.message || 'Failed to create form';
    } finally {
      this.creating = false;
    }
  }

  async editForm(form: Form) {
    // Load full form data including security settings
    try {
      const fullForm = await this.orgService.getForm(form.id);
      this.editingForm = { ...fullForm };
      this.showSecuritySettings = false;
    } catch (err) {
      // Fallback to basic form data
      this.editingForm = { ...form };
      this.showSecuritySettings = false;
    }
  }

  async saveForm() {
    if (!this.editingForm) return;
    this.saving = true;
    try {
      await this.orgService.updateForm(this.editingForm.id, {
        name: this.editingForm.name,
        description: this.editingForm.description,
        useOrgSecuritySettings: this.editingForm.useOrgSecuritySettings,
        rateLimitEnabled: this.editingForm.rateLimitEnabled,
        rateLimitMaxRequests: this.editingForm.rateLimitMaxRequests,
        rateLimitWindowSeconds: this.editingForm.rateLimitWindowSeconds,
        rateLimitMaxRequestsPerHour: this.editingForm.rateLimitMaxRequestsPerHour,
        minTimeBetweenSubmissionsEnabled: this.editingForm.minTimeBetweenSubmissionsEnabled,
        minTimeBetweenSubmissionsSeconds: this.editingForm.minTimeBetweenSubmissionsSeconds,
        maxRequestSizeBytes: this.editingForm.maxRequestSizeBytes,
        refererFallbackEnabled: this.editingForm.refererFallbackEnabled
      });
      this.editingForm = null;
      this.showSecuritySettings = false;
      await this.loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      this.saving = false;
    }
  }

  async deleteForm(form: Form) {
    if (!confirm(`Delete "${form.name}"? This will also delete all submissions.`)) {
      return;
    }
    try {
      await this.orgService.deleteForm(form.id);
      await this.loadData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  goToOrganizations() {
    this.showCreateModal = false;
    void this.router.navigate(['/admin/organizations']);
  }
}
