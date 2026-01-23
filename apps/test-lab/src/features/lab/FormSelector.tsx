import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Form } from '../../lib/types';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { FileText, RefreshCw, Hash } from 'lucide-react';

interface FormSelectorProps {
    onFormSelect: (form: Form) => void;
    selectedFormId: number | null;
}

export function FormSelector({ onFormSelect, selectedFormId }: FormSelectorProps) {
    const [forms, setForms] = useState<Form[]>([]);
    const [loading, setLoading] = useState(true);

    const loadForms = async () => {
        setLoading(true);
        try {
            const data = await api.org.getForms();
            setForms(data);
        } catch (error) {
            console.error('Failed to load forms', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadForms();
    }, []);

    return (
        <Card className="h-full flex flex-col border-0 shadow-none bg-transparent">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Your Forms
                </h3>
                <Button variant="ghost" size="icon" onClick={loadForms} title="Refresh Forms">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                {forms.map(form => (
                    <button
                        key={form.id}
                        onClick={() => onFormSelect(form)}
                        className={`w-full text-left p-3 rounded-md border transition-all hover:bg-accent group
                        ${selectedFormId === form.id ? 'bg-accent border-primary ring-1 ring-primary' : 'bg-card border-border'}
                    `}
                    >
                        <div className="font-medium truncate">{form.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-mono group-hover:text-foreground/80">
                            <Hash className="w-3 h-3" />
                            {form.submitHash.slice(0, 8)}...
                        </div>
                    </button>
                ))}

                {!loading && forms.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-8 border rounded-md border-dashed">
                        No forms found for this organization.
                    </div>
                )}
            </div>
        </Card>
    );
}
