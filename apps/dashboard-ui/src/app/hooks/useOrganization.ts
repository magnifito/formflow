import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../lib/api';
import { useOrganizationContext } from './useOrganizationContext';

export interface Form {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    submitHash: string;
    isActive: boolean;
    useOrgSecuritySettings: boolean;
    rateLimitEnabled: boolean;
    rateLimitMaxRequests: number;
    rateLimitWindowSeconds: number;
    rateLimitMaxRequestsPerHour: number;
    minTimeBetweenSubmissionsEnabled: boolean;
    minTimeBetweenSubmissionsSeconds: number;
    maxRequestSizeBytes: number;
    refererFallbackEnabled: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Organization {
    id: number;
    name: string;
    slug: string;
    isActive: boolean;
}

export interface OrgStats {
    formCount: number;
    submissionsThisMonth: number;
    submissionLimit: number | null;
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

export interface OrganizationIntegration {
    emailEnabled: boolean;
    emailRecipients: string | null;
    discordEnabled: boolean;
    discordWebhook: string | null;
    telegramEnabled: boolean;
    slackEnabled: boolean;
    slackChannelId: string | null;
    makeEnabled: boolean;
    makeWebhook: string | null;
    n8nEnabled: boolean;
    n8nWebhook: string | null;
    webhookEnabled: boolean;
    webhookUrl: string | null;
}

export interface WhitelistedDomain {
    id: number;
    domain: string;
}

export interface SecuritySettings {
    defaultRateLimitEnabled: boolean;
    defaultRateLimitMaxRequests: number;
    defaultRateLimitWindowSeconds: number;
    defaultRateLimitMaxRequestsPerHour: number;
    defaultMinTimeBetweenSubmissionsEnabled: boolean;
    defaultMinTimeBetweenSubmissionsSeconds: number;
    defaultMaxRequestSizeBytes: number;
    defaultRefererFallbackEnabled: boolean;
}

export interface ReturnSettings {
    smtpHost?: string;
    smtpPort?: number;
    smtpUsername?: string;
    smtpPassword?: string;
    emailSubject?: string;
    emailBody?: string;
    returnMessage: boolean;
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

export function useOrganization() {
    const { selectedOrgId } = useOrganizationContext();
    const [forms, setForms] = useState<Form[]>([]);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [stats, setStats] = useState<OrgStats | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [integrations, setIntegrations] = useState<OrganizationIntegration | null>(null);
    const [domains, setDomains] = useState<WhitelistedDomain[]>([]);
    const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
    const [pagination, setPagination] = useState<PaginatedResponse<any>['pagination'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [formsData, statsData, orgData] = await Promise.all([
                apiFetch<Form[]>('/org/forms'),
                apiFetch<OrgStats>('/org/stats').catch(() => ({ formCount: 0, submissionsThisMonth: 0, submissionLimit: null })),
                apiFetch<Organization>('/org/current').catch(() => null)
            ]);
            setForms(formsData);
            setStats(statsData);
            setOrganization(orgData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadSubmissions = useCallback(async (page = 1, formId?: number | null) => {
        setLoading(true);
        try {
            let url = `/org/submissions?page=${page}&limit=50`;
            if (formId) url += `&formId=${formId}`;
            const response = await apiFetch<PaginatedResponse<Submission>>(url);
            setSubmissions(response.data);
            setPagination(response.pagination);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadIntegrations = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch<OrganizationIntegration>('/org/integrations');
            setIntegrations(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateIntegrations = async (updates: Partial<OrganizationIntegration>) => {
        try {
            await apiFetch('/org/integrations', {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            setIntegrations(prev => prev ? { ...prev, ...updates } : null);
        } catch (err: any) {
            console.error('Failed to update integrations:', err);
        }
    };

    const loadDomains = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch<WhitelistedDomain[]>('/org/domains');
            setDomains(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const addDomain = async (domain: string) => {
        try {
            await apiFetch('/org/domains', {
                method: 'POST',
                body: JSON.stringify({ domain })
            });
            await loadDomains();
        } catch (err: any) {
            throw new Error(err.message);
        }
    };

    const removeDomain = async (id: number) => {
        try {
            await apiFetch(`/org/domains/${id}`, { method: 'DELETE' });
            setDomains(prev => prev.filter(d => d.id !== id));
        } catch (err: any) {
            throw new Error(err.message);
        }
    };

    const loadSecuritySettings = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch<SecuritySettings>('/org/security-settings');
            setSecuritySettings(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateSecuritySettings = async (settings: SecuritySettings) => {
        try {
            const data = await apiFetch<SecuritySettings>('/org/security-settings', {
                method: 'PUT',
                body: JSON.stringify(settings)
            });
            setSecuritySettings(data);
        } catch (err: any) {
            throw new Error(err.message);
        }
    };

    const updateReturnSettings = async (settings: ReturnSettings) => {
        const userId = localStorage.getItem('FB_user_id');
        if (!userId) return;
        try {
            await apiFetch(`/update-return-settings/${userId}`, {
                method: 'POST',
                body: JSON.stringify(settings)
            });
        } catch (err: any) {
            throw new Error(err.message);
        }
    };

    const toggleFormStatus = async (formId: number, isActive: boolean) => {
        try {
            await apiFetch(`/org/forms/${formId}`, {
                method: 'PUT',
                body: JSON.stringify({ isActive })
            });
            setForms(prev => prev.map(f => f.id === formId ? { ...f, isActive } : f));
        } catch (err: any) {
            console.error('Failed to toggle form status:', err);
        }
    };

    const createForm = async (data: { name: string; description?: string }) => {
        try {
            await apiFetch('/org/forms', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            await loadData();
        } catch (err: any) {
            throw new Error(err.message);
        }
    };

    const getForm = async (id: number) => {
        try {
            return await apiFetch<Form>(`/org/forms/${id}`);
        } catch (err: any) {
            throw new Error(err.message);
        }
    };

    const updateForm = async (id: number, updates: Partial<Form>) => {
        try {
            const data = await apiFetch<Form>(`/org/forms/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            setForms(prev => prev.map(f => f.id === id ? data : f));
            return data;
        } catch (err: any) {
            throw new Error(err.message);
        }
    };

    const deleteForm = async (formId: number) => {
        try {
            await apiFetch(`/org/forms/${formId}`, { method: 'DELETE' });
            setForms(prev => prev.filter(f => f.id !== formId));
        } catch (err: any) {
            console.error('Failed to delete form:', err);
        }
    };

    useEffect(() => {
        loadData();
    }, [loadData, selectedOrgId]);

    return {
        forms,
        organization,
        stats,
        submissions,
        integrations,
        domains,
        securitySettings,
        pagination,
        loading,
        error,
        refresh: loadData,
        loadSubmissions,
        loadIntegrations,
        updateIntegrations,
        loadDomains,
        addDomain,
        removeDomain,
        loadSecuritySettings,
        updateSecuritySettings,
        updateReturnSettings,
        toggleFormStatus,
        createForm,
        getForm,
        updateForm,
        deleteForm
    };
}
