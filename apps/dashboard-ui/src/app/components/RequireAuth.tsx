import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';

export function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [setupCheckLoading, setSetupCheckLoading] = useState(false);
    const [setupNeeded, setSetupNeeded] = useState(false);
    const [hasCheckedSetup, setHasCheckedSetup] = useState(false);
    const location = useLocation();

    useEffect(() => {
        if (!authLoading && !user && !hasCheckedSetup) {
            const checkSetup = async () => {
                setSetupCheckLoading(true);
                try {
                    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
                    const response = await fetch(`${apiUrl}/setup`);
                    const data = await response.json();
                    if (data.setupNeeded) {
                        setSetupNeeded(true);
                    }
                } catch (err) {
                    console.error('Failed to check setup status in RequireAuth:', err);
                } finally {
                    setSetupCheckLoading(false);
                    setHasCheckedSetup(true);
                }
            };
            checkSetup();
        }
    }, [authLoading, user, hasCheckedSetup]);

    if (authLoading || (setupCheckLoading && !hasCheckedSetup)) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        // Wait for setup check if we don't have a user yet
        if (!hasCheckedSetup) {
            return (
                <div className="flex h-screen w-full items-center justify-center bg-background">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            );
        }

        if (setupNeeded) {
            return <Navigate to="/setup" replace />;
        }
        // Redirect to login but save the current location to return to after login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}
