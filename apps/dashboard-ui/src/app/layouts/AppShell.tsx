import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useAuth } from '../hooks/useAuth';
import { useOrganization } from '../hooks/useOrganization';

import { LayoutDashboard, FileText, ClipboardList, ArrowLeftRight, Settings } from 'lucide-react';

const TENANT_NAV_ITEMS = [
    { label: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
    { label: 'Forms', icon: FileText, route: '/forms' },
    { label: 'Submissions', icon: ClipboardList, route: '/submissions' },
    { label: 'Integrations', icon: ArrowLeftRight, route: '/integrations' },
    { label: 'Settings', icon: Settings, route: '/settings' }
];

export function AppShell() {
    const { user, logout } = useAuth();
    const { organization } = useOrganization();

    return (
        <div className="min-h-screen bg-muted/30">
            <Sidebar sectionLabel="TENANT" navItems={TENANT_NAV_ITEMS} />

            <div className="ml-60">
                <Header
                    organizationName={organization?.name || user?.organization?.name}
                    userName={user?.name || user?.email}
                    role={user?.role}
                    isSuperAdmin={user?.isSuperAdmin}
                    onLogout={logout}
                />

                <main className="pt-20 px-6 pb-6 min-h-screen">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
