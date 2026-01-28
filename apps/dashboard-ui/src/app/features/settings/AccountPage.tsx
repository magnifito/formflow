import { useAuth } from '../../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { User, LogOut, Shield, Building2 } from 'lucide-react';

export function AccountPage() {
    const { user, logout } = useAuth();

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Account</h1>
                <p className="text-muted-foreground">Manage your profile and account settings.</p>
            </div>

            {/* Profile Info */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        <CardTitle>Profile</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20">
                            <span className="text-2xl font-bold text-primary">
                                {user?.name ? user.name.substring(0, 2).toUpperCase() : user?.email?.substring(0, 2).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold">{user?.name || 'No name set'}</h3>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</span>
                            </div>
                            <p className="font-medium">
                                {user?.isSuperAdmin ? 'Super Admin' : user?.role === 'org_admin' ? 'Organization Admin' : 'Member'}
                            </p>
                        </div>
                        <div className="p-4 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Organization</span>
                            </div>
                            <p className="font-medium">{user?.organization?.name || 'No organization'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/20">
                <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>Irreversible actions for your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                        <div>
                            <h3 className="font-medium">Sign Out</h3>
                            <p className="text-sm text-muted-foreground">Sign out of your account on this device.</p>
                        </div>
                        <Button variant="destructive" onClick={logout}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
