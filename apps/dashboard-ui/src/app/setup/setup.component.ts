import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { fetchUrl } from '../global-vars';
import { OrgContextService } from '../services/org-context.service';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss']
})
export class SetupComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly orgContextService = inject(OrgContextService);
  
  email = '';
  password = '';
  name = '';
  organizationName = '';
  organizationSlug = '';
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);
  isCheckingSetup = signal(true);

  private readonly TOKEN_STORAGE_KEY = 'FB_jwt_token';
  private readonly USER_ID_KEY = 'FB_user_id';

  async ngOnInit(): Promise<void> {
    // Check if setup is needed
    await this.checkSetupStatus();
  }

  async checkSetupStatus(): Promise<void> {
    try {
      const response = await fetch(`${fetchUrl}/setup`);
      const data = await response.json();

      if (!data.setupNeeded) {
        // Setup already completed, redirect to login
        void this.router.navigate(['/login']);
        return;
      }

      this.isCheckingSetup.set(false);
    } catch (error) {
      console.error('Error checking setup status:', error);
      this.errorMessage.set('Failed to check setup status. Please refresh the page.');
      this.isCheckingSetup.set(false);
    }
  }

  generateSlugFromName(): void {
    if (!this.organizationName) {
      this.organizationSlug = '';
      return;
    }

    // Convert to lowercase, replace spaces with hyphens, remove special characters
    this.organizationSlug = this.organizationName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async completeSetup(): Promise<void> {
    if (!this.email || !this.password || !this.organizationName || !this.organizationSlug) {
      this.errorMessage.set('Please fill in all required fields');
      return;
    }

    if (this.password.length < 8) {
      this.errorMessage.set('Password must be at least 8 characters');
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(this.organizationSlug)) {
      this.errorMessage.set('Organization slug can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const response = await fetch(`${fetchUrl}/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: this.email,
          password: this.password,
          name: this.name || null,
          organizationName: this.organizationName,
          organizationSlug: this.organizationSlug,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.errorMessage.set(data.error || 'Setup failed');
        return;
      }

      // Store auth data (setup returns a token for automatic login)
      if (data.token && data.user?.id) {
        localStorage.setItem(this.TOKEN_STORAGE_KEY, data.token);
        localStorage.setItem(this.USER_ID_KEY, data.user.id.toString());

        // Set organization context for the super admin
        if (data.organization?.id) {
          this.orgContextService.setSelectedOrgId(data.organization.id);
        }
      }

      // Navigate to dashboard
      void this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Setup error:', error);
      this.errorMessage.set('Setup failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
