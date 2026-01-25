import { useEffect, useState } from 'react';
import { useOrganization, Integration } from '../../hooks/useOrganization';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { Badge } from '../../components/ui/Badge';
import { Loader2, Plus, Mail, Hash, MessageSquare, Send, Globe, Trash2, Settings2, Layers } from 'lucide-react';
import { IntegrationModal } from '../../components/IntegrationModal';
import { IntegrationGraph } from './IntegrationGraph';

type Scope = 'organization' | 'form';

const getIcon = (type: string) => {
    switch (type) {
        case 'email-smtp':
        case 'email-api':
            return <Mail className="h-6 w-6 text-blue-500" />;
        case 'slack':
            return <Hash className="h-6 w-6 text-emerald-500" />;
        case 'discord':
            return <MessageSquare className="h-6 w-6 text-indigo-500" />;
        case 'telegram':
            return <Send className="h-6 w-6 text-sky-500" />;
        default:
            return <Globe className="h-6 w-6 text-gray-500" />;
    }
};

const getLabel = (type: string) => {
    switch (type) {
        case 'email-smtp': return 'Email (SMTP)';
        case 'email-api': return 'Email (API)';
        case 'slack': return 'Slack';
        case 'discord': return 'Discord';
        case 'telegram': return 'Telegram';
        default: return 'Webhook';
    }
};

const formatDate = (value?: string) => {
    if (!value) return '';
    return new Date(value).toLocaleString();
};

