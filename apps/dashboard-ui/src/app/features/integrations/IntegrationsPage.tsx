import { useEffect, useState } from 'react';
import { useOrganization, Integration } from '../../hooks/useOrganization';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { Badge } from '../../components/ui/Badge';
import { Loader2, Plus, Mail, Hash, MessageSquare, Send, Globe, Trash2, Settings2, Layers, ArrowDown } from 'lucide-react';
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

const labelForType = (type: string) => {
    switch (type) {
        case 'email-smtp': return 'Email (SMTP)';
        case 'email-api': return 'Email (API)';
        case 'slack': return 'Slack';
        case 'discord': return 'Discord';
        case 'telegram': return 'Telegram';
        case 'webhook': return 'Webhook';
        default: return type;
    }
};

const getLabel = labelForType;

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
    const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);

    // Helper to find full integration object from ID
    const findIntegration = (id?: number) => {
        if (!id) return null;
        // Search in org integrations
        const orgInt = integrations.find(i => i.id === id);
        if (orgInt) return orgInt;

        // Search in forms
        for (const form of formNodes) {
            const formInt = form.integrations?.find((i: any) => i.id === id);
            if (formInt) return formInt as Integration;
        }
        return null;
    };

    // Derived state for the details panel
    const detailIntegration = selectedNodeData?.integrationId ? findIntegration(selectedNodeData.integrationId) : null;
    const detailForm = selectedNodeData?.formId ? forms.find(f => f.id === selectedNodeData.formId) : null;
    const isPlaceholder = selectedNodeData?.isPlaceholder;
    const isInherited = selectedNodeData?.isInherited;

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

    const handleNodeClick = (data: any) => {
        setSelectedNodeData(data);
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

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
                    <p className="text-muted-foreground">Visualize and manage your integration stack using the interactive map.</p>
                </div>
                <Button onClick={() => openCreate('organization')} className="shadow-lg shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" />
                    New Integration
                </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-12 items-start h-[calc(100vh-200px)] min-h-[800px]">
                {/* Left: Interactive Map */}
                <Card className="lg:col-span-8 h-full flex flex-col border-primary/20 shadow-lg shadow-primary/10 overflow-hidden">
                    <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b bg-muted/10 shrink-0">
                        <CardTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-primary" />
                            Hierarchy Map
                        </CardTitle>
                        <div className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded-md border">
                            Select any node to view details or manage configuration.
                        </div>
                    </CardHeader>
                    <div className="flex-1 min-h-0 relative">
                        <IntegrationGraph hierarchy={integrationHierarchy} onNodeClick={handleNodeClick} />
                    </div>
                </Card>

                {/* Right: Details Panel */}
                <Card className="lg:col-span-4 h-full flex flex-col border-border/60 shadow-md">
                    <CardHeader className="border-b bg-muted/20 shrink-0">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Settings2 className="h-5 w-5" />
                            Configuration Details
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-y-auto p-6">
                        {!selectedNodeData ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                                <Globe className="h-16 w-16 mb-4 opacity-10" />
                                <h3 className="font-semibold text-foreground mb-1">No Selection</h3>
                                <p className="text-sm max-w-[250px]">
                                    Click on any box in the hierarchy map to view its details, edit settings, or add overrides.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* Context Header */}
                                <div className="space-y-1 pb-4 border-b">
                                    <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                                        Context
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-semibold text-lg">
                                            {selectedNodeData.scope === 'organization' ? 'Organization Default' : (detailForm?.name || 'Form Override')}
                                        </span>
                                        {selectedNodeData.scope === 'form' && (
                                            <Badge variant="outline" className="text-[11px] font-normal">
                                                {detailForm?.slug}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground capitalize">
                                        {selectedNodeData.metaType === 'none' ? 'General' : labelForType(selectedNodeData.metaType)} Integration
                                    </div>
                                </div>

                                {/* Content based on selection type */}
                                {detailIntegration ? (
                                    <div className="space-y-6">
                                        <div className="p-4 rounded-xl border bg-primary/5 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-background border shadow-sm">
                                                        {getIcon(detailIntegration.type)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">{detailIntegration.name}</div>
                                                        <div className="text-xs text-muted-foreground">{getLabel(detailIntegration.type)}</div>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={detailIntegration.isActive}
                                                    onCheckedChange={() => handleToggle(detailIntegration)}
                                                    disabled={processingId === detailIntegration.id}
                                                />
                                            </div>

                                            {isInherited && (
                                                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-900">
                                                    <ArrowDown className="h-3 w-3" />
                                                    <span>Inherited from organization defaults.</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <div className="text-sm font-medium">Actions</div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => openEdit(detailIntegration)}
                                                    className="w-full justify-start"
                                                >
                                                    <Settings2 className="mr-2 h-4 w-4" />
                                                    Edit Config
                                                </Button>
                                                {!isInherited && (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => handleDelete(detailIntegration.id)}
                                                        disabled={processingId === detailIntegration.id}
                                                        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    >
                                                        {processingId === detailIntegration.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                                        Delete
                                                    </Button>
                                                )}
                                            </div>
                                            {isInherited && (
                                                <Button
                                                    variant="default"
                                                    onClick={() => openCreate('form', selectedNodeData.formId)}
                                                    className="w-full"
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Override this integration
                                                </Button>
                                            )}
                                        </div>

                                        <div className="text-xs text-muted-foreground">
                                            <div className="flex justify-between py-2 border-t">
                                                <span>Created</span>
                                                <span>{formatDate(detailIntegration.createdAt)}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-t">
                                                <span>Last Updated</span>
                                                <span>{formatDate(detailIntegration.updatedAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : isPlaceholder ? (
                                    <div className="py-8 text-center space-y-4">
                                        <div className="p-4 rounded-full bg-muted inline-flex">
                                            <Layers className="h-8 w-8 text-muted-foreground opacity-50" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-semibold">No Configuration</h4>
                                            <p className="text-sm text-muted-foreground">
                                                There is no integration configured for this slot.
                                            </p>
                                        </div>
                                        <Button onClick={() => openCreate(selectedNodeData.scope, selectedNodeData.formId)}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            {selectedNodeData.scope === 'organization' ? 'Add Default' : 'Add Override'}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-muted-foreground">
                                        Select a specific integration to see details.
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
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
