import { Injectable } from '@angular/core';
import { fetchUrl } from '../global-vars';
import { OrgContextService } from './org-context.service';

export interface Form {
  id: number;
  organizationId: number | null;
  name: string;
  description: string | null;
  submitHash: string;
  isActive: boolean;
  useOrgIntegrations: boolean;
  useOrgSecuritySettings?: boolean;
  rateLimitEnabled?: boolean;
  rateLimitMaxRequests?: number | null;
  rateLimitWindowSeconds?: number | null;
  rateLimitMaxRequestsPerHour?: number | null;
  minTimeBetweenSubmissionsEnabled?: boolean;
  minTimeBetweenSubmissionsSeconds?: number | null;
  maxRequestSizeBytes?: number | null;
  refererFallbackEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  submissionCount?: number;
}

export interface WhitelistedDomain {
  id: number;
  organizationId: number;
  domain: string;
  createdAt: string;
}

export interface OrganizationIntegration {
  id: number;
  organizationId: number;
  emailEnabled: boolean;
  emailRecipients: string | null;
  returnEmailEnabled: boolean;
  emailSubject: string | null;
  emailBody: string | null;
  telegramEnabled: boolean;
  telegramChatId: number | null;
  discordEnabled: boolean;
  discordWebhook: string | null;
  makeEnabled: boolean;
  makeWebhook: string | null;
  n8nEnabled: boolean;
  n8nWebhook: string | null;
  webhookEnabled: boolean;
  webhookUrl: string | null;
  slackEnabled: boolean;
  slackChannelId: string | null;
}

export interface Submission {
  id: number;
  formId: number;
  data: Record<string, any>;
  originDomain: string | null;
  ipAddress: string | null;
  createdAt: string;
  form?: Form;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrgStats {
  formCount: number;
  submissionsThisMonth: number;
  submissionLimit: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private readonly TOKEN_KEY = 'ff_jwt_token';

  constructor(private orgContextService: OrgContextService) { }

  private getHeaders(): HeadersInit {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // Add organization context header for super admins
    const selectedOrgId = this.orgContextService.getSelectedOrgId();
    if (selectedOrgId !== null) {
      headers['X-Organization-Context'] = selectedOrgId.toString();
    }

    return headers;
  }

  // Stats
  async getStats(): Promise<OrgStats> {
    const response = await fetch(`${fetchUrl}/org/stats`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }

  // Forms
  async getForms(): Promise<Form[]> {
    const response = await fetch(`${fetchUrl}/org/forms`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch forms');
    return response.json();
  }

  async getForm(id: number): Promise<Form> {
    const response = await fetch(`${fetchUrl}/org/forms/${id}`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch form');
    return response.json();
  }

  async createForm(data: { name: string; description?: string; useOrgIntegrations?: boolean }): Promise<Form> {
    const headers = this.getHeaders();
    console.log('Creating form with headers:', headers);
    console.log('POST to:', `${fetchUrl}/org/forms`);
    console.log('Body:', data);

    const response = await fetch(`${fetchUrl}/org/forms`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      let errorMessage = 'Failed to create form';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
        console.error('Server error response:', error);
      } catch (e) {
        console.error('Could not parse error response:', e);
      }
      throw new Error(errorMessage);
    }
    return response.json();
  }

  async updateForm(id: number, data: Partial<Form>): Promise<Form> {
    const response = await fetch(`${fetchUrl}/org/forms/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update form');
    return response.json();
  }

  async deleteForm(id: number): Promise<void> {
    const response = await fetch(`${fetchUrl}/org/forms/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete form');
  }

  async regenerateFormHash(id: number): Promise<{ submitHash: string }> {
    const response = await fetch(`${fetchUrl}/org/forms/${id}/regenerate-hash`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to regenerate hash');
    return response.json();
  }

  // Domains
  async getDomains(): Promise<WhitelistedDomain[]> {
    const response = await fetch(`${fetchUrl}/org/domains`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch domains');
    return response.json();
  }

  async addDomain(domain: string): Promise<WhitelistedDomain> {
    const response = await fetch(`${fetchUrl}/org/domains`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ domain })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add domain');
    }
    return response.json();
  }

  async removeDomain(id: number): Promise<void> {
    const response = await fetch(`${fetchUrl}/org/domains/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to remove domain');
  }

  // Integrations
  async getIntegrations(): Promise<OrganizationIntegration> {
    const response = await fetch(`${fetchUrl}/org/integrations`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch integrations');
    return response.json();
  }

  async updateIntegrations(data: Partial<OrganizationIntegration>): Promise<OrganizationIntegration> {
    const response = await fetch(`${fetchUrl}/org/integrations`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update integrations');
    return response.json();
  }

  // Security Settings
  async getSecuritySettings(): Promise<SecuritySettings> {
    const response = await fetch(`${fetchUrl}/org/security-settings`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch security settings');
    return response.json();
  }

  async updateSecuritySettings(data: Partial<SecuritySettings>): Promise<SecuritySettings> {
    const response = await fetch(`${fetchUrl}/org/security-settings`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update security settings');
    return response.json();
  }

  // Submissions
  async getSubmissions(page = 1, limit = 50, formId?: number): Promise<PaginatedResponse<Submission>> {
    let url = `${fetchUrl}/org/submissions?page=${page}&limit=${limit}`;
    if (formId) url += `&formId=${formId}`;

    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch submissions');
    return response.json();
  }
}

export interface SecuritySettings {
  defaultRateLimitEnabled: boolean;
  defaultRateLimitMaxRequests: number | null;
  defaultRateLimitWindowSeconds: number | null;
  defaultRateLimitMaxRequestsPerHour: number | null;
  defaultMinTimeBetweenSubmissionsEnabled: boolean;
  defaultMinTimeBetweenSubmissionsSeconds: number | null;
  defaultMaxRequestSizeBytes: number | null;
  defaultRefererFallbackEnabled: boolean;
}
