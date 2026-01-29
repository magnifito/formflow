import { Input } from '../ui/Input';
import { MessageSquare, HelpCircle } from 'lucide-react';

interface SlackConfigProps {
  config: Record<string, any>;
  onUpdate: (key: string, value: string) => void;
}

export function SlackConfig({ config, onUpdate }: SlackConfigProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <MessageSquare className="h-5 w-5" />
        <h4 className="font-medium">Slack Configuration</h4>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Channel ID</label>
        <Input
          placeholder="C01234ABCDE"
          value={config?.channelId || ''}
          onChange={(e) => onUpdate('channelId', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          The channel where notifications will be sent.
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-4 space-y-3">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
          <HelpCircle className="h-4 w-4" />
          <span className="text-sm font-medium">How to set up Slack</span>
        </div>
        <ol className="text-xs text-blue-600 dark:text-blue-300 space-y-2 list-decimal list-inside">
          <li>
            <strong>Bot Token:</strong> Go to{' '}
            <strong>Organization → Credentials</strong> to add your Slack Bot
            Token (starts with{' '}
            <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
              xoxb-
            </code>
            )
          </li>
          <li>
            <strong>Get Channel ID:</strong> In Slack, right-click on the
            channel → <em>View channel details</em> → scroll to bottom to find
            the Channel ID
          </li>
          <li>
            <strong>Invite the bot:</strong> Type{' '}
            <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
              /invite @YourBotName
            </code>{' '}
            in the channel
          </li>
        </ol>
        <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-500 dark:text-blue-400">
            Need a bot token? Create a Slack App at{' '}
            <a
              href="https://api.slack.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-700 dark:hover:text-blue-300"
            >
              api.slack.com/apps
            </a>{' '}
            and add the{' '}
            <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
              chat:write
            </code>{' '}
            scope.
          </p>
        </div>
      </div>
    </div>
  );
}
