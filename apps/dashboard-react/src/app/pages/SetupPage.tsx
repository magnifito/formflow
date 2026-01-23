import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Loader2, AlertCircle, Building2, UserCircle } from 'lucide-react';
import { useOrganizationContext } from '../hooks/useOrganizationContext';

const FETCH_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const TOKEN_KEY = 'ff_jwt_token';
const USER_ID_KEY = 'ff_user_id';

export function SetupPage() {
    const [loading, setLoading] = useState(false);
    const [checkingSetup, setCheckingSetup] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [organizationSlug, setOrganizationSlug] = useState('');

    const navigate = useNavigate();
    const { setSelectedOrgId } = useOrganizationContext();

    const checkSetupStatus = useCallback(async () => {
        try {
            const response = await fetch(`${FETCH_URL}/setup`);
            const data = await response.json();

            if (!data.setupNeeded) {
                navigate('/login');
                return;
            }
            setCheckingSetup(false);
        } catch (err) {
            console.error('Error checking setup status:', err);
            setError('Failed to check setup status. Please refresh the page.');
            setCheckingSetup(false);
        }
    }, [navigate]);

    useEffect(() => {
        checkSetupStatus();
    }, [checkSetupStatus]);

    const generateSlug = (val: string) => {
        return val
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    };

    const handleOrgNameChange = (val: string) => {
        setOrganizationName(val);
        setOrganizationSlug(generateSlug(val));
    };

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || !organizationName || !organizationSlug) {
            setError('Please fill in all required fields');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${FETCH_URL}/setup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    name: name || null,
                    organizationName,
                    organizationSlug,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Setup failed');
                return;
            }

            if (data.token && data.user?.id) {
                localStorage.setItem(TOKEN_KEY, data.token);
                localStorage.setItem(USER_ID_KEY, data.user.id.toString());

                if (data.organization?.id) {
                    setSelectedOrgId(data.organization.id);
                }
            }

            navigate('/dashboard');
        } catch (err) {
            console.error('Setup error:', err);
            setError('Setup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (checkingSetup) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground font-medium text-sm">Checking setup status...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-muted/30">
            <Card className="w-full max-w-2xl shadow-xl">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                            <path d="M2 17L12 22L22 17" />
                            <path d="M2 12L12 17L22 12" />
                        </svg>
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight">Welcome to FormFlow</CardTitle>
                    <CardDescription className="text-base">
                        Let's get started! Create your account and organization.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSetup}>
                    <CardContent className="grid gap-8">
                        {error && (
                            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20 animate-in fade-in zoom-in-95">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                    <UserCircle className="h-4 w-4" />
                                    Admin Account
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium" htmlFor="email">Email *</label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="admin@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium" htmlFor="password">Password *</label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Minimum 8 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                    />
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Min. 8 characters</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium" htmlFor="name">Name</label>
                                    <Input
                                        id="name"
                                        placeholder="John Doe"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                    <Building2 className="h-4 w-4" />
                                    Organization
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium" htmlFor="orgName">Organization Name *</label>
                                    <Input
                                        id="orgName"
                                        placeholder="My Company"
                                        value={organizationName}
                                        onChange={(e) => handleOrgNameChange(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium" htmlFor="orgSlug">Organization Slug *</label>
                                    <Input
                                        id="orgSlug"
                                        placeholder="my-company"
                                        value={organizationSlug}
                                        onChange={(e) => setOrganizationSlug(generateSlug(e.target.value))}
                                        required
                                        pattern="[a-z0-9-]+"
                                    />
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter leading-tight">
                                        Lowercase, numbers, and hyphens only
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="pt-4">
                        <Button className="w-full h-11 text-lg font-semibold shadow-lg" type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            {loading ? 'Setting up...' : 'Complete Setup'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
