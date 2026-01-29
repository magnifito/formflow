import { useEffect, useState } from 'react';
import { useOrganization, Integration } from '../../hooks/useOrganization';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { Badge } from '../../components/ui/Badge';
import {
  Loader2,
  Plus,
  Mail,
  Hash,
  MessageSquare,
  Send,
  Globe,
  Trash2,
  Settings2,
  X,
} from 'lucide-react';
import { IntegrationModal } from '../../components/IntegrationModal';
import { IntegrationTable, PillData } from './IntegrationGraph';

type Scope = 'organization' | 'form';

const getIcon = (type: string) => {
  switch (type) {
    case 'email-smtp':
    case 'email-api':
      return <Mail className="h-5 w-5" />;
    case 'slack':
      return <Hash className="h-5 w-5" />;
    case 'discord':
      return <MessageSquare className="h-5 w-5" />;
    case 'telegram':
      return <Send className="h-5 w-5" />;
    default:
      return <Globe className="h-5 w-5" />;
  }
};

const labelForType = (type: string) => {
  switch (type) {
    case 'email-smtp':
      return 'Email (SMTP)';
    case 'email-api':
      return 'Email (API)';
    case 'slack':
      return 'Slack';
    case 'discord':
      return 'Discord';
    case 'telegram':
      return 'Telegram';
    case 'webhook':
      return 'Webhook';
    default:
      return type;
  }
};

const formatDate = (value?: string) => {
  if (!value) return '';
  return new Date(value).toLocaleString();
};

