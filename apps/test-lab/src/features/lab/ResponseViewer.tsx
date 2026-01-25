import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import type { SubmissionResponse } from '../../lib/types';

interface ResponseViewerProps {
    response: SubmissionResponse | null;
    status: number | null;
    duration: number | null;
    error: string | null;
}

export function ResponseViewer({ response, status, duration, error }: ResponseViewerProps) {
    if (!response && !error) {
        return (
            <Card className="h-full bg-muted/20 border-dashed flex items-center justify-center text-muted-foreground">
                <div className="text-center p-6">
                    <p>No response yet.</p>
                    <p className="text-xs mt-1">Submit a form to see the result.</p>
                </div>
            </Card>
        );
    }

    const isSuccess = status && status >= 200 && status < 300;

    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="bg-muted/30 pb-3 border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        {isSuccess ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                        Response
                    </CardTitle>
                    <div className="flex items-center gap-3 text-xs font-mono">
                        {status && (
                            <span className={`px-2 py-0.5 rounded ${isSuccess ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {status}
                            </span>
                        )}
                        {duration && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {duration}ms
                            </span>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden relative">
                <div className="absolute inset-0 overflow-auto p-4 font-mono text-sm">
                    {error ? (
                        <div className="space-y-4">
                            <div className="text-destructive font-bold border-b pb-2 mb-2">{error}</div>
                            {response && (
                                <div className="space-y-2">
                                    <div className="text-xs font-semibold text-muted-foreground">Backend Response:</div>
                                    <pre className="text-xs text-destructive/80 bg-destructive/10 p-2 rounded overflow-auto whitespace-pre-wrap">
                                        {typeof response === 'string' ? response : JSON.stringify(response, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ) : (
                        <pre className="text-primary/90">
                            {JSON.stringify(response, null, 2)}
                        </pre>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
