import { Outlet } from 'react-router-dom';
import { Sidebar, NavSection } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useAuth } from '../hooks/useAuth';
import { useOrganization } from '../hooks/useOrganization';

import { LayoutDashboard, FileText, ClipboardList, ArrowLeftRight, LayoutGrid, Shield, Bell, User, Key } from 'lucide-react';

const NAV_SECTIONS: NavSection[] = [
    {
        label: 'Workspace',
        items: [
            { label: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
            { label: 'Forms', icon: FileText, route: '/forms' },
            { label: 'Submissions', icon: ClipboardList, route: '/submissions' },
            { label: 'Integrations', icon: ArrowLeftRight, route: '/integrations' },
            { label: 'Gallery', icon: LayoutGrid, route: '/gallery' },
        ]
    },
    {
        label: 'Organization',
        items: [
            { label: 'Security', icon: Shield, route: '/security' },
            { label: 'Credentials', icon: Key, route: '/credentials' },
            { label: 'Notifications', icon: Bell, route: '/notifications' },
        ]
    },
    {
        label: 'Account',
        items: [
            { label: 'Profile', icon: User, route: '/account' },
        ]
    }
];

export function AppShell() {
    const { user, logout } = useAuth();
    const { organization } = useOrganization();

    return (
        <div className="min-h-screen bg-muted/30">
            <Sidebar navSections={NAV_SECTIONS} />

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