export function IntegrationsPage() {
  const {
    forms,
    organization,
    integrationHierarchy,
    integrations,
    loadIntegrations,
    createIntegration,
    updateIntegration,
    deleteIntegration,
  } = useOrganization();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [targetScope, setTargetScope] = useState<Scope>('organization');
  const [targetFormId, setTargetFormId] = useState<number | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<PillData | null>(null);

  // Find full integration object from ID
  const findIntegration = (id?: number): Integration | null => {
    if (!id) return null;
    const orgInt = integrations.find((i) => i.id === id);
    if (orgInt) return orgInt;

    const formNodes = integrationHierarchy?.forms || [];
    for (const form of formNodes) {
      const formInt = form.integrations?.find((i) => i.id === id);
      if (formInt) return formInt as Integration;
    }
    return null;
  };

  const drawerIntegration = drawerData?.integrationId
    ? findIntegration(drawerData.integrationId)
    : null;
  const drawerForm = drawerData?.formId
    ? forms.find((f) => f.id === drawerData.formId)
    : null;

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const handleCreate = async (data: Partial<Integration>) => {
    const scope = (data.scope as Scope) || targetScope;
    const formId = scope === 'form' ? (data.formId ?? targetFormId) : null;
    await createIntegration({ ...data, scope, formId });
    setDrawerOpen(false);
  };

  const handleUpdate = async (data: Partial<Integration>) => {
    if (!selectedIntegration) return;
    setProcessingId(selectedIntegration.id);
    const scope =
      (data.scope as Scope) ||
      (selectedIntegration.scope as Scope) ||
      (selectedIntegration.formId ? 'form' : 'organization');
    const formId =
      scope === 'form'
        ? (data.formId ?? selectedIntegration.formId ?? targetFormId)
        : null;

    try {
      await updateIntegration(selectedIntegration.id, {
        ...data,
        scope,
        formId,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this integration?')) return;
    setProcessingId(id);
    try {
      await deleteIntegration(id);
      setDrawerOpen(false);
      setDrawerData(null);
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggle = async (integration: Integration) => {
    setProcessingId(integration.id);
    try {
      await updateIntegration(integration.id, {
        isActive: !integration.isActive,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCellClick = (data: PillData) => {
    setDrawerData(data);
    setDrawerOpen(true);
  };

  const openEdit = (integration: Integration) => {
    setSelectedIntegration(integration);
    setTargetScope(
      (integration.scope as Scope) ||
        (integration.formId ? 'form' : 'organization'),
    );
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
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Manage how forms connect to external services
            </p>
          </div>
          <Button
            onClick={() => openCreate('organization')}
            className="shadow-lg shadow-primary/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Integration
          </Button>
        </div>
      </div>

      {/* Full-width Table */}
      <div className="p-6">
        <IntegrationTable
          hierarchy={integrationHierarchy}
          onCellClick={handleCellClick}
          organizationName={organization?.name}
        />
      </div>

      {/* Slide-out Drawer */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 animate-in fade-in duration-200"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-2xl z-50 animate-in slide-in-from-right duration-300">
            <div className="flex flex-col h-full">
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-3">
                  {drawerData && (
                    <div
                      className={`p-2 rounded-lg ${drawerData.isPlaceholder ? 'bg-muted' : drawerData.colorClass}`}
                    >
                      {drawerData.isPlaceholder ? (
                        <Globe className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <span className="text-white">
                          {getIcon(drawerData.metaType || 'webhook')}
                        </span>
                      )}
                    </div>
                  )}
                  <div>
                    <h2 className="font-semibold">
                      {drawerIntegration?.name ||
                        drawerData?.label ||
                        'Integration'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {drawerData?.scope === 'organization'
                        ? 'Organization default'
                        : drawerData?.formName || 'Form'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDrawerOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {drawerIntegration ? (
                  <>
                    {/* Status */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div>
                        <div className="text-sm font-medium">Status</div>
                        <div className="text-xs text-muted-foreground">
                          {drawerIntegration.isActive
                            ? 'Integration is active'
                            : 'Integration is disabled'}
                        </div>
                      </div>
                      <Switch
                        checked={drawerIntegration.isActive}
                        onCheckedChange={() => handleToggle(drawerIntegration)}
                        disabled={processingId === drawerIntegration.id}
                      />
                    </div>

                    {/* Details */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Type</span>
                          <Badge variant="outline">
                            {labelForType(drawerIntegration.type)}
                          </Badge>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Scope</span>
                          <span>
                            {drawerData?.scope === 'organization'
                              ? 'Organization'
                              : 'Form'}
                          </span>
                        </div>
                        {drawerForm && (
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Form</span>
                            <span>{drawerForm.name}</span>
                          </div>
                        )}
                        {drawerData?.isInherited && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs">
                            <span>
                              This integration is inherited from organization
                              defaults
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Created</span>
                          <span className="text-xs">
                            {formatDate(drawerIntegration.createdAt)}
                          </span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-muted-foreground">Updated</span>
                          <span className="text-xs">
                            {formatDate(drawerIntegration.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : drawerData?.isPlaceholder ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="p-4 rounded-full bg-muted inline-flex mx-auto">
                      <Globe className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        No Integration Configured
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {drawerData.scope === 'organization'
                          ? 'Add an organization default for this type'
                          : `Add a ${labelForType(drawerData.metaType || 'webhook')} integration for ${drawerData.formName}`}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Drawer Footer */}
              <div className="border-t p-4 space-y-2">
                {drawerIntegration && !drawerData?.isInherited ? (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => openEdit(drawerIntegration)}
                    >
                      <Settings2 className="mr-2 h-4 w-4" />
                      Edit Configuration
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(drawerIntegration.id)}
                      disabled={processingId === drawerIntegration.id}
                    >
                      {processingId === drawerIntegration.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Delete Integration
                    </Button>
                  </>
                ) : drawerData?.isInherited ? (
                  <Button
                    className="w-full"
                    onClick={() => openCreate('form', drawerData.formId)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Override
                  </Button>
                ) : drawerData?.isPlaceholder ? (
                  <Button
                    className="w-full"
                    onClick={() =>
                      openCreate(
                        drawerData.scope || 'organization',
                        drawerData.formId,
                      )
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Integration
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}

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
