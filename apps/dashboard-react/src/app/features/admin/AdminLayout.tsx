import { Outlet } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { useAuth } from '../../hooks/useAuth';
import { LayoutDashboard, Building2, Users, ClipboardList } from 'lucide-react';

const ADMIN_NAV_ITEMS = [
    { label: 'Dashboard', icon: LayoutDashboard, route: '/admin' },
    { label: 'Organizations', icon: Building2, route: '/admin/organizations' },
    { label: 'Users', icon: Users, route: '/admin/users' },
    { label: 'Submissions', icon: ClipboardList, route: '/admin/submissions' }
];

export function AdminLayout() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-muted/30">
            <Sidebar
                sectionLabel="ADMIN"
                navItems={ADMIN_NAV_ITEMS}
                showBackLink={true}
                backLinkText="Back to Tenant"
                backLinkRoute="/dashboard"
            />

            <div className="ml-60">
                <Header
                    organizationName="Super Admin"
                    userName={user?.name || user?.email}
                    role="org_admin"
                    isSuperAdmin={true}
                    onLogout={logout}
                />

                <main className="pt-20 px-6 pb-6 min-h-screen">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
