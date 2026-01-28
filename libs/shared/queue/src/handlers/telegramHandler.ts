
import { IntegrationJobData } from '../types';
import { TelegramService } from '@formflow/shared/telegram';
import { PermanentError } from './index';

export async function handleTelegramJob(job: IntegrationJobData): Promise<void> {
    const { submissionId, formId, formattedMessage, config, correlationId } = job;

    if (!config.botToken) {
        throw new PermanentError('No Telegram bot token configured');
    }

    if (!config.chatId) {
        throw new PermanentError('No Telegram chat ID configured');
    }

    // Create a TelegramService instance with the integration's bot token
    const telegramService = new TelegramService(config.botToken);

    const result = await telegramService.sendSubmissionNotification(
        parseInt(config.chatId, 10),
        formattedMessage,
        {
            formId,
            submissionId,
            correlationId,
        }
    );

    if (!result.success) {
        const errorMsg = result.error || 'Unknown Telegram error';
        // Check for permanent errors (bad token, forbidden, etc.)
        if (errorMsg.includes('Unauthorized') || errorMsg.includes('Forbidden') || errorMsg.includes('chat not found') || errorMsg.includes('bot was blocked')) {
            throw new PermanentError(`Telegram error: ${errorMsg}`);
        }
        throw new Error(`Telegram error: ${errorMsg}`);
    }
}
