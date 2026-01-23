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
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardInputDirective } from '@/shared/components/input';
import {
  ZardTableComponent,
  ZardTableHeaderComponent,
  ZardTableBodyComponent,
  ZardTableRowComponent,
  ZardTableHeadComponent,
  ZardTableCellComponent,
} from '@/shared/components/table';

@Component({
  selector: 'app-org-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatCardComponent,
    ToggleSwitchComponent,
    ZardButtonComponent,
    ZardCardComponent,
    ZardInputDirective,
    ZardTableComponent,
    ZardTableHeaderComponent,
    ZardTableBodyComponent,
    ZardTableRowComponent,
    ZardTableHeadComponent,
    ZardTableCellComponent
  ],
  template: `
    <div class="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-display font-bold text-foreground">Dashboard</h1>
      </div>

      <!-- Stats Row -->
      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <app-stat-card
          title="My Forms"
          [value]="forms.length"
          icon="&#128196;"
          class="glass-card rounded-xl border border-border/50 shadow-sm"
        ></app-stat-card>

        <app-stat-card
          title="Total Submissions (Month)"
          [value]="submissionsThisMonth"
          [suffix]="submissionLimit ? '/ ' + submissionLimit + ' Limit' : ''"
          icon="&#128203;"
          [showProgress]="!!submissionLimit"
          [progressPercent]="submissionLimit ? (submissionsThisMonth / submissionLimit * 100) : 0"
          class="glass-card rounded-xl border border-border/50 shadow-sm"
        ></app-stat-card>
      </div>

      <!-- Recent Forms Table -->
      <z-card [zTitle]="'Recent Forms'" class="glass-card border-border/50">
        <div class="flex items-center justify-between mb-6" z-card-header>
           <div class="space-y-1">
             <h2 class="text-2xl font-semibold tracking-tight">Recent Forms</h2>
             <p class="text-sm text-muted-foreground">Manage your active forms and integrations.</p>
           </div>
           <button z-button (click)="showCreateModal = true" class="shadow-lg shadow-primary/20">
            Create New Form
          </button>
        </div>
        
        <div class="rounded-md border border-border/50 overflow-hidden" *ngIf="forms.length > 0">
          <table z-table>
            <thead z-table-header class="bg-muted/50">
              <tr z-table-row>
                <th z-table-head>Form Name</th>
                <th z-table-head>Endpoint URL</th>
                <th z-table-head>Status</th>
                <th z-table-head class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody z-table-body>
              <tr z-table-row *ngFor="let form of forms" class="group transition-colors hover:bg-muted/50">
                <td z-table-cell class="font-medium text-foreground">{{ form.name }}</td>
                <td z-table-cell>
                  <div class="flex items-center gap-2">
                    <code class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors max-w-[200px] truncate">
                      {{ getSubmitUrl(form) }}
                    </code>
                    <button z-button zType="ghost" zSize="icon" class="h-6 w-6" (click)="copyUrl(form)" title="Copy URL">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  </div>
                </td>
                <td z-table-cell>
                  <div class="flex items-center gap-2">
                     <span class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" 
                              [class.bg-green-400]="form.isActive" [class.bg-gray-400]="!form.isActive"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2"
                              [class.bg-green-500]="form.isActive" [class.bg-gray-500]="!form.isActive"></span>
                      </span>
                      <app-toggle-switch
                        [checked]="form.isActive"
                        (change)="toggleFormStatus(form, $event)"
                      ></app-toggle-switch>
                  </div>
                </td>
                <td z-table-cell class="text-right">
                  <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button z-button zType="ghost" zSize="sm" (click)="editForm(form)" title="Edit">
                        Edit
                    </button>
                     <button z-button zType="ghost" zSize="sm" class="text-destructive hover:text-destructive hover:bg-destructive/10" (click)="deleteForm(form)" title="Delete">
                        Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="text-center py-12" *ngIf="forms.length === 0 && !loading">
            <div class="rounded-full bg-muted/50 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                 <span class="text-2xl">📝</span>
            </div>
            <h3 class="text-lg font-medium">No forms created yet</h3>
            <p class="text-muted-foreground mt-1 mb-4">Create your first form to start collecting submissions.</p>
            <button z-button variant="outline" (click)="showCreateModal = true">Create Form</button>
        </div>

        <div class="py-12 flex justify-center" *ngIf="loading">
           <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </z-card>

      <!-- Create Form Modal -->
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" *ngIf="showCreateModal" (click)="showCreateModal = false">
        <div class="relative w-full max-w-lg p-6 bg-card border border-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200" (click)="$event.stopPropagation()">
            <!-- Close Button -->
            <button class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground" (click)="showCreateModal = false">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.1929 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.1929 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
            </button>
            
          <h2 class="text-xl font-semibold mb-6">Create New Form</h2>

          <!-- Context information for super admins -->
          <div class="mb-6 p-4 bg-muted/50 rounded-lg border border-border/50" *ngIf="isSuperAdmin">
              <div class="flex gap-3">
                <div class="text-primary mt-1">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <div>
                    <strong class="block text-sm font-medium mb-1" *ngIf="selectedOrgId">Creating form for: {{ selectedOrgName }}</strong>
                    <strong class="block text-sm font-medium mb-1" *ngIf="!selectedOrgId">Creating personal form</strong>
                    <p class="text-sm text-muted-foreground" *ngIf="!selectedOrgId">This form will be under your personal account. To create a form for an organization, select it from the dropdown above first.</p>
                     <button type="button" class="text-sm text-primary hover:underline mt-2" *ngIf="!selectedOrgId" (click)="goToOrganizations()">
                      → Go to Organizations
                    </button>
                </div>
              </div>
          </div>

          <form (ngSubmit)="createForm()" class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Form Name <span class="text-destructive">*</span></label>
              <input z-input type="text" [(ngModel)]="newForm.name" name="name" required placeholder="e.g., Contact Form">
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Description</label>
              <input z-input type="text" [(ngModel)]="newForm.description" name="description" placeholder="Optional description">
            </div>
            <div class="flex justify-end gap-3 pt-4">
              <button type="button" z-button zType="outline" (click)="showCreateModal = false">Cancel</button>
              <button type="submit" z-button [disabled]="creating || !newForm.name">
                {{ creating ? 'Creating...' : 'Create Form' }}
              </button>
            </div>
            <div class="text-sm text-destructive" *ngIf="createError">{{ createError }}</div>
          </form>
        </div>
      </div>

      <!-- Edit Form Modal -->
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" *ngIf="editingForm" (click)="editingForm = null">
        <div class="relative w-full max-w-2xl p-6 bg-card border border-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <h2 class="text-xl font-semibold mb-6">Edit Form</h2>
          <form (ngSubmit)="saveForm()" class="space-y-6">
             <div class="grid gap-4">
                <div class="space-y-2">
                    <label class="text-sm font-medium">Form Name *</label>
                    <input z-input type="text" [(ngModel)]="editingForm.name" name="name" required>
                </div>
                <div class="space-y-2">
                    <label class="text-sm font-medium">Description</label>
                    <input z-input type="text" [(ngModel)]="editingForm.description" name="description">
                </div>
            </div>

            <!-- Security Settings (collapsible) -->
            <div class="border-t border-border pt-4">
              <button type="button" class="flex items-center justify-between w-full py-2 text-sm font-medium text-left hover:text-primary transition-colors" (click)="showSecuritySettings = !showSecuritySettings">
                <span>Security Settings</span>
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="transition-transform duration-200" [class.rotate-180]="showSecuritySettings">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              <div class="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200" *ngIf="showSecuritySettings">
                <p class="text-sm text-muted-foreground">Override organization default security settings for this form.</p>

                <div class="flex items-center gap-2">
                    <input type="checkbox" id="useOrgDetails" [(ngModel)]="editingForm.useOrgSecuritySettings" name="useOrgSecuritySettings" class="h-4 w-4 rounded border-border text-primary focus:ring-primary">
                    <label for="useOrgDetails" class="text-sm font-medium leading-none cursor-pointer">Use organization default security settings</label>
                </div>

                <div *ngIf="!editingForm.useOrgSecuritySettings" class="space-y-6 pl-4 border-l-2 border-border ml-1 mt-4">
                  <!-- Rate Limiting -->
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <h4 class="text-sm font-semibold">Rate Limiting</h4>
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" [(ngModel)]="editingForm.rateLimitEnabled" name="rateLimitEnabled" class="sr-only peer">
                        <div class="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    <div *ngIf="editingForm.rateLimitEnabled" class="grid grid-cols-3 gap-4">
                      <div class="space-y-1">
                        <label class="text-xs font-medium text-muted-foreground">Max requests</label>
                        <input z-input type="number" [(ngModel)]="editingForm.rateLimitMaxRequests" name="rateLimitMaxRequests" min="1" max="1000" class="h-8">
                      </div>
                      <div class="space-y-1">
                         <label class="text-xs font-medium text-muted-foreground">Window (sec)</label>
                        <input z-input type="number" [(ngModel)]="editingForm.rateLimitWindowSeconds" name="rateLimitWindowSeconds" min="1" max="3600" class="h-8">
                      </div>
                      <div class="space-y-1">
                        <label class="text-xs font-medium text-muted-foreground">Max/hour</label>
                        <input z-input type="number" [(ngModel)]="editingForm.rateLimitMaxRequestsPerHour" name="rateLimitMaxRequestsPerHour" min="1" max="10000" class="h-8">
                      </div>
                    </div>
                  </div>

                  <!-- Time Throttling -->
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <h4 class="text-sm font-semibold">Time Throttling</h4>
                       <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" [(ngModel)]="editingForm.minTimeBetweenSubmissionsEnabled" name="minTimeBetweenSubmissionsEnabled" class="sr-only peer">
                        <div class="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    <div *ngIf="editingForm.minTimeBetweenSubmissionsEnabled" class="grid grid-cols-1">
                      <div class="space-y-1">
                         <label class="text-xs font-medium text-muted-foreground">Min seconds between</label>
                        <input z-input type="number" [(ngModel)]="editingForm.minTimeBetweenSubmissionsSeconds" name="minTimeBetweenSubmissionsSeconds" min="1" max="300" class="h-8 w-32">
                      </div>
                    </div>
                  </div>

                  <!-- Request Size -->
                  <div class="space-y-3">
                     <h4 class="text-sm font-semibold">Request Size Limit</h4>
                    <div class="grid grid-cols-1">
                      <div class="space-y-1">
                        <label class="text-xs font-medium text-muted-foreground">Max bytes</label>
                        <input z-input type="number" [(ngModel)]="editingForm.maxRequestSizeBytes" name="maxRequestSizeBytes" min="1000" max="10000000" class="h-8 w-32">
                      </div>
                    </div>
                  </div>

                  <!-- Referer Fallback -->
                   <div class="space-y-3">
                    <div class="flex items-center justify-between">
                       <h4 class="text-sm font-semibold">Referer Fallback</h4>
                       <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" [(ngModel)]="editingForm.refererFallbackEnabled" name="refererFallbackEnabled" class="sr-only peer">
                        <div class="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-6 border-t border-border">
              <button type="button" z-button zType="outline" (click)="editingForm = null">Cancel</button>
              <button type="submit" z-button [disabled]="saving">
                {{ saving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: []
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

  editingForm: any | null = null;
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
  ) { }

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
