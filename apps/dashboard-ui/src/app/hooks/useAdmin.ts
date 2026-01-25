import { useState, useCallback } from 'react';
import { apiFetch } from '../../lib/api';

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
    organizations: { total: number; active: number };
    users: { total: number };
    forms: { total: number };
    submissions: { total: number; last30Days: number };
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

export function useAdmin() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [organizations, setOrganizations] = useState<PaginatedResponse<Organization> | null>(null);
    const [users, setUsers] = useState<PaginatedResponse<User> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadStats = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch<AdminStats>('/admin/stats');
            setStats(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadOrganizations = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const data = await apiFetch<PaginatedResponse<Organization>>(`/admin/organizations?page=${page}&limit=20`);
            setOrganizations(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createOrganization = async (data: { name: string; slug: string }) => {
        try {
            await apiFetch('/admin/organizations', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            await loadOrganizations();
        } catch (err: any) {
            throw new Error(err.message);
        }
    };

    const updateOrganization = async (id: number, data: Partial<Organization>) => {
        try {
            await apiFetch(`/admin/organizations/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            setOrganizations(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    data: prev.data.map(org => org.id === id ? { ...org, ...data } : org)
                };
            });
        } catch (err: any) {
            throw new Error(err.message);
        }
    };

    const loadUsers = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const data = await apiFetch<PaginatedResponse<User>>(`/admin/users?page=${page}&limit=20`);
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createUser = async (data: any) => {
        try {
            await apiFetch('/admin/users', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            await loadUsers();
        } catch (err: any) {
            throw new Error(err.message);
        }
    };

    const suspendUser = async (id: number, isActive: boolean) => {
        try {
            await apiFetch(`/admin/users/${id}/suspend`, {
                method: 'PUT',
                body: JSON.stringify({ isActive })
            });
            setUsers(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    data: prev.data.map(u => u.id === id ? { ...u, isActive } : u)
                };
            });
        } catch (err: any) {
            throw new Error(err.message);
        }
    };

    const toggleSuperAdmin = async (id: number, isSuperAdmin: boolean) => {
        try {
            await apiFetch(`/admin/users/${id}/super-admin`, {
                method: 'PUT',
                body: JSON.stringify({ isSuperAdmin })
            });
            setUsers(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    data: prev.data.map(u => u.id === id ? { ...u, isSuperAdmin } : u)
                };
            });
        } catch (err: any) {
            throw new Error(err.message);
        }
    };

    const deleteUser = async (id: number) => {
        try {
            await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
            setUsers(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    data: prev.data.filter(u => u.id !== id),
                    pagination: { ...prev.pagination, total: prev.pagination.total - 1 }
                };
            });
        } catch (err: any) {
            throw new Error(err.message);
        }
    };

    const loadGlobalSubmissions = useCallback(async (page = 1, orgId?: number | null) => {
        setLoading(true);
        try {
            let url = `/admin/submissions?page=${page}&limit=50`;
            if (orgId) url += `&orgId=${orgId}`;
            const data = await apiFetch<PaginatedResponse<any>>(url);
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const loadAllForms = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const data = await apiFetch<PaginatedResponse<any>>(`/admin/forms?page=${page}&limit=20`);
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const createSystemForm = async (data: { name: string; slug?: string; description?: string; organizationId: number | null }) => {
        try {
            await apiFetch('/org/forms', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        } catch (err: any) {
            throw new Error(err.message);
        }
    };

    return {
        stats, organizations, users, loading, error,
        loadStats, loadOrganizations, createOrganization, updateOrganization,
        loadUsers, createUser, suspendUser, deleteUser, loadGlobalSubmissions, toggleSuperAdmin,
        loadAllForms, createSystemForm
    };
}
