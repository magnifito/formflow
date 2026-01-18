import { Injectable } from '@angular/core';
import { fetchUrl } from '../global-vars';

export interface Organization {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  maxForms: number | null;
  maxSubmissionsPerMonth: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  organizationId: number | null;
  role: 'member' | 'org_admin';
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  organization?: Organization;
}

export interface AdminStats {
  organizations: {
    total: number;
    active: number;
    inactive: number;
  };
  users: {
    total: number;
  };
  forms: {
    total: number;
  };
  submissions: {
    total: number;
    last30Days: number;
  };
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

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly TOKEN_KEY = 'FB_jwt_token';

  private getHeaders(): HeadersInit {
    const token = localStorage.getItem(this.TOKEN_KEY);
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async getStats(): Promise<AdminStats> {
    const response = await fetch(`${fetchUrl}/admin/stats`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }

  async getOrganizations(page = 1, limit = 20): Promise<PaginatedResponse<Organization>> {
    const response = await fetch(`${fetchUrl}/admin/organizations?page=${page}&limit=${limit}`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch organizations');
    return response.json();
  }

  async getOrganization(id: number): Promise<Organization & { stats: any }> {
    const response = await fetch(`${fetchUrl}/admin/organizations/${id}`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch organization');
    return response.json();
  }

  async createOrganization(data: { name: string; slug: string; maxForms?: number; maxSubmissionsPerMonth?: number }): Promise<Organization> {
    const response = await fetch(`${fetchUrl}/admin/organizations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create organization');
    }
    return response.json();
  }

  async updateOrganization(id: number, data: Partial<Organization>): Promise<Organization> {
    const response = await fetch(`${fetchUrl}/admin/organizations/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update organization');
    return response.json();
  }

  async deactivateOrganization(id: number): Promise<void> {
    const response = await fetch(`${fetchUrl}/admin/organizations/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to deactivate organization');
  }

  async getUsers(page = 1, limit = 20): Promise<PaginatedResponse<User>> {
    const response = await fetch(`${fetchUrl}/admin/users?page=${page}&limit=${limit}`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  }

  async toggleSuperAdmin(userId: number, isSuperAdmin: boolean): Promise<void> {
    const response = await fetch(`${fetchUrl}/admin/users/${userId}/super-admin`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ isSuperAdmin })
    });
    if (!response.ok) throw new Error('Failed to update super admin status');
  }

  async getSubmissions(page = 1, limit = 50, orgId?: number, formId?: number): Promise<PaginatedResponse<any>> {
    let url = `${fetchUrl}/admin/submissions?page=${page}&limit=${limit}`;
    if (orgId) url += `&orgId=${orgId}`;
    if (formId) url += `&formId=${formId}`;

    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch submissions');
    return response.json();
  }

  async createUser(data: {
    email: string;
    password: string;
    name?: string;
    organizationId: number;
    role: 'member' | 'org_admin';
  }): Promise<User> {
    const response = await fetch(`${fetchUrl}/admin/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create user');
    }
    return response.json();
  }

  async getAllOrganizations(): Promise<Organization[]> {
    // Get all organizations without pagination for dropdown
    const response = await fetch(`${fetchUrl}/admin/organizations?limit=1000`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch organizations');
    const result: PaginatedResponse<Organization> = await response.json();
    return result.data;
  }

  async suspendUser(userId: number, isActive: boolean): Promise<void> {
    const response = await fetch(`${fetchUrl}/admin/users/${userId}/suspend`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ isActive })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to suspend user');
    }
  }

  async deleteUser(userId: number): Promise<void> {
    const response = await fetch(`${fetchUrl}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete user');
    }
  }
}
