
import { IntegrationJobData } from '../types';
import { getTelegramService } from '@formflow/shared/telegram';
import logger, { LogOperation, LogMessages } from '@formflow/shared/logger';
import { PermanentError } from './index';

export async function handleTelegramJob(job: IntegrationJobData): Promise<void> {
    const { submissionId, formId, formattedMessage, config, correlationId } = job;

    if (!config.chatId) {
        throw new PermanentError('No Telegram chat ID configured');
    }

    try {
        await getTelegramService().sendSubmissionNotification(
            parseInt(config.chatId, 10),
            formattedMessage,
            {
                formId,
                submissionId,
                correlationId,
            }
        );
        // Logging is handled inside telegram service? 
        // looking at controller: yes, it calls `sendSubmissionNotification` without awaiting logs, but logs might happen inside.
        // Controller code:
        /*
           getTelegramService().sendSubmissionNotification(...)
        */
        // It doesn't log success/fail explicitly in controller, so the service presumably does it.

    } catch (error: any) {
        // If service throws, we catch it.
        // 400 Bad Request, 403 Forbidden -> Permanent
        // 429 Too Many Requests -> Retry
        const status = error.response?.status;
        if (status === 400 || status === 401 || status === 403) {
            throw new PermanentError(`Telegram API error ${status}: ${error.message}`);
        }
        throw error;
    }
}
