import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { LoginResponse, User, Form, SubmissionResponse } from './types';

// Configuration
export const DASHBOARD_API_URL = 'http://localhost:4000';
export const COLLECTOR_API_URL = 'http://localhost:3000';

// State
let authToken: string | null = localStorage.getItem('lab.authToken');

export const setAuthToken = (token: string | null) => {
    authToken = token;
    if (token) {
        localStorage.setItem('lab.authToken', token);
    } else {
        localStorage.removeItem('lab.authToken');
    }
};

export const getAuthToken = () => authToken;

// Axios Instances
const dashboardApi = axios.create({
    baseURL: DASHBOARD_API_URL,
    headers: { 'Content-Type': 'application/json' },
});

const collectorApi = axios.create({
    baseURL: COLLECTOR_API_URL,
});

// Interceptors
dashboardApi.interceptors.request.use((config) => {
    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
});

// API Methods
export const api = {
    auth: {
        login: async (email: string, password: string) => {
            const { data } = await dashboardApi.post<LoginResponse>('/auth/login', { email, password });
            return data;
        },
        labLogin: async () => {
            const { data } = await dashboardApi.post<LoginResponse>('/auth/lab-login');
            return data;
        },
        me: async () => {
            const { data } = await dashboardApi.get<User>('/auth/me');
            return data;
        },
        setup: async (payload: any) => {
            const { data } = await dashboardApi.post<LoginResponse>('/setup', payload);
            return data;
        }
    },
    org: {
        getFormsWithOrgs: async () => {
            const { data } = await dashboardApi.get<{ organization: any; forms: Form[] }[]>('/org/forms/all');
            return data;
        }
    },
    collector: {
        getCsrfToken: async (submitHash: string, origin: string) => {
            // CSRF endpoint requires Origin/Referer to match whitelist
            const { data } = await collectorApi.get<{ token: string; expiresInSeconds: number }>(
                `/s/${submitHash}/csrf`
            );
            return data;
        },
        submit: async (
            submitHash: string,
            payload: any,
            options: {
                csrfToken?: string;
                format?: 'json' | 'multipart';
                origin?: string; // For overriding header in testing
            } = {}
        ) => {
            const config: AxiosRequestConfig = {
                headers: {}
            };

            if (options.csrfToken) {
                config.headers!['X-CSRF-Token'] = options.csrfToken;
            }

            // Browser sets Origin, but we might want to simulate others if running server-side? 
            // Since this is client-side, browser controls Origin.

            let data = payload;
            if (options.format === 'multipart') {
                const formData = new FormData();
                Object.entries(payload).forEach(([key, value]) => {
                    if (value instanceof File) {
                        formData.append(key, value);
                    } else if (typeof value === 'object' && value !== null) {
                        formData.append(key, JSON.stringify(value));
                    } else {
                        formData.append(key, String(value));
                    }
                });
                data = formData;
                config.headers!['Content-Type'] = 'multipart/form-data';
            } else {
                config.headers!['Content-Type'] = 'application/json';
            }

            const response = await collectorApi.post<SubmissionResponse>(`/s/${submitHash}`, data, config);
            return response.data;
        }
    }
};

export const isAxiosError = (error: unknown): error is AxiosError => {
    return axios.isAxiosError(error);
};
