import { useEffect, useState } from 'react';
import { useOrganization, WhitelistedDomain, SecuritySettings } from '../../hooks/useOrganization';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Switch } from '../../components/ui/Switch';
import { Loader2, Trash2, Globe, Shield, LogOut, Plus, Mail } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { EmailSettingsModal } from '../../components/EmailSettingsModal';

export function SettingsPage() {
    const {
        domains, securitySettings, loading,
        loadDomains, addDomain, removeDomain,
        loadSecuritySettings, updateSecuritySettings,
        updateReturnSettings
    } = useOrganization();
    const { user } = useAuth();
    const { logout } = useAuth();

    const [newDomain, setNewDomain] = useState('');
    const [addingDomain, setAddingDomain] = useState(false);
    const [domainError, setDomainError] = useState('');
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    useEffect(() => {
        loadDomains();
        loadSecuritySettings();
    }, [loadDomains, loadSecuritySettings]);

    const handleAddDomain = async () => {
        if (!newDomain) return;
        setAddingDomain(true);
        setDomainError('');
        try {
            await addDomain(newDomain);
            setNewDomain('');
        } catch (err: any) {
            setDomainError(err.message);
        } finally {
            setAddingDomain(false);
        }
    };

    const handleSecurityUpdate = async (updates: Partial<SecuritySettings>) => {
        if (!securitySettings) return;
        try {
            await updateSecuritySettings({ ...securitySettings, ...updates });
        } catch (err: any) {
            console.error('Failed to update security settings:', err);
        }
    };

    if (loading && !securitySettings) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

            {/* Whitelisted Domains */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        <CardTitle>Whitelisted Domains</CardTitle>
                    </div>
                    <CardDescription>
                        Only accept form submissions from these domains. Leave empty to accept from any origin.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        {domains.map((domain) => (
                            <div key={domain.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                                <code className="text-sm font-mono">{domain.domain}</code>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                    onClick={() => removeDomain(domain.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        {domains.length === 0 && (
                            <div className="p-4 text-center text-sm text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                                No domains whitelisted. Forms accept submissions from any origin.
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Input
                            placeholder="formflow.fyi"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                        />
                        <Button onClick={handleAddDomain} disabled={addingDomain || !newDomain}>
                            {addingDomain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                            Add Domain
                        </Button>
                    </div>
                    {domainError && <p className="text-xs text-destructive">{domainError}</p>}
                </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <CardTitle>Security Settings</CardTitle>
                    </div>
                    <CardDescription>Default security settings for all forms.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {securitySettings && (
                        <>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <h3 className="text-sm font-medium">Rate Limiting</h3>
                                        <p className="text-xs text-muted-foreground">Limit submissions per IP address.</p>
                                    </div>
                                    <Switch
                                        checked={securitySettings.defaultRateLimitEnabled}
                                        onCheckedChange={(checked) => handleSecurityUpdate({ defaultRateLimitEnabled: checked })}
                                    />
                                </div>
                                {securitySettings.defaultRateLimitEnabled && (
                                    <div className="grid grid-cols-2 gap-4 pl-6 animate-in slide-in-from-top-2">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Max Requests</label>
                                            <Input
                                                type="number"
                                                value={securitySettings.defaultRateLimitMaxRequests}
                                                onBlur={(e) => handleSecurityUpdate({ defaultRateLimitMaxRequests: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Window (seconds)</label>
                                            <Input
                                                type="number"
                                                value={securitySettings.defaultRateLimitWindowSeconds}
                                                onBlur={(e) => handleSecurityUpdate({ defaultRateLimitWindowSeconds: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Max Hourly Requests</label>
                                            <Input
                                                type="number"
                                                value={securitySettings.defaultRateLimitMaxRequestsPerHour}
                                                onBlur={(e) => handleSecurityUpdate({ defaultRateLimitMaxRequestsPerHour: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-medium">Time Throttling</h3>
                                    <p className="text-xs text-muted-foreground">Enforce a minimum delay between submissions.</p>
                                </div>
                                <Switch
                                    checked={securitySettings.defaultMinTimeBetweenSubmissionsEnabled}
                                    onCheckedChange={(checked) => handleSecurityUpdate({ defaultMinTimeBetweenSubmissionsEnabled: checked })}
                                />
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-medium">Referer Fallback</h3>
                                    <p className="text-xs text-muted-foreground">Use Referer header when Origin is missing.</p>
                                </div>
                                <Switch
                                    checked={securitySettings.defaultRefererFallbackEnabled}
                                    onCheckedChange={(checked) => handleSecurityUpdate({ defaultRefererFallbackEnabled: checked })}
                                />
                            </div>

                            <div className="pt-4 border-t">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-medium">Max Request Size</h3>
                                    <p className="text-xs text-muted-foreground">Maximum body size (in bytes).</p>
                                    <div className="flex items-center gap-4 mt-2">
                                        <Input
                                            type="number"
                                            className="w-32"
                                            value={securitySettings.defaultMaxRequestSizeBytes}
                                            onBlur={(e) => handleSecurityUpdate({ defaultMaxRequestSizeBytes: Number(e.target.value) })}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {securitySettings.defaultMaxRequestSizeBytes / 1000} KB
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Return Email Settings */}
            <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        <CardTitle>Return Email</CardTitle>
                    </div>
                    <CardDescription>
                        Configure automatic responses and custom SMTP settings.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium">Current Status</p>
                            <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${user?.returnBoolean ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">
                                    {user?.returnBoolean ? 'Enabled' : 'Disabled'}
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsEmailModalOpen(true)}>
                            <Settings className="h-3.5 w-3.5 mr-2" />
                            Configure SMTP
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Account Section */}
            <Card className="border-destructive/20 shadow-sm transition-all duration-300 hover:shadow-md hover:border-destructive/40">
                <CardHeader>
                    <CardTitle className="text-destructive font-bold">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between text-destructive">
                        <div className="space-y-0.5">
                            <h3 className="text-sm font-bold">Log Out</h3>
                            <p className="text-xs text-muted-foreground">Sign out of your account on this device.</p>
                        </div>
                        <Button variant="destructive" onClick={logout} className="shadow-lg shadow-destructive/20">
                            <LogOut className="h-4 w-4 mr-2" />
                            Log Out
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <EmailSettingsModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                initialSettings={user ? {
                    smtpHost: (user as any).smtpHost,
                    smtpPort: (user as any).smtpPort,
                    smtpUsername: (user as any).smtpUsername,
                    smtpPassword: (user as any).smtpPassword,
                    emailSubject: (user as any).emailSubject,
                    emailBody: (user as any).emailBody,
                    returnMessage: (user as any).returnBoolean
                } : undefined}
                onSave={updateReturnSettings}
            />
        </div>
    );
}

function Settings(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    )
}
