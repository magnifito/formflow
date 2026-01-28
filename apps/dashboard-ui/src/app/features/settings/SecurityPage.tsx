import { useEffect, useState } from 'react';
import { useOrganization, WhitelistedDomain, SecuritySettings } from '../../hooks/useOrganization';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Switch } from '../../components/ui/Switch';
import { Loader2, Trash2, Globe, Shield, Plus, Clock, Gauge, FileText } from 'lucide-react';

export function SecurityPage() {
    const {
        domains, securitySettings, loading,
        loadDomains, addDomain, removeDomain,
        loadSecuritySettings, updateSecuritySettings
    } = useOrganization();

    const [newDomain, setNewDomain] = useState('');
    const [addingDomain, setAddingDomain] = useState(false);
    const [domainError, setDomainError] = useState('');

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
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Security</h1>
                <p className="text-muted-foreground">Configure domain whitelisting and rate limiting for your forms.</p>
            </div>

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
                            placeholder="example.com"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                        />
                        <Button onClick={handleAddDomain} disabled={addingDomain || !newDomain}>
                            {addingDomain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                            Add
                        </Button>
                    </div>
                    {domainError && <p className="text-xs text-destructive">{domainError}</p>}
                </CardContent>
            </Card>

            {/* Rate Limiting */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Gauge className="h-5 w-5 text-primary" />
                        <CardTitle>Rate Limiting</CardTitle>
                    </div>
                    <CardDescription>
                        Limit the number of submissions per IP address to prevent abuse.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {securitySettings && (
                        <>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-medium">Enable Rate Limiting</h3>
                                    <p className="text-xs text-muted-foreground">Restrict submissions per IP within a time window.</p>
                                </div>
                                <Switch
                                    checked={securitySettings.defaultRateLimitEnabled}
                                    onCheckedChange={(checked) => handleSecurityUpdate({ defaultRateLimitEnabled: checked })}
                                />
                            </div>
                            {securitySettings.defaultRateLimitEnabled && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30 border animate-in slide-in-from-top-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium">Max Requests</label>
                                        <Input
                                            type="number"
                                            value={securitySettings.defaultRateLimitMaxRequests}
                                            onChange={(e) => handleSecurityUpdate({ defaultRateLimitMaxRequests: Number(e.target.value) })}
                                        />
                                        <p className="text-[10px] text-muted-foreground">Per time window</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium">Window (seconds)</label>
                                        <Input
                                            type="number"
                                            value={securitySettings.defaultRateLimitWindowSeconds}
                                            onChange={(e) => handleSecurityUpdate({ defaultRateLimitWindowSeconds: Number(e.target.value) })}
                                        />
                                        <p className="text-[10px] text-muted-foreground">Time window duration</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium">Max Hourly</label>
                                        <Input
                                            type="number"
                                            value={securitySettings.defaultRateLimitMaxRequestsPerHour}
                                            onChange={(e) => handleSecurityUpdate({ defaultRateLimitMaxRequestsPerHour: Number(e.target.value) })}
                                        />
                                        <p className="text-[10px] text-muted-foreground">Per hour limit</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Time Throttling */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        <CardTitle>Time Throttling</CardTitle>
                    </div>
                    <CardDescription>
                        Enforce a minimum delay between submissions from the same IP.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {securitySettings && (
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-medium">Enable Time Throttling</h3>
                                <p className="text-xs text-muted-foreground">
                                    Minimum {securitySettings.defaultMinTimeBetweenSubmissionsSeconds || 10} seconds between submissions.
                                </p>
                            </div>
                            <Switch
                                checked={securitySettings.defaultMinTimeBetweenSubmissionsEnabled}
                                onCheckedChange={(checked) => handleSecurityUpdate({ defaultMinTimeBetweenSubmissionsEnabled: checked })}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Additional Settings */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <CardTitle>Additional Settings</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {securitySettings && (
                        <>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-medium">Referer Fallback</h3>
                                    <p className="text-xs text-muted-foreground">Use Referer header when Origin header is missing.</p>
                                </div>
                                <Switch
                                    checked={securitySettings.defaultRefererFallbackEnabled}
                                    onCheckedChange={(checked) => handleSecurityUpdate({ defaultRefererFallbackEnabled: checked })}
                                />
                            </div>

                            <div className="pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <h3 className="text-sm font-medium">Max Request Size</h3>
                                        <p className="text-xs text-muted-foreground">Maximum body size for form submissions.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            type="number"
                                            className="w-28"
                                            value={securitySettings.defaultMaxRequestSizeBytes}
                                            onChange={(e) => handleSecurityUpdate({ defaultMaxRequestSizeBytes: Number(e.target.value) })}
                                        />
                                        <span className="text-sm text-muted-foreground w-16">
                                            {Math.round(securitySettings.defaultMaxRequestSizeBytes / 1000)} KB
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
