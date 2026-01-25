
import { useState, useCallback } from 'react';

const FETCH_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const TOKEN_KEY = 'ff_jwt_token';

interface QueueStats {
    active: number;
    completed: number;
    failed: number;
    retry: number;
    created: number;
}

export interface Job {
    id: string;
    name: string;
    data: any;
    state: string;
    createdon: string;
    startedon?: string;
    completedon?: string;
    retrycount: number;
    output?: any;
}

interface JobsResponse {
    jobs: Job[];
    pagination: {
        total: number;
        page: number;
        limit: number;
    };
}

export function useQueue() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getHeaders = () => {
        const token = localStorage.getItem(TOKEN_KEY);
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    const fetchStats = useCallback(async (): Promise<Record<string, QueueStats> | null> => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${FETCH_URL}/queue/stats`, {
                headers: getHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch queue stats');
            }

            return await response.json();
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchJobs = useCallback(async (queue?: string, state?: string, page = 1, limit = 20): Promise<JobsResponse | null> => {
        setLoading(true);
        setError(null);
        try {
            const offset = (page - 1) * limit;
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString()
            });
            if (queue) params.append('queue', queue);
            if (state) params.append('state', state);

            const response = await fetch(`${FETCH_URL}/queue/jobs?${params}`, {
                headers: getHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch jobs');
            }

            return await response.json();
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const retryJob = useCallback(async (jobId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${FETCH_URL}/queue/jobs/${jobId}/retry`, {
                method: 'POST',
                headers: getHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to retry job');
            }

            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        fetchStats,
        fetchJobs,
        retryJob
    };
}
