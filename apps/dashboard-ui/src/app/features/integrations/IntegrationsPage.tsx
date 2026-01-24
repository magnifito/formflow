import { useEffect, useState } from 'react';
import { useOrganization } from '../../hooks/useOrganization';
import { Card } from '../../components/ui/Card';
import { Switch } from '../../components/ui/Switch';
import { Input } from '../../components/ui/Input';
import { Loader2 } from 'lucide-react';
import { TelegramWidget } from '../../components/TelegramWidget';
import { useAuth } from '../../hooks/useAuth';

export function IntegrationsPage() {
    const { integrations, loading, loadIntegrations, updateIntegrations } = useOrganization();
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadIntegrations();
    }, [loadIntegrations]);

    const handleUpdate = async (field: string, value: any) => {
        setSaving(true);
        await updateIntegrations({ [field]: value });
        setTimeout(() => setSaving(false), 500);
    };

    if (loading && !integrations) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!integrations) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
                <p className="text-muted-foreground">Configure where your form submissions are sent.</p>
            </div>

            <div className="grid gap-6">
                {/* Email */}
                <Card className="p-6 transition-all duration-300 hover:shadow-lg">
                    <div className="flex items-start gap-5">
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-2xl border border-blue-500/20 shrink-0">
                            📧
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="space-y-0.5">
                                    <h3 className="text-lg font-semibold">Email Notifications</h3>
                                    <p className="text-sm text-muted-foreground">Send submissions to email addresses</p>
                                </div>
                                <Switch
                                    checked={integrations.emailEnabled}
                                    onCheckedChange={(checked) => handleUpdate('emailEnabled', checked)}
                                />
                            </div>

                            {integrations.emailEnabled && (
                                <div className="animate-in slide-in-from-top-2 duration-300 pt-4 mt-2 border-t">
                                    <label className="text-sm font-medium mb-2 block">Recipients (comma-separated)</label>
                                    <Input
                                        defaultValue={integrations.emailRecipients || ''}
                                        onBlur={(e) => handleUpdate('emailRecipients', e.target.value)}
                                        placeholder="email@example.com, team@example.com"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Discord */}
                <Card className="p-6 transition-all duration-300 hover:shadow-lg">
                    <div className="flex items-start gap-5">
                        <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-2xl border border-indigo-500/20 shrink-0">
                            💬
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="space-y-0.5">
                                    <h3 className="text-lg font-semibold">Discord</h3>
                                    <p className="text-sm text-muted-foreground">Post submissions to a Discord channel</p>
                                </div>
                                <Switch
                                    checked={integrations.discordEnabled}
                                    onCheckedChange={(checked) => handleUpdate('discordEnabled', checked)}
                                />
                            </div>

                            {integrations.discordEnabled && (
                                <div className="animate-in slide-in-from-top-2 duration-300 pt-4 mt-2 border-t">
                                    <label className="text-sm font-medium mb-2 block">Webhook URL</label>
                                    <Input
                                        defaultValue={integrations.discordWebhook || ''}
                                        onBlur={(e) => handleUpdate('discordWebhook', e.target.value)}
                                        placeholder="https://discord.com/api/webhooks/..."
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Telegram */}
                <Card className="p-6 transition-all duration-300 hover:shadow-lg">
                    <div className="flex items-start gap-5">
                        <div className="h-12 w-12 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center text-2xl border border-sky-500/20 shrink-0">
                            ✈️
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="space-y-0.5">
                                    <h3 className="text-lg font-semibold">Telegram</h3>
                                    <p className="text-sm text-muted-foreground">Send submissions to Telegram</p>
                                </div>
                                <Switch
                                    checked={integrations.telegramEnabled}
                                    onCheckedChange={(checked) => handleUpdate('telegramEnabled', checked)}
                                />
                            </div>
                            {integrations.telegramEnabled && user?.id && (
                                <div className="animate-in slide-in-from-top-2 duration-300 pt-4 mt-2 border-t">
                                    <TelegramWidget userId={user.id} />
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Slack */}
                <Card className="p-6 transition-all duration-300 hover:shadow-lg">
                    <div className="flex items-start gap-5">
                        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-2xl border border-emerald-500/20 shrink-0">
                            #
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="space-y-0.5">
                                    <h3 className="text-lg font-semibold">Slack</h3>
                                    <p className="text-sm text-muted-foreground">Post to a Slack channel</p>
                                </div>
                                <Switch
                                    checked={integrations.slackEnabled}
                                    onCheckedChange={(checked) => handleUpdate('slackEnabled', checked)}
                                />
                            </div>
                            {integrations.slackEnabled && (
                                <div className="animate-in slide-in-from-top-2 duration-300 pt-4 mt-2 border-t">
                                    <label className="text-sm font-medium mb-2 block">Channel ID</label>
                                    <Input
                                        defaultValue={integrations.slackChannelId || ''}
                                        onBlur={(e) => handleUpdate('slackChannelId', e.target.value)}
                                        placeholder="C0123456789"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Make.com */}
                <Card className="p-6 transition-all duration-300 hover:shadow-lg">
                    <div className="flex items-start gap-5">
                        <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-2xl border border-orange-500/20 shrink-0">
                            🔧
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="space-y-0.5">
                                    <h3 className="text-lg font-semibold">Make.com</h3>
                                    <p className="text-sm text-muted-foreground">Send submissions to a Make scenario</p>
                                </div>
                                <Switch
                                    checked={integrations.makeEnabled}
                                    onCheckedChange={(checked) => handleUpdate('makeEnabled', checked)}
                                />
                            </div>
                            {integrations.makeEnabled && (
                                <div className="animate-in slide-in-from-top-2 duration-300 pt-4 mt-2 border-t">
                                    <label className="text-sm font-medium mb-2 block">Webhook URL</label>
                                    <Input
                                        defaultValue={integrations.makeWebhook || ''}
                                        onBlur={(e) => handleUpdate('makeWebhook', e.target.value)}
                                        placeholder="https://hook.make.com/..."
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* n8n */}
                <Card className="p-6 transition-all duration-300 hover:shadow-lg">
                    <div className="flex items-start gap-5">
                        <div className="h-12 w-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center text-2xl border border-red-500/20 shrink-0">
                            🔗
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="space-y-0.5">
                                    <h3 className="text-lg font-semibold">n8n</h3>
                                    <p className="text-sm text-muted-foreground">Send submissions to an n8n workflow</p>
                                </div>
                                <Switch
                                    checked={integrations.n8nEnabled}
                                    onCheckedChange={(checked) => handleUpdate('n8nEnabled', checked)}
                                />
                            </div>
                            {integrations.n8nEnabled && (
                                <div className="animate-in slide-in-from-top-2 duration-300 pt-4 mt-2 border-t">
                                    <label className="text-sm font-medium mb-2 block">Webhook URL</label>
                                    <Input
                                        defaultValue={integrations.n8nWebhook || ''}
                                        onBlur={(e) => handleUpdate('n8nWebhook', e.target.value)}
                                        placeholder="https://your-n8n.com/webhook/..."
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Custom Webhook */}
                <Card className="p-6 transition-all duration-300 hover:shadow-lg">
                    <div className="flex items-start gap-5">
                        <div className="h-12 w-12 rounded-xl bg-gray-500/10 text-foreground flex items-center justify-center text-2xl border border-gray-500/20 shrink-0">
                            🌐
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="space-y-0.5">
                                    <h3 className="text-lg font-semibold">Custom Webhook</h3>
                                    <p className="text-sm text-muted-foreground">Send to any webhook URL</p>
                                </div>
                                <Switch
                                    checked={integrations.webhookEnabled}
                                    onCheckedChange={(checked) => handleUpdate('webhookEnabled', checked)}
                                />
                            </div>
                            {integrations.webhookEnabled && (
                                <div className="animate-in slide-in-from-top-2 duration-300 pt-4 mt-2 border-t">
                                    <label className="text-sm font-medium mb-2 block">Webhook URL</label>
                                    <Input
                                        defaultValue={integrations.webhookUrl || ''}
                                        onBlur={(e) => handleUpdate('webhookUrl', e.target.value)}
                                        placeholder="https://your-api.com/webhook"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {saving && (
                <div className="fixed bottom-6 right-6 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving...
                    </div>
                </div>
            )}
        </div>
    );
}
