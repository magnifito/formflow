export interface User {
    id: number;
    email: string;
    name: string | null;
    isSuperAdmin: boolean;
    isActive: boolean;
    organizationId: number | null;
    role: string | null;
    organization: Organization | null;
}

export interface Organization {
    id: number;
    name: string;
    slug: string;
    isActive: boolean;
    defaultRateLimitEnabled: boolean;
}

export interface Form {
    id: number;
    organizationId: number;
    name: string;
    description: string | null;
    submitHash: string;
    isActive: boolean;
    useOrgIntegrations: boolean;
    createdAt: string;
}

export interface SubmissionResponse {
    message: string;
    error?: string;
    token?: string; // CSRF
}

export interface LoginResponse {
    token: string;
    userId: number;
    user: User;
}

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
