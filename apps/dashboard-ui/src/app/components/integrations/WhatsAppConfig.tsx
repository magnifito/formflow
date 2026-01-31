import { Input } from '../ui/Input';
import { MessageCircle } from 'lucide-react';

interface WhatsAppConfigProps {
  config: Record<string, any>;
  onUpdate: (key: string, value: string) => void;
  onUpdateNested: (parent: 'whatsapp', key: string, value: any) => void;
}

export function WhatsAppConfig({
  config,
  onUpdateNested,
}: WhatsAppConfigProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <MessageCircle className="h-5 w-5" />
        <h4 className="font-medium">WhatsApp Configuration</h4>
      </div>

      <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
        <div className="text-sm font-medium">Meta Cloud API Settings</div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            Phone Number ID
          </label>
          <Input
            placeholder="e.g. 1045938567..."
            value={config?.whatsapp?.phoneNumberId || ''}
            onChange={(e) =>
              onUpdateNested('whatsapp', 'phoneNumberId', e.target.value)
            }
          />
          <p className="text-[10px] text-muted-foreground">
            Found in WhatsApp API Setup under "From" number.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            Recipient Phone Number
          </label>
          <Input
            placeholder="e.g. 15551234567"
            value={config?.whatsapp?.recipientNumber || ''}
            onChange={(e) =>
              onUpdateNested('whatsapp', 'recipientNumber', e.target.value)
            }
          />
          <p className="text-[10px] text-muted-foreground">
            Include country code without '+' (e.g. 1 for US). For test numbers,
            this must be a verified number in Meta dashboard.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Access Token</label>
          <Input
            type="password"
            placeholder="EAAG..."
            value={config?.whatsapp?.accessToken || ''}
            onChange={(e) =>
              onUpdateNested('whatsapp', 'accessToken', e.target.value)
            }
          />
          <p className="text-[10px] text-muted-foreground">
            Temporary or Permanent Access Token from Meta Developer Portal.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-4 space-y-2">
        <h5 className="text-xs font-semibold text-blue-800 dark:text-blue-300">
          Setup Guide
        </h5>
        <ol className="text-[11px] text-blue-700 dark:text-blue-400 list-decimal ml-4 space-y-1">
          <li>
            Go to{' '}
            <a
              href="https://developers.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Meta for Developers
            </a>
            .
          </li>
          <li>Create an App (Type: Business) -&gt; Set up WhatsApp.</li>
          <li>
            Get the <strong>Phone Number ID</strong> and a{' '}
            <strong>Temporary Access Token</strong> from the "API Setup" tab.
          </li>
          <li>Add your own number as a recipient to test.</li>
        </ol>
      </div>
    </div>
  );
}
