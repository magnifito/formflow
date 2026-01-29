import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from './ui/Card';
import { X, Loader2, Save, Plus, Settings2 } from 'lucide-react';
import { Form, Integration } from '../hooks/useOrganization';
import {
  SlackConfig,
  DiscordConfig,
  TelegramConfig,
  WebhookConfig,
  EmailConfig,
} from './integrations';

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
  formFields?: string[];
}

// Common form field names for webhook field mapping
const DEFAULT_FORM_FIELDS = [
  'name',
  'email',
  'phone',
  'message',
  'subject',
  'company',
  'website',
];

const INTEGRATION_TYPES = [
  { value: 'email-smtp', label: 'Email Notifications' },
  { value: 'slack', label: 'Slack' },
  { value: 'discord', label: 'Discord' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'webhook', label: 'Webhook (Generic / Make / n8n)' },
];

export function IntegrationModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  organizationId,
  forms = [],
  defaultScope = 'organization',
  defaultFormId = null,
  formFields,
}: IntegrationModalProps) {
  const availableFormFields = formFields || DEFAULT_FORM_FIELDS;
  const [formData, setFormData] = useState<Partial<Integration>>({
    name: '',
    type: 'webhook',
    config: {},
    isActive: true,
    scope: 'organization',
    formId: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        scope: initialData.scope || 'organization',
        formId: initialData.formId ?? null,
      });
    } else {
      setFormData({
        name: '',
        type: 'webhook',
        config: {},
        isActive: true,
        organizationId,
        scope: defaultScope || 'organization',
        formId: defaultFormId ?? null,
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
        formId:
          (formData.scope || defaultScope) === 'form'
            ? (formData.formId ?? defaultFormId)
            : null,
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
    setFormData((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value,
      },
    }));
  };

  const updateNestedConfig = (
    parent: 'smtp' | 'oauth' | 'emailApi',
    key: string,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        [parent]: {
          ...(prev.config?.[parent] || {}),
          [key]: value,
        },
      },
    }));
  };

  const handleScopeChange = (scope: IntegrationScope) => {
    setFormData((prev) => ({
      ...prev,
      scope,
      formId: scope === 'form' ? (prev.formId ?? defaultFormId) : null,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-primary/10">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            {initialData ? (
              <Settings2 className="h-5 w-5 text-primary" />
            ) : (
              <Plus className="h-5 w-5 text-primary" />
            )}
            {initialData ? 'Edit Integration' : 'Add Integration'}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-8 w-8"
          >
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
                onChange={(e) =>
                  handleScopeChange(e.target.value as IntegrationScope)
                }
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
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        formId: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  >
                    <option value="">Select a form</option>
                    {forms.map((form) => (
                      <option key={form.id} value={form.id}>
                        {form.name}
                      </option>
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
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: e.target.value,
                    config: {},
                  }))
                }
                disabled={!!initialData}
              >
                {INTEGRATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., Marketing Slack"
                value={formData.name || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            {/* Dynamic Config Fields */}
            <div className="pt-4 border-t space-y-4">
              {formData.type === 'email-smtp' && (
                <EmailConfig
                  config={formData.config || {}}
                  onUpdate={updateConfig}
                  onUpdateNested={updateNestedConfig}
                />
              )}

              {formData.type === 'slack' && (
                <SlackConfig
                  config={formData.config || {}}
                  onUpdate={updateConfig}
                />
              )}

              {formData.type === 'discord' && (
                <DiscordConfig
                  config={formData.config || {}}
                  onUpdate={updateConfig}
                />
              )}

              {formData.type === 'telegram' && (
                <TelegramConfig
                  config={formData.config || {}}
                  onUpdate={updateConfig}
                />
              )}

              {formData.type === 'webhook' && (
                <WebhookConfig
                  config={formData.config || {}}
                  onUpdate={updateConfig}
                  formFields={availableFormFields}
                />
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3 pt-6 border-t bg-muted/20">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
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
