import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchComponent } from '../../shared/components/toggle-switch.component';
import { OrganizationService, OrganizationIntegration } from '../../services/organization.service';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardInputDirective } from '@/shared/components/input';

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule, FormsModule, ToggleSwitchComponent, ZardCardComponent, ZardInputDirective],
  template: `
    <div class="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div class="space-y-1">
        <h1 class="text-3xl font-display font-bold text-foreground">Integrations</h1>
        <p class="text-muted-foreground">Configure where your form submissions are sent.</p>
      </div>

      <div class="flex justify-center py-12" *ngIf="loading">
         <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <div class="grid gap-6" *ngIf="!loading && integrations">
        <!-- Email -->
        <z-card class="glass-card border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
          <div class="flex items-start gap-5">
            <div class="h-12 w-12 rounded-xl bg-linear-to-br from-blue-500/10 to-indigo-500/10 text-blue-500 flex items-center justify-center text-2xl border border-blue-500/20 shrink-0">
              📧
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-2">
                 <div class="space-y-0.5">
                   <h3 class="text-lg font-semibold text-foreground">Email Notifications</h3>
                   <p class="text-sm text-muted-foreground">Send submissions to email addresses</p>
                 </div>
                 <app-toggle-switch
                  [checked]="integrations.emailEnabled"
                  (change)="updateIntegration('emailEnabled', $event)"
                ></app-toggle-switch>
              </div>
              
              <div class="animate-in slide-in-from-top-2 duration-300" *ngIf="integrations.emailEnabled">
                <div class="pt-4 mt-2 border-t border-border/50">
                  <label class="text-sm font-medium mb-2 block">Recipients (comma-separated)</label>
                  <input 
                    z-input
                    type="text" 
                    [(ngModel)]="integrations.emailRecipients" 
                    (blur)="updateIntegration('emailRecipients', integrations.emailRecipients)"
                    placeholder="email@example.com, team@example.com"
                  >
                </div>
              </div>
            </div>
          </div>
        </z-card>

        <!-- Discord -->
        <z-card class="glass-card border-border/50 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5">
          <div class="flex items-start gap-5">
            <div class="h-12 w-12 rounded-xl bg-linear-to-br from-indigo-500/10 to-purple-500/10 text-indigo-500 flex items-center justify-center text-2xl border border-indigo-500/20 shrink-0">
              💬
            </div>
            <div class="flex-1 min-w-0">
               <div class="flex items-center justify-between mb-2">
                 <div class="space-y-0.5">
                   <h3 class="text-lg font-semibold text-foreground">Discord</h3>
                   <p class="text-sm text-muted-foreground">Post submissions to a Discord channel</p>
                 </div>
                  <app-toggle-switch
                    [checked]="integrations.discordEnabled"
                    (change)="updateIntegration('discordEnabled', $event)"
                  ></app-toggle-switch>
               </div>

              <div class="animate-in slide-in-from-top-2 duration-300" *ngIf="integrations.discordEnabled">
                 <div class="pt-4 mt-2 border-t border-border/50">
                  <label class="text-sm font-medium mb-2 block">Webhook URL</label>
                  <input 
                    z-input
                    type="text" 
                    [(ngModel)]="integrations.discordWebhook" 
                    (blur)="updateIntegration('discordWebhook', integrations.discordWebhook)"
                    placeholder="https://discord.com/api/webhooks/..."
                  >
                </div>
              </div>
            </div>
          </div>
        </z-card>

        <!-- Telegram -->
        <z-card class="glass-card border-border/50 transition-all duration-300 hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-500/5">
            <div class="flex items-start gap-5">
            <div class="h-12 w-12 rounded-xl bg-linear-to-br from-sky-500/10 to-blue-500/10 text-sky-500 flex items-center justify-center text-2xl border border-sky-500/20 shrink-0">
              ✈️
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-2">
                 <div class="space-y-0.5">
                   <h3 class="text-lg font-semibold text-foreground">Telegram</h3>
                   <p class="text-sm text-muted-foreground">Send submissions to Telegram</p>
                 </div>
                  <app-toggle-switch
                    [checked]="integrations.telegramEnabled"
                    (change)="updateIntegration('telegramEnabled', $event)"
                  ></app-toggle-switch>
               </div>
              <div class="animate-in slide-in-from-top-2 duration-300" *ngIf="integrations.telegramEnabled">
                <div class="pt-4 mt-2 border-t border-border/50">
                     <p class="text-sm text-yellow-600 dark:text-yellow-400">Configure Telegram from the main settings.</p>
                </div>
              </div>
            </div>
          </div>
        </z-card>

        <!-- Slack -->
        <z-card class="glass-card border-border/50 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5">
            <div class="flex items-start gap-5">
            <div class="h-12 w-12 rounded-xl bg-linear-to-br from-emerald-500/10 to-teal-500/10 text-emerald-500 flex items-center justify-center text-2xl border border-emerald-500/20 shrink-0">
              #
            </div>
             <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-2">
                 <div class="space-y-0.5">
                   <h3 class="text-lg font-semibold text-foreground">Slack</h3>
                   <p class="text-sm text-muted-foreground">Post to a Slack channel</p>
                 </div>
                   <app-toggle-switch
                    [checked]="integrations.slackEnabled"
                    (change)="updateIntegration('slackEnabled', $event)"
                  ></app-toggle-switch>
               </div>
              <div class="animate-in slide-in-from-top-2 duration-300" *ngIf="integrations.slackEnabled">
                 <div class="pt-4 mt-2 border-t border-border/50">
                  <label class="text-sm font-medium mb-2 block">Channel ID</label>
                  <input 
                    z-input
                    type="text" 
                    [(ngModel)]="integrations.slackChannelId" 
                    (blur)="updateIntegration('slackChannelId', integrations.slackChannelId)"
                    placeholder="C0123456789"
                  >
                </div>
              </div>
            </div>
          </div>
        </z-card>

        <!-- Make.com -->
        <z-card class="glass-card border-border/50 transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5">
           <div class="flex items-start gap-5">
            <div class="h-12 w-12 rounded-xl bg-linear-to-br from-purple-500/10 to-pink-500/10 text-purple-500 flex items-center justify-center text-xl border border-purple-500/20 shrink-0">
               <span class="font-bold">M</span>
            </div>
            <div class="flex-1 min-w-0">
               <div class="flex items-center justify-between mb-2">
                 <div class="space-y-0.5">
                   <h3 class="text-lg font-semibold text-foreground">Make.com</h3>
                   <p class="text-sm text-muted-foreground">Trigger Make.com scenarios</p>
                 </div>
                  <app-toggle-switch
                    [checked]="integrations.makeEnabled"
                    (change)="updateIntegration('makeEnabled', $event)"
                  ></app-toggle-switch>
               </div>
              <div class="animate-in slide-in-from-top-2 duration-300" *ngIf="integrations.makeEnabled">
                <div class="pt-4 mt-2 border-t border-border/50">
                  <label class="text-sm font-medium mb-2 block">Webhook URL</label>
                  <input 
                    z-input
                    type="text" 
                    [(ngModel)]="integrations.makeWebhook" 
                    (blur)="updateIntegration('makeWebhook', integrations.makeWebhook)"
                    placeholder="https://hook.make.com/..."
                  >
                </div>
              </div>
            </div>
          </div>
        </z-card>

        <!-- n8n -->
         <z-card class="glass-card border-border/50 transition-all duration-300 hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/5">
             <div class="flex items-start gap-5">
            <div class="h-12 w-12 rounded-xl bg-linear-to-br from-pink-500/10 to-rose-500/10 text-pink-500 flex items-center justify-center text-xl border border-pink-500/20 shrink-0">
              <span class="font-bold">n8n</span>
            </div>
           <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-2">
                 <div class="space-y-0.5">
                   <h3 class="text-lg font-semibold text-foreground">n8n</h3>
                   <p class="text-sm text-muted-foreground">Trigger n8n workflows</p>
                 </div>
                   <app-toggle-switch
                    [checked]="integrations.n8nEnabled"
                    (change)="updateIntegration('n8nEnabled', $event)"
                  ></app-toggle-switch>
               </div>
              <div class="animate-in slide-in-from-top-2 duration-300" *ngIf="integrations.n8nEnabled">
                 <div class="pt-4 mt-2 border-t border-border/50">
                  <label class="text-sm font-medium mb-2 block">Webhook URL</label>
                  <input 
                    z-input
                    type="text" 
                    [(ngModel)]="integrations.n8nWebhook" 
                    (blur)="updateIntegration('n8nWebhook', integrations.n8nWebhook)"
                    placeholder="https://your-n8n.com/webhook/..."
                  >
                </div>
              </div>
            </div>
          </div>
        </z-card>

        <!-- Custom Webhook -->
        <z-card class="glass-card border-border/50 transition-all duration-300 hover:border-gray-500/50 hover:shadow-lg hover:shadow-gray-500/5">
            <div class="flex items-start gap-5">
            <div class="h-12 w-12 rounded-xl bg-linear-to-br from-gray-500/10 to-slate-500/10 text-foreground flex items-center justify-center text-2xl border border-gray-500/20 shrink-0">
              🌐
            </div>
            <div class="flex-1 min-w-0">
               <div class="flex items-center justify-between mb-2">
                 <div class="space-y-0.5">
                   <h3 class="text-lg font-semibold text-foreground">Custom Webhook</h3>
                   <p class="text-sm text-muted-foreground">Send to any webhook URL</p>
                 </div>
                 <app-toggle-switch
                    [checked]="integrations.webhookEnabled"
                    (change)="updateIntegration('webhookEnabled', $event)"
                  ></app-toggle-switch>
               </div>
              <div class="animate-in slide-in-from-top-2 duration-300" *ngIf="integrations.webhookEnabled">
                  <div class="pt-4 mt-2 border-t border-border/50">
                  <label class="text-sm font-medium mb-2 block">Webhook URL</label>
                  <input 
                    z-input
                    type="text" 
                    [(ngModel)]="integrations.webhookUrl" 
                    (blur)="updateIntegration('webhookUrl', integrations.webhookUrl)"
                    placeholder="https://your-api.com/webhook"
                  >
                </div>
              </div>
            </div>
          </div>
        </z-card>
      </div>

      <div class="fixed bottom-6 right-6 animate-in slide-in-from-bottom-5 fade-in duration-300" *ngIf="saving">
           <div class="bg-foreground text-background px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
                <div class="h-3 w-3 rounded-full border-2 border-background/30 border-t-background animate-spin"></div>
                Saving...
            </div>
      </div>
    </div>
  `,
  styles: []
})
export class IntegrationsComponent implements OnInit {
  integrations: OrganizationIntegration | null = null;
  loading = true;
  saving = false;

  constructor(private orgService: OrganizationService) { }

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
