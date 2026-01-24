import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TOKEN_KEY = 'ff_jwt_token';
const USER_ID_KEY = 'ff_user_id';
const FETCH_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface User {
    id: number;
    email: string;
    name?: string;
    apiKey?: string;
    returnBoolean?: boolean;
    smtpHost?: string;
    smtpPort?: number;
    smtpUsername?: string;
    smtpPassword?: string;
    emailSubject?: string;
    emailBody?: string;
    role?: 'member' | 'org_admin';
    isSuperAdmin?: boolean;
    organization?: {
        id: number;
        name: string;
    };
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_ID_KEY);
        setUser(null);
        navigate('/login');
    };

    const regenerateApiKey = async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        const userId = localStorage.getItem(USER_ID_KEY);
        if (!token || !userId) return;

        try {
            const response = await fetch(`${FETCH_URL}/regenerate-api-key/${userId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.apiKey) {
                setUser(prev => prev ? { ...prev, apiKey: data.apiKey } : null);
            }
        } catch (error) {
            console.error('Failed to regenerate API key:', error);
        }
    };

    useEffect(() => {
        const loadUserData = async () => {
            const token = localStorage.getItem(TOKEN_KEY);
            const userId = localStorage.getItem(USER_ID_KEY);

            if (!token || !userId) {
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`${FETCH_URL}/api/user/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!response.ok) {
                    logout();
                    return;
                }

                const userData = await response.json();
                setUser(userData);
            } catch (error) {
                console.error('Failed to load user data:', error);
                logout();
            } finally {
                setLoading(false);
            }
        };

        loadUserData();
    }, []);

    return { user, loading, logout, regenerateApiKey };
}
