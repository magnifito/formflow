import { useState } from 'react';
import { useOrganization } from '../../hooks/useOrganization';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Mail, Bell, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { EmailSettingsModal } from '../../components/EmailSettingsModal';

export function NotificationsPage() {
    const { user } = useAuth();
    const { updateReturnSettings } = useOrganization();
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    const emailEnabled = (user as any)?.returnBoolean;
    const smtpConfigured = !!(user as any)?.smtpHost;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                <p className="text-muted-foreground">Configure how you receive notifications and automatic responses.</p>
            </div>

            {/* Return Email */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        <CardTitle>Return Email</CardTitle>
                    </div>
                    <CardDescription>
                        Send automatic email responses to form submitters. Requires SMTP configuration.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${emailEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                                {emailEnabled ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-muted-foreground" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-medium">
                                    {emailEnabled ? 'Return emails enabled' : 'Return emails disabled'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {smtpConfigured
                                        ? `Using SMTP server: ${(user as any)?.smtpHost}`
                                        : 'No SMTP server configured'
                                    }
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={() => setIsEmailModalOpen(true)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                        </Button>
                    </div>

                    {emailEnabled && (
                        <div className="p-4 rounded-lg border bg-primary/5 space-y-3">
                            <h4 className="text-sm font-medium">Email Template</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subject:</span>
                                    <span className="font-mono text-xs">{(user as any)?.emailSubject || 'Not set'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Body preview:</span>
                                    <span className="font-mono text-xs truncate max-w-[200px]">
                                        {(user as any)?.emailBody?.substring(0, 50) || 'Not set'}
                                        {(user as any)?.emailBody?.length > 50 ? '...' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Future: Push Notifications */}
            <Card className="opacity-60">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-muted-foreground">Push Notifications</CardTitle>
                    </div>
                    <CardDescription>
                        Get browser notifications for new form submissions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-4 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                        Coming soon
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
