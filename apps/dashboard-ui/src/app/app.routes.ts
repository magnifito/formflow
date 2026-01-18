import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SetupComponent } from './setup/setup.component';
import { AuthGuard } from './auth.guard';
import { AdminGuard } from './guards/admin.guard';

// App Shell Layout (for tenant/org routes)
import { AppShellComponent } from './shared/layouts/app-shell.component';
import { OrgDashboardComponent } from './features/dashboard/org-dashboard.component';
import { OrgSubmissionsComponent } from './features/submissions/org-submissions.component';
import { IntegrationsComponent } from './features/integrations/integrations.component';
import { SettingsComponent } from './features/settings/settings.component';

// Admin Layout
import { AdminLayoutComponent } from './features/admin/admin-layout.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard.component';
import { AdminOrganizationsComponent } from './features/admin/admin-organizations.component';
import { AdminUsersComponent } from './features/admin/admin-users.component';
import { AdminCreateUserComponent } from './features/admin/admin-create-user.component';
import { AdminSubmissionsComponent } from './features/admin/admin-submissions.component';

export const routes: Routes = [
    { path: 'setup', component: SetupComponent },
    { path: 'login', component: LoginComponent },

    // Tenant/Organization routes with AppShell
    {
        path: '',
        component: AppShellComponent,
        canActivate: [AuthGuard],
        children: [
            { path: 'dashboard', component: OrgDashboardComponent },
            { path: 'forms', component: OrgDashboardComponent }, // Forms is same as dashboard
            { path: 'submissions', component: OrgSubmissionsComponent },
            { path: 'integrations', component: IntegrationsComponent },
            { path: 'settings', component: SettingsComponent },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
        ]
    },
    
    // Admin routes
    {
        path: 'admin',
        component: AdminLayoutComponent,
        canActivate: [AuthGuard, AdminGuard],
        children: [
            { path: '', component: AdminDashboardComponent },
            { path: 'organizations', component: AdminOrganizationsComponent },
            { path: 'users', component: AdminUsersComponent },
            { path: 'users/create', component: AdminCreateUserComponent },
            { path: 'submissions', component: AdminSubmissionsComponent },
        ]
    },
    
    { path: '**', redirectTo: '/login' },
];