import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card';
import { Trash2, Plus, Send, Loader2, Shuffle } from 'lucide-react';
import type { Form } from '../../lib/types';
import { generateRandomFormData } from '../../lib/randomFormData';

// We need to install @radix-ui/react-tabs and @radix-ui/react-switch later or mock them for now.
// For now, I'll stick to basic implementation or ask to install them.
// I'll assume standard Shadcn Tabs/Switch are desired, so I'll create placeholder or install dependencies.

interface SubmitOptions {
  csrfToken?: string | 'auto';
}

interface TestPayloadFormProps {
  form: Form;
  onSubmit: (
    payload: Record<string, string>,
    options: SubmitOptions,
  ) => Promise<void>;
  loading: boolean;
}

export function TestPayloadForm({
  form,
  onSubmit,
  loading,
}: TestPayloadFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({
    name: 'John Doe',
    email: 'john@formflow.fyi',
    message: 'Hello world from Test Lab!',
  });
  const [includeCsrf, setIncludeCsrf] = useState(true);
  const [customFields, setCustomFields] = useState<
    { key: string; value: string }[]
  >([]);

  const handleFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCustomFieldAdd = () => {
    setCustomFields((prev) => [...prev, { key: '', value: '' }]);
  };

  const handleCustomFieldChange = (
    index: number,
    field: 'key' | 'value',
    value: string,
  ) => {
    const newFields = [...customFields];
    newFields[index][field] = value;
    setCustomFields(newFields);
  };

  const handleCustomFieldRemove = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFillRandom = () => {
    const randomData = generateRandomFormData();
    setFormData({
      name: randomData.name,
      email: randomData.email,
      message: randomData.message,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData };

    // Add custom fields
    customFields.forEach((field) => {
      if (field.key) payload[field.key] = field.value;
    });

    onSubmit(payload, { csrfToken: includeCsrf ? 'auto' : undefined });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Test Submission</CardTitle>
            <CardDescription>
              Target:{' '}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                {form.submitHash}
              </code>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillRandom}
              className="gap-1.5"
            >
              <Shuffle className="w-3 h-3" />
              Random
            </Button>
            <label className="text-xs font-medium cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                className="toggle"
                checked={includeCsrf}
                onChange={(e) => setIncludeCsrf(e.target.checked)}
              />
              Target CSRF
            </label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto">
        <form
          id="submission-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.message || ''}
                onChange={(e) => handleFieldChange('message', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label>Custom Fields</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCustomFieldAdd}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Field
              </Button>
            </div>

            {customFields.map((field, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder="Key"
                  className="h-8"
                  value={field.key}
                  onChange={(e) =>
                    handleCustomFieldChange(idx, 'key', e.target.value)
                  }
                />
                <Input
                  placeholder="Value"
                  className="h-8"
                  value={field.value}
                  onChange={(e) =>
                    handleCustomFieldChange(idx, 'value', e.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleCustomFieldRemove(idx)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {customFields.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No custom fields added.
              </p>
            )}
          </div>
        </form>
      </CardContent>

      <div className="p-4 border-t bg-muted/10">
        <Button form="submission-form" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Submit Payload
        </Button>
      </div>
    </Card>
  );
}
