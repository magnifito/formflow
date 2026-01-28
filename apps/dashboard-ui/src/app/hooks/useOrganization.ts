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
    data: Record<string, unknown>;
    originDomain: string | null;
    ipAddress: string | null;
    createdAt: string;
    form?: Form;
}

export interface Integration {
    id: number;
    organizationId: number;
    type: string;
    name: string;
    config: Record<string, unknown>;
    isActive: boolean;
    formId?: number | null;
    scope?: 'organization' | 'form';
    createdAt: string;
    updatedAt: string;
}

export interface IntegrationHierarchy {
    organizationIntegrations: Integration[];
    forms: Array<{
        id: number;
        name: string;
        slug: string;
        useOrgIntegrations: boolean;
        integrations: Integration[];
        effectiveIntegrations: Integration[];
    }>;
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

export interface BotCredentials {
    slackBotToken: string | null;
    telegramBotToken: string | null;
    hasSlackToken: boolean;
    hasTelegramToken: boolean;
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
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [integrationHierarchy, setIntegrationHierarchy] = useState<IntegrationHierarchy | null>(null);
    const [domains, setDomains] = useState<WhitelistedDomain[]>([]);
    const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
    const [botCredentials, setBotCredentials] = useState<BotCredentials | null>(null);
    const [pagination, setPagination] = useState<PaginatedResponse<unknown>['pagination'] | null>(null);
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
        } catch (err) {
            setError((err as Error).message);
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
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadIntegrations = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch<IntegrationHierarchy>('/integrations/hierarchy');
            setIntegrationHierarchy(data);
            setIntegrations(data.organizationIntegrations);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createIntegration = async (data: Partial<Integration>) => {
        const newIntegration = await apiFetch<Integration>('/integrations', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        await loadIntegrations();
        return newIntegration;
    };

    const updateIntegration = async (id: number, updates: Partial<Integration>) => {
        try {
            const updated = await apiFetch<Integration>(`/integrations/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            await loadIntegrations();
            return updated;
        } catch (err) {
            console.error('Failed to update integration:', err);
            throw err;
        }
    };

    const deleteIntegration = async (id: number) => {
        try {
            await apiFetch(`/integrations/${id}`, { method: 'DELETE' });
            await loadIntegrations();
        } catch (err) {
            console.error('Failed to delete integration:', err);
            throw err;
        }
    };

    const testIntegration = async (id: number) => {
        try {
            return await apiFetch<{ success: boolean; message: string }>(`/integrations/${id}/test`, {
                method: 'POST'
            });
        } catch (err) {
            console.error('Failed to test integration:', err);
            throw err;
        }
    };

    const loadDomains = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch<WhitelistedDomain[]>('/org/domains');
            setDomains(data);
        } catch (err) {
            setError((err as Error).message);
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
        } catch (err) {
            throw new Error((err as Error).message);
        }
    };

    const removeDomain = async (id: number) => {
        try {
            await apiFetch(`/org/domains/${id}`, { method: 'DELETE' });
            setDomains(prev => prev.filter(d => d.id !== id));
        } catch (err) {
            throw new Error((err as Error).message);
        }
    };

    const loadSecuritySettings = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch<SecuritySettings>('/org/security-settings');
            setSecuritySettings(data);
        } catch (err) {
            setError((err as Error).message);
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
        } catch (err) {
            throw new Error((err as Error).message);
        }
    };

    const loadBotCredentials = useCallback(async () => {
        try {
            const data = await apiFetch<BotCredentials>('/org/bot-credentials');
            setBotCredentials(data);
        } catch (err) {
            setError((err as Error).message);
        }
    }, []);

    const updateBotCredentials = async (credentials: { slackBotToken?: string; telegramBotToken?: string }) => {
        try {
            const data = await apiFetch<BotCredentials>('/org/bot-credentials', {
                method: 'PUT',
                body: JSON.stringify(credentials)
            });
            setBotCredentials(data);
            return data;
        } catch (err) {
            throw new Error((err as Error).message);
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
        } catch (err) {
            throw new Error((err as Error).message);
        }
    };

    const toggleFormStatus = async (formId: number, isActive: boolean) => {
        try {
            await apiFetch(`/org/forms/${formId}`, {
                method: 'PUT',
                body: JSON.stringify({ isActive })
            });
            setForms(prev => prev.map(f => f.id === formId ? { ...f, isActive } : f));
        } catch (err) {
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
        } catch (err) {
            throw new Error((err as Error).message);
        }
    };

    const getForm = async (id: number) => {
        try {
            return await apiFetch<Form>(`/org/forms/${id}`);
        } catch (err) {
            throw new Error((err as Error).message);
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
        } catch (err) {
            throw new Error((err as Error).message);
        }
    };

    const deleteForm = async (formId: number) => {
        try {
            await apiFetch(`/org/forms/${formId}`, { method: 'DELETE' });
            setForms(prev => prev.filter(f => f.id !== formId));
        } catch (err) {
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
        integrationHierarchy,
        domains,
        securitySettings,
        botCredentials,
        pagination,
        loading,
        error,
        refresh: loadData,
        loadSubmissions,
        loadIntegrations,
        createIntegration,
        updateIntegration,
        deleteIntegration,
        testIntegration,
        loadDomains,
        addDomain,
        removeDomain,
        loadSecuritySettings,
        updateSecuritySettings,
        loadBotCredentials,
        updateBotCredentials,
        updateReturnSettings,
        toggleFormStatus,
        createForm,
        getForm,
        updateForm,
        deleteForm
    };
}
