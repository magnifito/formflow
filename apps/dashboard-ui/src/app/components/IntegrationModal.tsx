import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/Card';
import { X, Loader2, Save, Plus, Settings2 } from 'lucide-react';
import { Form, Integration } from '../hooks/useOrganization';

type IntegrationScope = 'organization' | 'form';

interface IntegrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Integration>) => Promise<void>;
    initialData?: Integration | null;
    organizationId?: number;
    forms?: Form[];
    defaultScope?: IntegrationScope;
    defaultFormId?: number | null;
}

const INTEGRATION_TYPES = [
    { value: 'email-smtp', label: 'Email Notifications' },
    { value: 'slack', label: 'Slack' },
    { value: 'discord', label: 'Discord' },
    { value: 'telegram', label: 'Telegram' },
    { value: 'webhook', label: 'Webhook (Generic / Make / n8n)' }
];

export function IntegrationModal({ isOpen, onClose, onSave, initialData, organizationId, forms = [], defaultScope = 'organization', defaultFormId = null }: IntegrationModalProps) {
    const [formData, setFormData] = useState<Partial<Integration>>({
        name: '',
        type: 'webhook',
        config: {},
        isActive: true,
        scope: 'organization',
        formId: null
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load initial data
    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                scope: initialData.scope || 'organization',
                formId: initialData.formId ?? null
            });
        } else {
            setFormData({
                name: '',
                type: 'webhook',
                config: {},
                isActive: true,
                organizationId,
                scope: defaultScope || 'organization',
                formId: defaultFormId ?? null
            });
        }
    }, [initialData, isOpen, organizationId, defaultScope, defaultFormId]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!formData.name) {
            setError('Name is required');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const scopedPayload: Partial<Integration> = {
                ...formData,
                scope: formData.scope || defaultScope || 'organization',
                formId: (formData.scope || defaultScope) === 'form' ? (formData.formId ?? defaultFormId) : null
            };
            if (scopedPayload.scope === 'form' && !scopedPayload.formId) {
                setError('Select a form for this override');
                setSaving(false);
                return;
            }
            await onSave(scopedPayload);
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = (key: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            config: {
                ...prev.config,
                [key]: value
            }
        }));
    };

    const updateNestedConfig = (parent: 'smtp' | 'oauth' | 'emailApi', key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            config: {
                ...prev.config,
                [parent]: {
                    ...(prev.config?.[parent] || {}),
                    [key]: value
                }
            }
        }));
    };

    const handleScopeChange = (scope: IntegrationScope) => {
        setFormData(prev => ({
            ...prev,
            scope,
            formId: scope === 'form' ? (prev.formId ?? defaultFormId) : null
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-lg shadow-2xl border-primary/10">
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        {initialData ? <Settings2 className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                        {initialData ? 'Edit Integration' : 'Add Integration'}
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Scope Selection */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Scope</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={formData.scope || 'organization'}
                                onChange={(e) => handleScopeChange(e.target.value as IntegrationScope)}
                            >
                                <option value="organization">Organization default</option>
                                <option value="form">Form override</option>
                            </select>
                            {formData.scope === 'form' && (
                                <div className="mt-3 space-y-1.5">
                                    <label className="text-sm font-medium">Target form</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={formData.formId ?? ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, formId: e.target.value ? Number(e.target.value) : null }))}
                                    >
                                        <option value="">Select a form</option>
                                        {forms.map(form => (
                                            <option key={form.id} value={form.id}>{form.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Type Selection */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Type</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.type}
                                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value, config: {} }))}
                                disabled={!!initialData}
                            >
                                {INTEGRATION_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Name */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Name</label>
                            <Input
                                placeholder="e.g., Marketing Slack"
                                value={formData.name || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        {/* Dynamic Config Fields */}
                        <div className="pt-4 border-t space-y-4">
                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Configuration</h4>

                            {formData.type === 'email-smtp' && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Recipients (comma separated)</label>
                                        <Input
                                            placeholder="email@example.com, team@example.com"
                                            value={formData.config?.recipients || ''}
                                            onChange={(e) => updateConfig('recipients', e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium">From Email</label>
                                            <Input
                                                placeholder="no-reply@yourdomain.com"
                                                value={formData.config?.fromEmail || ''}
                                                onChange={(e) => updateConfig('fromEmail', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium">Subject</label>
                                            <Input
                                                placeholder="New Form Submission"
                                                value={formData.config?.subject || ''}
                                                onChange={(e) => updateConfig('subject', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
                                        <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">SMTP credentials</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Input
                                                placeholder="SMTP Host"
                                                value={formData.config?.smtp?.host || ''}
                                                onChange={(e) => updateNestedConfig('smtp', 'host', e.target.value)}
                                            />
                                            <Input
                                                placeholder="Port"
                                                type="number"
                                                value={formData.config?.smtp?.port || ''}
                                                onChange={(e) => updateNestedConfig('smtp', 'port', e.target.value ? Number(e.target.value) : '')}
                                            />
                                            <Input
                                                placeholder="Username"
                                                value={formData.config?.smtp?.username || ''}
                                                onChange={(e) => updateNestedConfig('smtp', 'username', e.target.value)}
                                            />
                                            <Input
                                                type="password"
                                                placeholder="Password"
                                                value={formData.config?.smtp?.password || ''}
                                                onChange={(e) => updateNestedConfig('smtp', 'password', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
                                        <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">OAuth (Gmail, Outlook, etc.)</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Input
                                                placeholder="Client ID"
                                                value={formData.config?.oauth?.clientId || ''}
                                                onChange={(e) => updateNestedConfig('oauth', 'clientId', e.target.value)}
                                            />
                                            <Input
                                                placeholder="Client Secret"
                                                value={formData.config?.oauth?.clientSecret || ''}
                                                onChange={(e) => updateNestedConfig('oauth', 'clientSecret', e.target.value)}
                                            />
                                            <Input
                                                placeholder="User / Email"
                                                value={formData.config?.oauth?.user || ''}
                                                onChange={(e) => updateNestedConfig('oauth', 'user', e.target.value)}
                                            />
                                            <Input
                                                placeholder="Refresh Token"
                                                value={formData.config?.oauth?.refreshToken || ''}
                                                onChange={(e) => updateNestedConfig('oauth', 'refreshToken', e.target.value)}
                                            />
                                            <Input
                                                placeholder="Access Token"
                                                value={formData.config?.oauth?.accessToken || ''}
                                                onChange={(e) => updateNestedConfig('oauth', 'accessToken', e.target.value)}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Provide either SMTP credentials or OAuth tokens. OAuth is recommended for Gmail/Outlook.</p>
                                    </div>
                                </div>
                            )}

                            {formData.type === 'slack' && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Channel ID</label>
                                    <Input
                                        placeholder="C01234..."
                                        value={formData.config?.channelId || ''}
                                        onChange={(e) => updateConfig('channelId', e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Bot token is configured in Organization &rarr; Credentials.
                                    </p>
                                </div>
                            )}

                            {formData.type === 'discord' && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Webhook URL</label>
                                    <Input
                                        placeholder="https://discord.com/api/webhooks/..."
                                        value={formData.config?.webhookUrl || ''}
                                        onChange={(e) => updateConfig('webhookUrl', e.target.value)}
                                    />
                                </div>
                            )}

                            {formData.type === 'telegram' && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Chat ID</label>
                                    <Input
                                        placeholder="-1001234567890"
                                        value={formData.config?.chatId || ''}
                                        onChange={(e) => updateConfig('chatId', e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Bot token is configured in Organization &rarr; Credentials.
                                    </p>
                                </div>
                            )}

                            {formData.type === 'webhook' && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Webhook URL</label>
                                    <Input
                                        placeholder="https://api.example.com/webhook"
                                        value={formData.config?.webhook || ''}
                                        onChange={(e) => updateConfig('webhook', e.target.value)}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium">Source (optional)</label>
                                            <select
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={formData.config?.webhookSource || 'generic'}
                                                onChange={(e) => updateConfig('webhookSource', e.target.value)}
                                            >
                                                <option value="generic">Generic</option>
                                                <option value="make">Make.com</option>
                                                <option value="n8n">n8n</option>
                                            </select>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Works with Zapier, Make, n8n, etc.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex justify-end gap-3 pt-6 border-t bg-muted/20">
                    <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Integration
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
