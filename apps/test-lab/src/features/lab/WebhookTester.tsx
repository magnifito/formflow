import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { RefreshCw, Trash2, Clock, Terminal, ChevronDown, ChevronRight } from 'lucide-react';

interface WebhookRequest {
    id: string;
    timestamp: string;
    method: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
    query: Record<string, string>;
}

export function WebhookTester() {
    const [webhooks, setWebhooks] = useState<WebhookRequest[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const baseUrl = useMemo(() => import.meta.env.VITE_WEBHOOK_BASE_URL || '', []);
    const apiPath = `${baseUrl}/api/webhooks`;
    const webhookUrl = `${window.location.origin}/webhook`;

    const fetchWebhooks = useCallback(async () => {
        try {
            const response = await axios.get(apiPath);
            setWebhooks(response.data);
            setError(null);
        } catch (err) {
            setError((err as Error)?.message || 'Failed to fetch webhooks');
            console.error('Failed to fetch webhooks:', err);
        }
    }, [apiPath]);

    const clearWebhooks = async () => {
        if (!confirm('Clear all received webhooks?')) return;
        try {
            await axios.delete(apiPath);
            setWebhooks([]);
        } catch (error) {
            console.error('Failed to clear webhooks:', error);
        }
    };

    useEffect(() => {
        void fetchWebhooks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (autoRefresh) {
            interval = setInterval(fetchWebhooks, 3000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh, fetchWebhooks]);

    const toggleExpand = (id: string) => {
        console.log('Toggling webhook id:', id);
        setExpandedId(prev => prev === id ? null : id);
    };

    return (
        <Card className="h-full flex flex-col border-primary/20 bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-primary" />
                        Webhook Tester
                    </CardTitle>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 group">
                        <span className="font-mono bg-muted px-1 py-0.5 rounded cursor-pointer group-hover:bg-primary/10 group-hover:text-primary transition-colors select-all">
                            {webhookUrl}
                        </span>
                        {baseUrl && <span className="text-[10px] text-muted-foreground">(API: {apiPath})</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        title={autoRefresh ? "Disable Auto-refresh" : "Enable Auto-refresh"}
                    >
                        <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'rotate-animation' : ''}`} />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={clearWebhooks}
                        title="Clear List"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin">
                {error && (
                    <div className="px-4 py-3 text-xs text-destructive bg-destructive/10 border-b border-destructive/30">
                        {error}. Make sure the Lab dev server is running (port {window.location.port || '4200'}) so /api/webhooks is reachable.
                    </div>
                )}
                {webhooks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                        <Terminal className="w-12 h-12 mb-2 opacity-20" />
                        <p className="text-sm">No webhooks received yet.</p>
                        <p className="text-xs opacity-60 mt-1">Send a POST request to the URL above to see it here.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {webhooks.map((webhook) => (
                            <li key={webhook.id} className={`flex flex-col transition-all duration-200 ${expandedId === webhook.id ? 'bg-muted/30' : ''}`}>
                                <div
                                    role="button"
                                    tabIndex={0}
                                    className="w-full text-left p-3 hover:bg-muted/50 transition-colors flex items-center gap-3 cursor-pointer group select-none outline-none focus:bg-muted/50"
                                    onClick={() => toggleExpand(webhook.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            toggleExpand(webhook.id);
                                        }
                                    }}
                                >
                                    <div className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                                        {expandedId === webhook.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${webhook.method === 'POST' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {webhook.method}
                                                </span>
                                                <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[150px]">
                                                    {webhook.id}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase">
                                                <Clock className="w-3 h-3" />
                                                {new Date(webhook.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className="text-xs font-mono truncate opacity-60">
                                            {JSON.stringify(webhook.body).substring(0, 80)}
                                            {JSON.stringify(webhook.body).length > 80 ? '...' : ''}
                                        </div>
                                    </div>
                                </div>

                                {expandedId === webhook.id && (
                                    <div className="px-10 pb-4 pt-1 text-[11px] font-mono space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-muted-foreground uppercase text-[9px]">Headers</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 px-1.5 text-[9px]"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(JSON.stringify(webhook.headers, null, 2));
                                                        }}
                                                    >
                                                        Copy
                                                    </Button>
                                                </div>
                                                <pre className="p-2 bg-background/50 rounded border whitespace-pre-wrap max-h-40 overflow-y-auto scrollbar-thin">
                                                    {JSON.stringify(webhook.headers || {}, null, 2)}
                                                </pre>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-muted-foreground uppercase text-[9px]">Query Params</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 px-1.5 text-[9px]"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const query = webhook.query || {};
                                                            navigator.clipboard.writeText(JSON.stringify(query, null, 2));
                                                        }}
                                                    >
                                                        Copy
                                                    </Button>
                                                </div>
                                                <pre className="p-2 bg-background/50 rounded border whitespace-pre-wrap max-h-40 overflow-y-auto scrollbar-thin">
                                                    {webhook.query && Object.keys(webhook.query).length > 0
                                                        ? JSON.stringify(webhook.query, null, 2)
                                                        : "{}"}
                                                </pre>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-muted-foreground uppercase text-[9px]">Body</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 px-1.5 text-[9px]"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const body = webhook.body || {};
                                                        navigator.clipboard.writeText(JSON.stringify(body, null, 2));
                                                    }}
                                                >
                                                    Copy JSON
                                                </Button>
                                            </div>
                                            <pre className="p-3 bg-background/80 rounded border whitespace-pre-wrap text-primary border-primary/20 shadow-inner">
                                                {JSON.stringify(webhook.body, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>

            <div className="p-2 border-t bg-muted/20 text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
                Live Data Feed
            </div>
        </Card>
    );
}
