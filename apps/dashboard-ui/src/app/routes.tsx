import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { SubmissionsPage } from './features/submissions/SubmissionsPage';
import { IntegrationsPage } from './features/integrations/IntegrationsPage';
import { SecurityPage } from './features/settings/SecurityPage';
import { NotificationsPage } from './features/settings/NotificationsPage';
import { AccountPage } from './features/settings/AccountPage';
import { IntegrationCredentialsPage } from './features/settings/IntegrationCredentialsPage';
import { GalleryPage } from './features/gallery/GalleryPage';
import { LoginPage } from './pages/LoginPage';
import { SetupPage } from './pages/SetupPage';
import { RequireAuth } from './components/RequireAuth';
import { AdminLayout } from './features/admin/AdminLayout';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { AdminOrganizationsPage } from './features/admin/AdminOrganizationsPage';
import { AdminUsersPage } from './features/admin/AdminUsersPage';
import { AdminSubmissionsPage } from './features/admin/AdminSubmissionsPage';
import { AdminFormsPage } from './features/admin/AdminFormsPage';
import { QueuePage } from './features/queue/QueuePage';

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/setup',
        element: <SetupPage />,
    },
    {
        path: '/',
        element: (
            <RequireAuth>
                <AppShell />
            </RequireAuth>
        ),
        children: [
            {
                path: 'dashboard',
                element: <DashboardPage />,
            },
            {
                path: 'forms',
                element: <DashboardPage />,
            },
            {
                path: 'submissions',
                element: <SubmissionsPage />,
            },
            {
                path: 'integrations',
                element: <IntegrationsPage />,
            },
            {
                path: 'gallery',
                element: <GalleryPage />,
            },
            // Organization settings
            {
                path: 'security',
                element: <SecurityPage />,
            },
            {
                path: 'credentials',
                element: <IntegrationCredentialsPage />,
            },
            {
                path: 'notifications',
                element: <NotificationsPage />,
            },
            // Account
            {
                path: 'account',
                element: <AccountPage />,
            },
            // Redirect old settings route
            {
                path: 'settings',
                element: <Navigate to="/security" replace />,
            },
            {
                path: '',
                element: <Navigate to="/dashboard" replace />,
            },
        ],
    },
    {
        path: '/admin',
        element: (
            <RequireAuth>
                <AdminLayout />
            </RequireAuth>
        ),
        children: [
            { path: '', element: <AdminDashboard /> },
            { path: 'organizations', element: <AdminOrganizationsPage /> },
            { path: 'users', element: <AdminUsersPage /> },
            { path: 'forms', element: <AdminFormsPage /> },
            { path: 'submissions', element: <AdminSubmissionsPage /> },
            { path: 'queue', element: <QueuePage /> }
        ]
    }
]);
