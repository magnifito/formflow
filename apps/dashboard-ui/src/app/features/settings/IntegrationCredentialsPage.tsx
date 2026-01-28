import { useEffect, useState } from 'react';
import { useOrganization } from '../../hooks/useOrganization';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Loader2, Key, MessageSquare, Send, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';

export function IntegrationCredentialsPage() {
    const { botCredentials, loadBotCredentials, updateBotCredentials, loading } = useOrganization();

    const [slackToken, setSlackToken] = useState('');
    const [telegramToken, setTelegramToken] = useState('');
    const [showSlackToken, setShowSlackToken] = useState(false);
    const [showTelegramToken, setShowTelegramToken] = useState(false);
    const [saving, setSaving] = useState<'slack' | 'telegram' | null>(null);
    const [success, setSuccess] = useState<'slack' | 'telegram' | null>(null);

    useEffect(() => {
        loadBotCredentials();
    }, [loadBotCredentials]);

    const handleSaveSlack = async () => {
        setSaving('slack');
        setSuccess(null);
        try {
            await updateBotCredentials({ slackBotToken: slackToken });
            setSlackToken('');
            setSuccess('slack');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Failed to save Slack token:', err);
        } finally {
            setSaving(null);
        }
    };

    const handleSaveTelegram = async () => {
        setSaving('telegram');
        setSuccess(null);
        try {
            await updateBotCredentials({ telegramBotToken: telegramToken });
            setTelegramToken('');
            setSuccess('telegram');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Failed to save Telegram token:', err);
        } finally {
            setSaving(null);
        }
    };

    const handleClearSlack = async () => {
        if (!confirm('Remove Slack bot token? Slack integrations will stop working.')) return;
        setSaving('slack');
        try {
            await updateBotCredentials({ slackBotToken: '' });
        } finally {
            setSaving(null);
        }
    };

    const handleClearTelegram = async () => {
        if (!confirm('Remove Telegram bot token? Telegram integrations will stop working.')) return;
        setSaving('telegram');
        try {
            await updateBotCredentials({ telegramBotToken: '' });
        } finally {
            setSaving(null);
        }
    };

    if (loading && !botCredentials) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Integration Credentials</h1>
                <p className="text-muted-foreground">
                    Configure bot tokens for Slack and Telegram integrations. These are shared across all integrations in your organization.
                </p>
            </div>

            {/* Slack */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-emerald-500" />
                        <CardTitle>Slack Bot Token</CardTitle>
                    </div>
                    <CardDescription>
                        Your Slack bot token is used for all Slack integrations. Get it from your Slack app's OAuth & Permissions page.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border">
                        <div className={`p-2 rounded-full ${botCredentials?.hasSlackToken ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                            {botCredentials?.hasSlackToken ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium">
                                {botCredentials?.hasSlackToken ? 'Token configured' : 'No token configured'}
                            </h3>
                            {botCredentials?.slackBotToken && (
                                <p className="text-sm text-muted-foreground font-mono">
                                    {botCredentials.slackBotToken}
                                </p>
                            )}
                        </div>
                        {botCredentials?.hasSlackToken && (
                            <Button variant="outline" size="sm" onClick={handleClearSlack} disabled={saving === 'slack'}>
                                Remove
                            </Button>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            {botCredentials?.hasSlackToken ? 'Update token' : 'Add token'}
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    type={showSlackToken ? 'text' : 'password'}
                                    placeholder="xoxb-..."
                                    value={slackToken}
                                    onChange={(e) => setSlackToken(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowSlackToken(!showSlackToken)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showSlackToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <Button onClick={handleSaveSlack} disabled={!slackToken || saving === 'slack'}>
                                {saving === 'slack' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                            </Button>
                        </div>
                        {success === 'slack' && (
                            <p className="text-sm text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4" /> Token saved successfully
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Telegram */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Send className="h-5 w-5 text-sky-500" />
                        <CardTitle>Telegram Bot Token</CardTitle>
                    </div>
                    <CardDescription>
                        Your Telegram bot token is used for all Telegram integrations. Get it from @BotFather on Telegram.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border">
                        <div className={`p-2 rounded-full ${botCredentials?.hasTelegramToken ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                            {botCredentials?.hasTelegramToken ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium">
                                {botCredentials?.hasTelegramToken ? 'Token configured' : 'No token configured'}
                            </h3>
                            {botCredentials?.telegramBotToken && (
                                <p className="text-sm text-muted-foreground font-mono">
                                    {botCredentials.telegramBotToken}
                                </p>
                            )}
                        </div>
                        {botCredentials?.hasTelegramToken && (
                            <Button variant="outline" size="sm" onClick={handleClearTelegram} disabled={saving === 'telegram'}>
                                Remove
                            </Button>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            {botCredentials?.hasTelegramToken ? 'Update token' : 'Add token'}
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    type={showTelegramToken ? 'text' : 'password'}
                                    placeholder="123456789:ABCdefGHI..."
                                    value={telegramToken}
                                    onChange={(e) => setTelegramToken(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowTelegramToken(!showTelegramToken)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showTelegramToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <Button onClick={handleSaveTelegram} disabled={!telegramToken || saving === 'telegram'}>
                                {saving === 'telegram' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                            </Button>
                        </div>
                        {success === 'telegram' && (
                            <p className="text-sm text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4" /> Token saved successfully
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Info */}
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">How it works</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>
                        Bot tokens are configured at the organization level and automatically used by all Slack and Telegram integrations.
                    </p>
                    <p>
                        When creating a new integration, you only need to specify the <strong>channel ID</strong> (Slack) or <strong>chat ID</strong> (Telegram) - the bot token is already set here.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
