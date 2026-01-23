import { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Copy, RefreshCw, Eye, EyeOff, Check } from 'lucide-react';

interface ApiKeyWidgetProps {
    apiKey?: string;
    onRegenerate: () => Promise<void>;
}

export function ApiKeyWidget({ apiKey, onRegenerate }: ApiKeyWidgetProps) {
    const [showKey, setShowKey] = useState(false);
    const [copied, setCopied] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    const displayKey = apiKey
        ? (showKey ? apiKey : `••••••••••••••••${apiKey.slice(-4)}`)
        : 'No API Key found';

    const handleCopy = () => {
        if (!apiKey) return;
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRegenerate = async () => {
        if (!confirm('Are you sure you want to regenerate your API key? The old key will stop working immediately.')) return;
        setRegenerating(true);
        try {
            await onRegenerate();
        } finally {
            setRegenerating(false);
        }
    };

    return (
        <Card className="overflow-hidden border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    API Management
                </CardTitle>
                <CardDescription>
                    Use this key to authenticate your requests to the FormFlow API.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-background border rounded-lg shadow-inner group">
                    <code className="flex-1 font-mono text-sm overflow-hidden truncate">
                        {displayKey}
                    </code>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setShowKey(!showKey)}
                            title={showKey ? "Hide key" : "Show key"}
                        >
                            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleCopy}
                            disabled={!apiKey}
                            title="Copy to clipboard"
                        >
                            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </Button>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={handleRegenerate}
                        disabled={regenerating}
                    >
                        <RefreshCw size={14} className={`mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                        Regenerate Key
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
