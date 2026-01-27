const FETCH_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const TOKEN_KEY = 'ff_jwt_token';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem(TOKEN_KEY);
    const selectedOrgId = localStorage.getItem('ff_selected_org_id');

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(selectedOrgId && selectedOrgId !== 'null' ? { 'X-Organization-Context': selectedOrgId } : {}),
        ...options.headers,
    };

    const response = await fetch(`${FETCH_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
}
