import { Input } from '../ui/Input';
import { Mail, HelpCircle } from 'lucide-react';

interface EmailConfigProps {
  config: Record<string, any>;
  onUpdate: (key: string, value: string) => void;
  onUpdateNested: (parent: 'smtp' | 'oauth', key: string, value: any) => void;
}

export function EmailConfig({
  config,
  onUpdate,
  onUpdateNested,
}: EmailConfigProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <Mail className="h-5 w-5" />
        <h4 className="font-medium">Email Configuration</h4>
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

      {/* SMTP Section */}
      <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
        <div className="text-sm font-medium">SMTP Credentials</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Host</label>
            <Input
              placeholder="smtp.example.com"
              value={config?.smtp?.host || ''}
              onChange={(e) => onUpdateNested('smtp', 'host', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Port</label>
            <Input
              placeholder="587"
              type="number"
              value={config?.smtp?.port || ''}
              onChange={(e) =>
                onUpdateNested(
                  'smtp',
                  'port',
                  e.target.value ? Number(e.target.value) : '',
                )
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Username</label>
            <Input
              placeholder="your-username"
              value={config?.smtp?.username || ''}
              onChange={(e) =>
                onUpdateNested('smtp', 'username', e.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={config?.smtp?.password || ''}
              onChange={(e) =>
                onUpdateNested('smtp', 'password', e.target.value)
              }
            />
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-4 space-y-3">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <HelpCircle className="h-4 w-4" />
          <span className="text-sm font-medium">SMTP setup by provider</span>
        </div>

        <div className="space-y-3 text-xs text-green-600 dark:text-green-300">
          <div>
            <strong className="text-green-700 dark:text-green-400">
              Gmail (SMTP):
            </strong>
            <ul className="mt-1 ml-4 list-disc space-y-1">
              <li>
                Host:{' '}
                <code className="bg-green-100 dark:bg-green-900 px-1 rounded">
                  smtp.gmail.com
                </code>
                , Port:{' '}
                <code className="bg-green-100 dark:bg-green-900 px-1 rounded">
                  587
                </code>
              </li>
              <li>
                Enable 2FA and create an{' '}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  App Password
                </a>
              </li>
            </ul>
          </div>

          <div>
            <strong className="text-green-700 dark:text-green-400">
              Outlook/Office 365:
            </strong>
            <ul className="mt-1 ml-4 list-disc space-y-1">
              <li>
                Host:{' '}
                <code className="bg-green-100 dark:bg-green-900 px-1 rounded">
                  smtp.office365.com
                </code>
                , Port:{' '}
                <code className="bg-green-100 dark:bg-green-900 px-1 rounded">
                  587
                </code>
              </li>
            </ul>
          </div>

          <div>
            <strong className="text-green-700 dark:text-green-400">
              SendGrid:
            </strong>
            <ul className="mt-1 ml-4 list-disc space-y-1">
              <li>
                Host:{' '}
                <code className="bg-green-100 dark:bg-green-900 px-1 rounded">
                  smtp.sendgrid.net
                </code>
                , Port:{' '}
                <code className="bg-green-100 dark:bg-green-900 px-1 rounded">
                  587
                </code>
              </li>
              <li>
                Username:{' '}
                <code className="bg-green-100 dark:bg-green-900 px-1 rounded">
                  apikey
                </code>
                , Password: your API key
              </li>
            </ul>
          </div>

          <div>
            <strong className="text-green-700 dark:text-green-400">
              Amazon SES:
            </strong>
            <ul className="mt-1 ml-4 list-disc space-y-1">
              <li>
                Host:{' '}
                <code className="bg-green-100 dark:bg-green-900 px-1 rounded">
                  email-smtp.{'{region}'}.amazonaws.com
                </code>
                , Port:{' '}
                <code className="bg-green-100 dark:bg-green-900 px-1 rounded">
                  587
                </code>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
