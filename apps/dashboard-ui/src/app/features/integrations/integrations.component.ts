import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchComponent } from '../../shared/components/toggle-switch.component';
import { OrganizationService, OrganizationIntegration } from '../../services/organization.service';

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule, FormsModule, ToggleSwitchComponent],
  template: `
    <div class="integrations-page">
      <h1 class="page-title">Integrations</h1>
      <p class="page-description">Configure where your form submissions are sent.</p>

      <div class="loading" *ngIf="loading">Loading integrations...</div>

      <div class="integrations-grid" *ngIf="!loading && integrations">
        <!-- Email -->
        <div class="integration-card">
          <div class="integration-header">
            <div class="integration-icon">📧</div>
            <div class="integration-info">
              <h3>Email Notifications</h3>
              <p>Send submissions to email addresses</p>
            </div>
            <app-toggle-switch
              [checked]="integrations.emailEnabled"
              (change)="updateIntegration('emailEnabled', $event)"
            ></app-toggle-switch>
          </div>
          <div class="integration-config" *ngIf="integrations.emailEnabled">
            <div class="form-group">
              <label>Recipients (comma-separated)</label>
              <input 
                type="text" 
                [(ngModel)]="integrations.emailRecipients" 
                (blur)="updateIntegration('emailRecipients', integrations.emailRecipients)"
                placeholder="email@example.com, team@example.com"
              >
            </div>
          </div>
        </div>

        <!-- Discord -->
        <div class="integration-card">
          <div class="integration-header">
            <div class="integration-icon">💬</div>
            <div class="integration-info">
              <h3>Discord</h3>
              <p>Post submissions to a Discord channel</p>
            </div>
            <app-toggle-switch
              [checked]="integrations.discordEnabled"
              (change)="updateIntegration('discordEnabled', $event)"
            ></app-toggle-switch>
          </div>
          <div class="integration-config" *ngIf="integrations.discordEnabled">
            <div class="form-group">
              <label>Webhook URL</label>
              <input 
                type="text" 
                [(ngModel)]="integrations.discordWebhook" 
                (blur)="updateIntegration('discordWebhook', integrations.discordWebhook)"
                placeholder="https://discord.com/api/webhooks/..."
              >
            </div>
          </div>
        </div>

        <!-- Telegram -->
        <div class="integration-card">
          <div class="integration-header">
            <div class="integration-icon">✈️</div>
            <div class="integration-info">
              <h3>Telegram</h3>
              <p>Send submissions to Telegram</p>
            </div>
            <app-toggle-switch
              [checked]="integrations.telegramEnabled"
              (change)="updateIntegration('telegramEnabled', $event)"
            ></app-toggle-switch>
          </div>
          <div class="integration-config" *ngIf="integrations.telegramEnabled">
            <p class="config-note">Configure Telegram from the main settings.</p>
          </div>
        </div>

        <!-- Slack -->
        <div class="integration-card">
          <div class="integration-header">
            <div class="integration-icon">#</div>
            <div class="integration-info">
              <h3>Slack</h3>
              <p>Post to a Slack channel</p>
            </div>
            <app-toggle-switch
              [checked]="integrations.slackEnabled"
              (change)="updateIntegration('slackEnabled', $event)"
            ></app-toggle-switch>
          </div>
          <div class="integration-config" *ngIf="integrations.slackEnabled">
            <div class="form-group">
              <label>Channel ID</label>
              <input 
                type="text" 
                [(ngModel)]="integrations.slackChannelId" 
                (blur)="updateIntegration('slackChannelId', integrations.slackChannelId)"
                placeholder="C0123456789"
              >
            </div>
          </div>
        </div>

        <!-- Make.com -->
        <div class="integration-card">
          <div class="integration-header">
            <div class="integration-icon">⚡</div>
            <div class="integration-info">
              <h3>Make.com</h3>
              <p>Trigger Make.com scenarios</p>
            </div>
            <app-toggle-switch
              [checked]="integrations.makeEnabled"
              (change)="updateIntegration('makeEnabled', $event)"
            ></app-toggle-switch>
          </div>
          <div class="integration-config" *ngIf="integrations.makeEnabled">
            <div class="form-group">
              <label>Webhook URL</label>
              <input 
                type="text" 
                [(ngModel)]="integrations.makeWebhook" 
                (blur)="updateIntegration('makeWebhook', integrations.makeWebhook)"
                placeholder="https://hook.make.com/..."
              >
            </div>
          </div>
        </div>

        <!-- n8n -->
        <div class="integration-card">
          <div class="integration-header">
            <div class="integration-icon">🔗</div>
            <div class="integration-info">
              <h3>n8n</h3>
              <p>Trigger n8n workflows</p>
            </div>
            <app-toggle-switch
              [checked]="integrations.n8nEnabled"
              (change)="updateIntegration('n8nEnabled', $event)"
            ></app-toggle-switch>
          </div>
          <div class="integration-config" *ngIf="integrations.n8nEnabled">
            <div class="form-group">
              <label>Webhook URL</label>
              <input 
                type="text" 
                [(ngModel)]="integrations.n8nWebhook" 
                (blur)="updateIntegration('n8nWebhook', integrations.n8nWebhook)"
                placeholder="https://your-n8n.com/webhook/..."
              >
            </div>
          </div>
        </div>

        <!-- Custom Webhook -->
        <div class="integration-card">
          <div class="integration-header">
            <div class="integration-icon">🌐</div>
            <div class="integration-info">
              <h3>Custom Webhook</h3>
              <p>Send to any webhook URL</p>
            </div>
            <app-toggle-switch
              [checked]="integrations.webhookEnabled"
              (change)="updateIntegration('webhookEnabled', $event)"
            ></app-toggle-switch>
          </div>
          <div class="integration-config" *ngIf="integrations.webhookEnabled">
            <div class="form-group">
              <label>Webhook URL</label>
              <input 
                type="text" 
                [(ngModel)]="integrations.webhookUrl" 
                (blur)="updateIntegration('webhookUrl', integrations.webhookUrl)"
                placeholder="https://your-api.com/webhook"
              >
            </div>
          </div>
        </div>
      </div>

      <div class="save-indicator" *ngIf="saving">Saving...</div>
    </div>
  `,
  styles: [`
    .integrations-page { max-width: 900px; }

    .page-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 8px 0;
    }

    .page-description {
      color: #6b7280;
      margin: 0 0 24px 0;
    }

    .loading {
      text-align: center;
      padding: 48px;
      color: #6b7280;
    }

    .integrations-grid {
      display: grid;
      gap: 16px;
    }

    .integration-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }

    .integration-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
    }

    .integration-icon {
      width: 48px;
      height: 48px;
      background: #f3f4f6;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    .integration-info {
      flex: 1;
    }

    .integration-info h3 {
      margin: 0 0 4px 0;
      font-size: 1rem;
      font-weight: 600;
      color: #1f2937;
    }

    .integration-info p {
      margin: 0;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .integration-config {
      padding: 0 20px 20px 20px;
      border-top: 1px solid #f3f4f6;
      margin-top: -1px;
      padding-top: 16px;
    }

    .form-group {
      margin-bottom: 12px;
    }

    .form-group:last-child { margin-bottom: 0; }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      color: #374151;
    }

    .form-group input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.9rem;
    }

    .form-group input:focus {
      outline: none;
      border-color: #22c55e;
    }

    .config-note {
      font-size: 0.85rem;
      color: #6b7280;
      margin: 0;
    }

    .save-indicator {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1f2937;
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 0.9rem;
    }
  `]
})
export class IntegrationsComponent implements OnInit {
  integrations: OrganizationIntegration | null = null;
  loading = true;
  saving = false;

  constructor(private orgService: OrganizationService) {}

  async ngOnInit() {
    await this.loadIntegrations();
  }

  async loadIntegrations() {
    this.loading = true;
    try {
      this.integrations = await this.orgService.getIntegrations();
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      this.loading = false;
    }
  }

  async updateIntegration(field: string, value: any) {
    if (!this.integrations) return;
    this.saving = true;
    try {
      await this.orgService.updateIntegrations({ [field]: value });
    } catch (err) {
      console.error('Failed to update integration:', err);
    } finally {
      setTimeout(() => this.saving = false, 500);
    }
  }
}
