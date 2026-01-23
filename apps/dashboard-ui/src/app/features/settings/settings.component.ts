import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrganizationService, WhitelistedDomain, SecuritySettings } from '../../services/organization.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page">
      <h1 class="page-title">Settings</h1>

      <!-- Whitelisted Domains Section -->
      <section class="settings-section">
        <h2 class="section-title">Whitelisted Domains</h2>
        <p class="section-description">
          Only accept form submissions from these domains. Leave empty to accept from any origin.
        </p>

        <div class="domains-list" *ngIf="domains.length > 0">
          <div class="domain-item" *ngFor="let domain of domains">
            <span class="domain-name">{{ domain.domain }}</span>
            <button class="remove-btn" (click)="removeDomain(domain)" title="Remove">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="empty-domains" *ngIf="domains.length === 0 && !loadingDomains">
          <p>No domains whitelisted. Forms accept submissions from any origin.</p>
        </div>

        <div class="add-domain-form">
          <input 
            type="text" 
            [(ngModel)]="newDomain" 
            placeholder="example.com"
            (keyup.enter)="addDomain()"
          >
          <button class="add-btn" (click)="addDomain()" [disabled]="!newDomain || addingDomain">
            {{ addingDomain ? 'Adding...' : 'Add Domain' }}
          </button>
        </div>
        <div class="error-message" *ngIf="domainError">{{ domainError }}</div>
      </section>

      <!-- Security Settings Section -->
      <section class="settings-section">
        <h2 class="section-title">Security Settings</h2>
        <p class="section-description">
          Default security settings for all forms. These can be overridden per form.
        </p>

        <div *ngIf="loadingSecurity" class="loading-state">Loading security settings...</div>
        
        <div *ngIf="!loadingSecurity" class="security-settings">
          <!-- Rate Limiting -->
          <div class="security-group">
            <div class="security-header">
              <h3>Rate Limiting</h3>
              <label class="toggle-switch">
                <input type="checkbox" [(ngModel)]="securitySettings.defaultRateLimitEnabled" (change)="saveSecuritySettings()">
                <span class="slider"></span>
              </label>
            </div>
            <p class="security-description">Limit the number of submissions per IP address to prevent abuse.</p>
            
            <div class="security-fields" *ngIf="securitySettings.defaultRateLimitEnabled">
              <div class="field-row">
                <label>Max requests per time window</label>
                <input type="number" [(ngModel)]="securitySettings.defaultRateLimitMaxRequests" (blur)="saveSecuritySettings()" min="1" max="1000">
              </div>
              <div class="field-row">
                <label>Time window (seconds)</label>
                <input type="number" [(ngModel)]="securitySettings.defaultRateLimitWindowSeconds" (blur)="saveSecuritySettings()" min="1" max="3600">
              </div>
              <div class="field-row">
                <label>Max requests per hour</label>
                <input type="number" [(ngModel)]="securitySettings.defaultRateLimitMaxRequestsPerHour" (blur)="saveSecuritySettings()" min="1" max="10000">
              </div>
            </div>
          </div>

          <!-- Minimum Time Between Submissions -->
          <div class="security-group">
            <div class="security-header">
              <h3>Time Throttling</h3>
              <label class="toggle-switch">
                <input type="checkbox" [(ngModel)]="securitySettings.defaultMinTimeBetweenSubmissionsEnabled" (change)="saveSecuritySettings()">
                <span class="slider"></span>
              </label>
            </div>
            <p class="security-description">Enforce a minimum time delay between submissions from the same IP.</p>
            
            <div class="security-fields" *ngIf="securitySettings.defaultMinTimeBetweenSubmissionsEnabled">
              <div class="field-row">
                <label>Minimum seconds between submissions</label>
                <input type="number" [(ngModel)]="securitySettings.defaultMinTimeBetweenSubmissionsSeconds" (blur)="saveSecuritySettings()" min="1" max="300">
              </div>
            </div>
          </div>

          <!-- Request Size Limits -->
          <div class="security-group">
            <h3>Request Size Limit</h3>
            <p class="security-description">Maximum size of form submission request body (in bytes).</p>
            <div class="field-row">
              <label>Max request size (bytes)</label>
              <input type="number" [(ngModel)]="securitySettings.defaultMaxRequestSizeBytes" (blur)="saveSecuritySettings()" min="1000" max="10000000">
              <span class="field-hint">{{ (securitySettings.defaultMaxRequestSizeBytes || 100000) / 1000 }} KB</span>
            </div>
          </div>

          <!-- Referer Fallback -->
          <div class="security-group">
            <div class="security-header">
              <h3>Referer Fallback</h3>
              <label class="toggle-switch">
                <input type="checkbox" [(ngModel)]="securitySettings.defaultRefererFallbackEnabled" (change)="saveSecuritySettings()">
                <span class="slider"></span>
              </label>
            </div>
            <p class="security-description">Use Referer header as fallback when Origin header is missing. Helps with some browsers/apps.</p>
          </div>
        </div>

        <div class="error-message" *ngIf="securityError">{{ securityError }}</div>
      </section>

      <!-- Account Section -->
      <section class="settings-section">
        <h2 class="section-title">Account</h2>
        
        <div class="setting-row">
          <div class="setting-info">
            <h3>Log Out</h3>
            <p>Sign out of your account on this device.</p>
          </div>
          <button class="logout-btn" (click)="logout()">Log Out</button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .settings-page { max-width: 700px; }

    .page-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 24px 0;
    }

    .settings-section {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 8px 0;
    }

    .section-description {
      color: #6b7280;
      font-size: 0.9rem;
      margin: 0 0 20px 0;
    }

    .domains-list {
      margin-bottom: 16px;
    }

    .domain-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #f9fafb;
      border-radius: 8px;
      margin-bottom: 8px;
    }

    .domain-name {
      font-family: monospace;
      font-size: 0.9rem;
      color: #374151;
    }

    .remove-btn {
      padding: 6px;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      color: #9ca3af;
    }

    .remove-btn:hover {
      background: #fee2e2;
      color: #dc2626;
    }

    .empty-domains {
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .empty-domains p {
      margin: 0;
      color: #6b7280;
      font-size: 0.9rem;
    }

    .add-domain-form {
      display: flex;
      gap: 12px;
    }

    .add-domain-form input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.9rem;
    }

    .add-domain-form input:focus {
      outline: none;
      border-color: #22c55e;
    }

    .add-btn {
      padding: 10px 20px;
      background: #1f2937;
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      white-space: nowrap;
    }

    .add-btn:hover { background: #374151; }
    .add-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .error-message {
      color: #dc2626;
      font-size: 0.85rem;
      margin-top: 8px;
    }

    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 0;
    }

    .setting-info h3 {
      margin: 0 0 4px 0;
      font-size: 0.95rem;
      color: #1f2937;
    }

    .setting-info p {
      margin: 0;
      font-size: 0.85rem;
      color: #6b7280;
    }

    .logout-btn {
      padding: 10px 20px;
      background: #fee2e2;
      color: #dc2626;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
    }

    .logout-btn:hover { background: #fecaca; }

    .security-settings {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .security-group {
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .security-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .security-header h3 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: #1f2937;
    }

    .security-description {
      margin: 0 0 12px 0;
      font-size: 0.85rem;
      color: #6b7280;
    }

    .security-fields {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 12px;
    }

    .field-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .field-row label {
      min-width: 200px;
      font-size: 0.875rem;
      color: #374151;
    }

    .field-row input[type="number"] {
      width: 120px;
      padding: 8px 10px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.9rem;
    }

    .field-hint {
      font-size: 0.8rem;
      color: #9ca3af;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-switch .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: 0.2s;
      border-radius: 24px;
    }

    .toggle-switch .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.2s;
      border-radius: 50%;
    }

    .toggle-switch input:checked + .slider {
      background-color: #22c55e;
    }

    .toggle-switch input:checked + .slider:before {
      transform: translateX(20px);
    }

    .loading-state {
      padding: 20px;
      text-align: center;
      color: #6b7280;
    }
  `]
})
export class SettingsComponent implements OnInit {
  domains: WhitelistedDomain[] = [];
  loadingDomains = true;
  newDomain = '';
  addingDomain = false;
  domainError = '';

  securitySettings: SecuritySettings = {
    defaultRateLimitEnabled: true,
    defaultRateLimitMaxRequests: 10,
    defaultRateLimitWindowSeconds: 60,
    defaultRateLimitMaxRequestsPerHour: 50,
    defaultMinTimeBetweenSubmissionsEnabled: true,
    defaultMinTimeBetweenSubmissionsSeconds: 10,
    defaultMaxRequestSizeBytes: 100000,
    defaultRefererFallbackEnabled: true
  };
  loadingSecurity = true;
  savingSecurity = false;
  securityError = '';

  constructor(private orgService: OrganizationService) { }

  async ngOnInit() {
    await Promise.all([this.loadDomains(), this.loadSecuritySettings()]);
  }

  async loadSecuritySettings() {
    this.loadingSecurity = true;
    this.securityError = '';
    try {
      this.securitySettings = await this.orgService.getSecuritySettings();
    } catch (err: any) {
      this.securityError = err.message || 'Failed to load security settings';
      console.error('Failed to load security settings:', err);
    } finally {
      this.loadingSecurity = false;
    }
  }

  async saveSecuritySettings() {
    if (this.savingSecurity) return;
    this.savingSecurity = true;
    this.securityError = '';
    try {
      this.securitySettings = await this.orgService.updateSecuritySettings(this.securitySettings);
    } catch (err: any) {
      this.securityError = err.message || 'Failed to save security settings';
      console.error('Failed to save security settings:', err);
    } finally {
      this.savingSecurity = false;
    }
  }

  async loadDomains() {
    this.loadingDomains = true;
    try {
      this.domains = await this.orgService.getDomains();
    } catch (err) {
      console.error('Failed to load domains:', err);
    } finally {
      this.loadingDomains = false;
    }
  }

  async addDomain() {
    if (!this.newDomain) return;
    this.addingDomain = true;
    this.domainError = '';
    try {
      await this.orgService.addDomain(this.newDomain);
      this.newDomain = '';
      await this.loadDomains();
    } catch (err: any) {
      this.domainError = err.message;
    } finally {
      this.addingDomain = false;
    }
  }

  async removeDomain(domain: WhitelistedDomain) {
    if (!confirm(`Remove ${domain.domain} from whitelist?`)) return;
    try {
      await this.orgService.removeDomain(domain.id);
      await this.loadDomains();
    } catch (err: any) {
      alert(err.message);
    }
  }

  logout() {
    localStorage.removeItem('ff_jwt_token');
    localStorage.removeItem('ff_user_id');
    window.location.href = '/login';
  }
}
