import { Input } from '../ui/Input';
import { Send, HelpCircle } from 'lucide-react';

interface TelegramConfigProps {
  config: Record<string, any>;
  onUpdate: (key: string, value: string) => void;
}

export function TelegramConfig({ config, onUpdate }: TelegramConfigProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <Send className="h-5 w-5" />
        <h4 className="font-medium">Telegram Configuration</h4>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Chat ID</label>
        <Input
          placeholder="-1001234567890"
          value={config?.chatId || ''}
          onChange={(e) => onUpdate('chatId', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          The ID of the group or channel where notifications will be sent.
        </p>
      </div>

      <div className="rounded-lg border border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400">
          <HelpCircle className="h-4 w-4" />
          <span className="text-sm font-medium">How to set up Telegram</span>
        </div>
        <ol className="text-xs text-sky-600 dark:text-sky-300 space-y-2 list-decimal list-inside">
          <li>
            <strong>Bot Token:</strong> Go to{' '}
            <strong>Organization → Credentials</strong> to add your Telegram Bot
            Token
          </li>
          <li>
            <strong>Create a bot:</strong> Message{' '}
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-sky-800 dark:hover:text-sky-200"
            >
              @BotFather
            </a>{' '}
            on Telegram and send{' '}
            <code className="bg-sky-100 dark:bg-sky-900 px-1 rounded">
              /newbot
            </code>
          </li>
          <li>
            <strong>Get Chat ID:</strong> Add your bot to a group/channel, then
            use one of these methods:
            <ul className="mt-1 ml-4 list-disc space-y-1">
              <li>
                Forward a message from the chat to{' '}
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-sky-800 dark:hover:text-sky-200"
                >
                  @userinfobot
                </a>
              </li>
              <li>
                Use the Telegram API:{' '}
                <code className="bg-sky-100 dark:bg-sky-900 px-1 rounded text-[10px]">
                  api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
                </code>
              </li>
            </ul>
          </li>
          <li>
            <strong>Make bot admin:</strong> For channels, the bot must be an
            administrator
          </li>
        </ol>
        <div className="pt-2 border-t border-sky-200 dark:border-sky-800">
          <p className="text-xs text-sky-500 dark:text-sky-400">
            Group IDs are negative numbers (e.g.,{' '}
            <code className="bg-sky-100 dark:bg-sky-900 px-1 rounded">
              -1001234567890
            </code>
            ). Private chat IDs are positive.
          </p>
        </div>
      </div>
    </div>
  );
}