export function IntegrationsPage() {
    const {
        forms,
        integrationHierarchy,
        integrations,
        loading,
        loadIntegrations,
        createIntegration,
        updateIntegration,
        deleteIntegration
    } = useOrganization();

    const orgIntegrations = integrationHierarchy?.organizationIntegrations ?? integrations ?? [];
    const formNodes = integrationHierarchy?.forms ?? [];

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [targetScope, setTargetScope] = useState<Scope>('organization');
    const [targetFormId, setTargetFormId] = useState<number | null>(null);

    useEffect(() => {
        loadIntegrations();
    }, [loadIntegrations]);

    const handleCreate = async (data: Partial<Integration>) => {
        const scope = (data.scope as Scope) || targetScope;
        const formId = scope === 'form' ? (data.formId ?? targetFormId) : null;
        await createIntegration({ ...data, scope, formId });
    };

    const handleUpdate = async (data: Partial<Integration>) => {
        if (!selectedIntegration) return;
        setProcessingId(selectedIntegration.id);
        const scope = (data.scope as Scope) || (selectedIntegration.scope as Scope) || (selectedIntegration.formId ? 'form' : 'organization');
        const formId = scope === 'form' ? (data.formId ?? selectedIntegration.formId ?? targetFormId) : null;

        try {
            await updateIntegration(selectedIntegration.id, { ...data, scope, formId });
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this integration?')) return;
        setProcessingId(id);
        try {
            await deleteIntegration(id);
        } finally {
            setProcessingId(null);
        }
    };

    const handleToggle = async (integration: Integration) => {
        setProcessingId(integration.id);
        try {
            await updateIntegration(integration.id, { isActive: !integration.isActive });
        } finally {
            setProcessingId(null);
        }
    };

    const openEdit = (integration: Integration) => {
        setSelectedIntegration(integration);
        setTargetScope((integration.scope as Scope) || (integration.formId ? 'form' : 'organization'));
        setTargetFormId(integration.formId ?? null);
        setIsModalOpen(true);
    };

    const openCreate = (scope: Scope, formId?: number | null) => {
        setSelectedIntegration(null);
        setTargetScope(scope);
        setTargetFormId(formId ?? null);
        setIsModalOpen(true);
    };

    const emptyOrg = !loading && orgIntegrations.length === 0;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
                    <p className="text-muted-foreground">Stack org defaults with form overrides and see the hierarchy at a glance.</p>
                </div>
                <Button onClick={() => openCreate('organization')} className="shadow-lg shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Integration
                </Button>
            </div>

            <Card className="border-primary/20 shadow-lg shadow-primary/10">
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        Hierarchy map
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">Org defaults in blue, form overrides in amber, inherited nodes in teal.</div>
                </CardHeader>
                <CardContent className="p-0">
                    <IntegrationGraph hierarchy={integrationHierarchy} />
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Organization defaults</CardTitle>
                            <p className="text-sm text-muted-foreground">Applied to all forms unless overridden.</p>
                        </div>
                        <Badge variant="secondary">{orgIntegrations.length}</Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {loading && orgIntegrations.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Loading integrations...
                            </div>
                        ) : emptyOrg ? (
                            <div className="py-10 text-center text-muted-foreground space-y-2">
                                <p className="font-medium">No org-level integrations yet.</p>
                                <Button variant="outline" size="sm" onClick={() => openCreate('organization')}>Add one</Button>
                            </div>
                        ) : (
                            orgIntegrations.map((integration) => (
                                <div key={integration.id} className="p-4 rounded-xl border bg-muted/20 flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-background border">{getIcon(integration.type)}</div>
                                            <div>
                                                <div className="font-semibold leading-tight">{integration.name}</div>
                                                <div className="text-xs text-muted-foreground">{getLabel(integration.type)}</div>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={integration.isActive}
                                            onCheckedChange={() => handleToggle(integration)}
                                            disabled={processingId === integration.id}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{formatDate(integration.createdAt)}</span>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openEdit(integration)}>
                                                <Settings2 className="mr-2 h-3 w-3" /> Edit
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(integration.id)}
                                                disabled={processingId === integration.id}
                                            >
                                                {processingId === integration.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-4">
                    {formNodes.length === 0 && (
                        <Card>
                            <CardContent className="py-10 text-center text-muted-foreground">
                                {loading ? 'Loading forms...' : 'No forms available yet.'}
                            </CardContent>
                        </Card>
                    )}

                    {formNodes.map((form) => (
                        <Card key={form.id} className="border-muted/70">
                            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        {form.name}
                                        {!form.useOrgIntegrations && (
                                            <Badge variant="destructive" className="text-[11px]">Org defaults disabled</Badge>
                                        )}
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">Slug: {form.slug}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => openCreate('form', form.id)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add form override
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Effective stack</div>
                                    <div className="flex flex-wrap gap-2">
                                        {form.effectiveIntegrations.map((integration) => (
                                            <Badge key={`${integration.id || integration.name}-${integration.type}`} variant="secondary" className="gap-1">
                                                {getIcon(integration.type)}
                                                <span>{integration.name || getLabel(integration.type)}</span>
                                                {integration.scope === 'form' && <span className="text-amber-600 ml-1">(override)</span>}
                                            </Badge>
                                        ))}
                                        {form.effectiveIntegrations.length === 0 && (
                                            <span className="text-xs text-muted-foreground italic">No active integrations</span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Form overrides</div>
                                    {form.integrations.length === 0 ? (
                                        <div className="text-sm text-muted-foreground italic">
                                            {form.useOrgIntegrations ? 'Inheriting organization defaults.' : 'Org defaults disabled. Add overrides to process submissions.'}
                                        </div>
                                    ) : (
                                        form.integrations.map((integration) => (
                                            <div key={integration.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-background border">{getIcon(integration.type)}</div>
                                                    <div>
                                                        <div className="font-medium leading-tight">{integration.name}</div>
                                                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                            <span>{getLabel(integration.type)}</span>
                                                            <span>•</span>
                                                            <span>{integration.isActive ? 'Active' : 'Disabled'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={integration.isActive}
                                                        onCheckedChange={() => handleToggle(integration)}
                                                        disabled={processingId === integration.id}
                                                    />
                                                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openEdit(integration)}>
                                                        <Settings2 className="mr-2 h-3 w-3" /> Edit
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDelete(integration.id)}
                                                        disabled={processingId === integration.id}
                                                    >
                                                        {processingId === integration.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {form.legacyIntegrations && form.legacyIntegrations.length > 0 && (
                                        <div className="text-xs text-amber-600">
                                            Legacy integration detected; migrate by adding a new override to replace it.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <IntegrationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={selectedIntegration ? handleUpdate : handleCreate}
                initialData={selectedIntegration}
                forms={forms}
                defaultScope={targetScope}
                defaultFormId={targetFormId}
            />
        </div>
    );
}
