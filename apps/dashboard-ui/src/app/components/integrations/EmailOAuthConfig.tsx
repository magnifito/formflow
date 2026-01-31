import { Input } from '../ui/Input';
import { Mail } from 'lucide-react';

interface EmailOAuthConfigProps {
  config: Record<string, any>;
  onUpdate: (key: string, value: string) => void;
  onUpdateNested: (parent: 'oauth', key: string, value: any) => void;
}

export function EmailOAuthConfig({
  config,
  onUpdate,
  onUpdateNested,
}: EmailOAuthConfigProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <Mail className="h-5 w-5" />
        <h4 className="font-medium">Email Configuration for OAuth</h4>
      </div>

      {/* Basic email settings */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Recipients</label>
        <Input
          placeholder="email@example.com, team@example.com"
          value={config?.recipients || ''}
          onChange={(e) => onUpdate('recipients', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated list of email addresses to receive notifications.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">From Email</label>
          <Input
            placeholder="no-reply@yourdomain.com"
            value={config?.fromEmail || ''}
            onChange={(e) => onUpdate('fromEmail', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Subject Line</label>
          <Input
            placeholder="New Form Submission"
            value={config?.subject || ''}
            onChange={(e) => onUpdate('subject', e.target.value)}
          />
        </div>
      </div>

      {/* OAuth Section */}
      <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
        <div className="text-sm font-medium">OAuth (Gmail, Outlook)</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Client ID</label>
            <Input
              placeholder="your-client-id"
              value={config?.oauth?.clientId || ''}
              onChange={(e) =>
                onUpdateNested('oauth', 'clientId', e.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Client Secret
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={config?.oauth?.clientSecret || ''}
              onChange={(e) =>
                onUpdateNested('oauth', 'clientSecret', e.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">User Email</label>
            <Input
              placeholder="you@gmail.com"
              value={config?.oauth?.user || ''}
              onChange={(e) => onUpdateNested('oauth', 'user', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Refresh Token
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={config?.oauth?.refreshToken || ''}
              onChange={(e) =>
                onUpdateNested('oauth', 'refreshToken', e.target.value)
              }
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          OAuth is strictly recommended for Gmail/Outlook integrations to ensure
          deliverability and security.
        </p>
      </div>
    </div>
  );
}
