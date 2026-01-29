import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import {
  Webhook,
  HelpCircle,
  Play,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  ChevronsRight,
} from 'lucide-react';

interface WebhookConfigProps {
  config: Record<string, any>;
  onUpdate: (key: string, value: any) => void;
  formFields?: string[];
}

type TabMode = 'simple' | 'advanced';

interface KeyValuePair {
  key: string;
  value: string;
}

function KeyValueBuilder({
  label,
  keyPlaceholder,
  pairs,
  onChange,
  formFields,
  showFieldSelector = false,
}: {
  label: string;
  keyPlaceholder: string;
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  formFields?: string[];
  showFieldSelector?: boolean;
}) {
  const addPair = () => {
    onChange([...pairs, { key: '', value: '' }]);
  };

  const removePair = (index: number) => {
    onChange(pairs.filter((_, i) => i !== index));
  };

  const updatePair = (index: number, field: 'key' | 'value', value: string) => {
    const updated = pairs.map((pair, i) =>
      i === index ? { ...pair, [field]: value } : pair,
    );
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {pairs.map((pair, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            placeholder={keyPlaceholder}
            value={pair.key}
            onChange={(e) => updatePair(index, 'key', e.target.value)}
            className="flex-1"
          />
          <ChevronsRight className="h-4 w-4 text-muted-foreground shrink-0" />
          {showFieldSelector && formFields && formFields.length > 0 ? (
            <select
              className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={pair.value}
              onChange={(e) => updatePair(index, 'value', e.target.value)}
            >
              <option value="">Select...</option>
              <option value="{{formData}}">All form data (JSON)</option>
              <option value="{{submissionId}}">Submission ID</option>
              <option value="{{formId}}">Form ID</option>
              <option value="{{formName}}">Form Name</option>
              <option value="{{timestamp}}">Timestamp</option>
              {formFields.map((field) => (
                <option key={field} value={`{{field.${field}}}`}>
                  {field}
                </option>
              ))}
            </select>
          ) : (
            <Input
              placeholder="Value"
              value={pair.value}
              onChange={(e) => updatePair(index, 'value', e.target.value)}
              className="flex-1"
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removePair(index)}
            className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <button
        type="button"
        onClick={addPair}
        className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80"
      >
        <Plus className="h-4 w-4" />
        Add new
      </button>
    </div>
  );
}

export function WebhookConfig({
  config,
  onUpdate,
  formFields = [],
}: WebhookConfigProps) {
  const [mode, setMode] = useState<TabMode>('simple');
  const [showHelp, setShowHelp] = useState(false);

  // Parse stored JSON arrays or initialize empty
  const parseStoredPairs = (key: string): KeyValuePair[] => {
    try {
      const stored = config?.[key];
      if (Array.isArray(stored)) return stored;
      if (typeof stored === 'string' && stored) return JSON.parse(stored);
      return [];
    } catch {
      return [];
    }
  };

  const bodyParams = parseStoredPairs('bodyParams');
  const urlParams = parseStoredPairs('urlParams');
  const headers = parseStoredPairs('headers');
  const cookies = parseStoredPairs('cookies');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <Webhook className="h-5 w-5" />
        <h4 className="font-medium">Webhook Configuration</h4>
      </div>

      {/* Help link */}
      <button
        type="button"
        onClick={() => setShowHelp(!showHelp)}
        className="text-sm text-muted-foreground hover:text-primary underline underline-offset-2 flex items-center gap-1"
      >
        Need help setting up?
        {showHelp ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {/* Collapsible help section */}
      {showHelp && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Webhook setup by platform
            </span>
          </div>

          <div className="space-y-3 text-xs text-amber-600 dark:text-amber-300">
            <div>
              <strong className="text-amber-700 dark:text-amber-400">
                Make.com:
              </strong>
              <ol className="mt-1 ml-4 list-decimal space-y-1">
                <li>Create a new scenario</li>
                <li>
                  Add a <strong>Webhooks → Custom Webhook</strong> module
                </li>
                <li>
                  Click <em>Add</em> to create a webhook and copy the URL
                </li>
              </ol>
            </div>

            <div>
              <strong className="text-amber-700 dark:text-amber-400">
                n8n:
              </strong>
              <ol className="mt-1 ml-4 list-decimal space-y-1">
                <li>
                  Add a <strong>Webhook</strong> node as trigger
                </li>
                <li>
                  Set HTTP Method to{' '}
                  <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">
                    POST
                  </code>
                </li>
                <li>
                  Copy the <em>Production URL</em> from the node
                </li>
              </ol>
            </div>

            <div>
              <strong className="text-amber-700 dark:text-amber-400">
                Zapier:
              </strong>
              <ol className="mt-1 ml-4 list-decimal space-y-1">
                <li>
                  Create a new Zap with <strong>Webhooks by Zapier</strong>{' '}
                  trigger
                </li>
                <li>
                  Choose <em>Catch Hook</em>
                </li>
                <li>Copy the webhook URL provided</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex justify-center">
          <div className="inline-flex rounded-md border bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode('simple')}
              className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                mode === 'simple'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => setMode('advanced')}
              className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                mode === 'advanced'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Advanced
            </button>
          </div>
        </div>

        {/* Simple mode */}
        {mode === 'simple' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Webhook URL</label>
              <p className="text-xs text-muted-foreground">
                The endpoint form responses will be sent to
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://www.example.com/"
                  value={config?.webhook || ''}
                  onChange={(e) => onUpdate('webhook', e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={!config?.webhook}
                >
                  <Play className="h-3 w-3 mr-1.5 text-primary" />
                  Test
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Advanced mode */}
        {mode === 'advanced' && (
          <div className="space-y-5">
            {/* URL */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">URL</label>
              <Input
                placeholder="https://api.example.com/webhook"
                value={config?.webhook || ''}
                onChange={(e) => onUpdate('webhook', e.target.value)}
              />
            </div>

            {/* HTTP Method */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">HTTP method</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={config?.httpMethod || 'POST'}
                onChange={(e) => onUpdate('httpMethod', e.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            {/* Body */}
            <KeyValueBuilder
              label="Body"
              keyPlaceholder="Key"
              pairs={bodyParams}
              onChange={(pairs) => onUpdate('bodyParams', pairs)}
              formFields={formFields}
              showFieldSelector={true}
            />

            {/* URL Parameters */}
            <KeyValueBuilder
              label="URL Parameters"
              keyPlaceholder="URL parameter"
              pairs={urlParams}
              onChange={(pairs) => onUpdate('urlParams', pairs)}
              formFields={formFields}
              showFieldSelector={true}
            />

            {/* Headers */}
            <KeyValueBuilder
              label="Headers"
              keyPlaceholder="Header key"
              pairs={headers}
              onChange={(pairs) => onUpdate('headers', pairs)}
              formFields={formFields}
              showFieldSelector={false}
            />

            {/* Cookies */}
            <KeyValueBuilder
              label="Cookies"
              keyPlaceholder="Cookie"
              pairs={cookies}
              onChange={(pairs) => onUpdate('cookies', pairs)}
              formFields={formFields}
              showFieldSelector={false}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Form data will be automatically included in the request body.
      </p>
    </div>
  );
}
