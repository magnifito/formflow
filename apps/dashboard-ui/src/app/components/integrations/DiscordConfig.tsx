import { Input } from '../ui/Input';
import { MessageCircle, HelpCircle } from 'lucide-react';

interface DiscordConfigProps {
  config: Record<string, any>;
  onUpdate: (key: string, value: string) => void;
}

export function DiscordConfig({ config, onUpdate }: DiscordConfigProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <MessageCircle className="h-5 w-5" />
        <h4 className="font-medium">Discord Configuration</h4>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Webhook URL</label>
        <Input
          placeholder="https://discord.com/api/webhooks/..."
          value={config?.webhookUrl || ''}
          onChange={(e) => onUpdate('webhookUrl', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          The webhook URL for your Discord channel.
        </p>
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/30 p-4 space-y-3">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
          <HelpCircle className="h-4 w-4" />
          <span className="text-sm font-medium">
            How to create a Discord webhook
          </span>
        </div>
        <ol className="text-xs text-indigo-600 dark:text-indigo-300 space-y-2 list-decimal list-inside">
          <li>
            Open your Discord server and go to <strong>Server Settings</strong>
          </li>
          <li>
            Navigate to <strong>Integrations</strong> →{' '}
            <strong>Webhooks</strong>
          </li>
          <li>
            Click <strong>New Webhook</strong> and select the target channel
          </li>
          <li>(Optional) Customize the webhook name and avatar</li>
          <li>
            Click <strong>Copy Webhook URL</strong> and paste it above
          </li>
        </ol>
        <div className="pt-2 border-t border-indigo-200 dark:border-indigo-800">
          <p className="text-xs text-indigo-500 dark:text-indigo-400">
            Webhooks don't require a bot account. Each webhook is tied to a
            specific channel.
          </p>
        </div>
      </div>
    </div>
  );
}
