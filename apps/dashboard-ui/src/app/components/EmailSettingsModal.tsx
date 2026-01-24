import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Switch } from './ui/Switch';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/Card';
import { Loader2, X, Mail, Server, ShieldCheck, Type } from 'lucide-react';
import { ReturnSettings } from '../hooks/useOrganization';

interface EmailSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSettings?: ReturnSettings;
    onSave: (settings: ReturnSettings) => Promise<void>;
}

export function EmailSettingsModal({ isOpen, onClose, initialSettings, onSave }: EmailSettingsModalProps) {
    const [settings, setSettings] = useState<ReturnSettings>({
        smtpHost: '',
        smtpPort: 587,
        smtpUsername: '',
        smtpPassword: '',
        emailSubject: '',
        emailBody: '',
        returnMessage: false,
        ...initialSettings
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialSettings) {
            setSettings(prev => ({ ...prev, ...initialSettings }));
        }
    }, [initialSettings]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await onSave(settings);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-primary/10">
                <CardHeader className="sticky top-0 z-10 bg-card border-b pb-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                <Mail className="h-6 w-6 text-primary" />
                                Return Email Settings
                            </CardTitle>
                            <CardDescription>
                                Configure automatic email responses for form submissions.
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full shadow-sm hover:bg-muted">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-8 pt-6">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                            {error}
                        </div>
                    )}

                    {/* Basic Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10 transition-colors hover:bg-primary/10">
                        <div className="space-y-0.5">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary/80">Automatic Response</h3>
                            <p className="text-sm text-muted-foreground">Enable or disable automatic emails to form submitters.</p>
                        </div>
                        <Switch
                            checked={settings.returnMessage}
                            onCheckedChange={(checked) => setSettings({ ...settings, returnMessage: checked })}
                        />
                    </div>

                    {/* SMTP Configuration */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/60 border-b pb-2">
                            <Server className="h-4 w-4" />
                            SMTP Settings
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">SMTP Host</label>
                                <Input
                                    placeholder="smtp.formflow.fyi"
                                    value={settings.smtpHost}
                                    onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">SMTP Port</label>
                                <Input
                                    type="number"
                                    placeholder="587"
                                    value={settings.smtpPort}
                                    onChange={(e) => setSettings({ ...settings, smtpPort: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Username</label>
                                <Input
                                    placeholder="user@formflow.fyi"
                                    value={settings.smtpUsername}
                                    onChange={(e) => setSettings({ ...settings, smtpUsername: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Password</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={settings.smtpPassword}
                                    onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Email Content */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/60 border-b pb-2">
                            <Type className="h-4 w-4" />
                            Email Content
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Default Subject</label>
                                <Input
                                    placeholder="Thanks for your submission!"
                                    value={settings.emailSubject}
                                    onChange={(e) => setSettings({ ...settings, emailSubject: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Default Body</label>
                                <textarea
                                    className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Type your message here..."
                                    value={settings.emailBody}
                                    onChange={(e) => setSettings({ ...settings, emailBody: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="sticky bottom-0 z-10 bg-card border-t pt-4 flex justify-end gap-3 px-6 pb-6">
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="min-w-[120px] shadow-lg shadow-primary/20">
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
