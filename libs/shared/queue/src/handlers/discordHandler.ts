
import { IntegrationJobData } from '../types';
import axios from 'axios';
import logger, { LogOperation, LogMessages } from '@formflow/shared/logger';
import { PermanentError } from './index';

export async function handleDiscordJob(job: IntegrationJobData): Promise<void> {
    const { submissionId, formId, formattedMessage, config, correlationId } = job;

    if (!config.webhookUrl) {
        throw new PermanentError('No Discord webhook URL configured');
    }

    const discordMessage = `\`\`\`${formattedMessage}\`\`\``;

    try {
        await axios.post(config.webhookUrl, { content: discordMessage });

        logger.info(LogMessages.integrationSendSuccess('Discord'), {
            operation: LogOperation.INTEGRATION_DISCORD_SEND,
            formId,
            submissionId,
            correlationId,
        });
    } catch (error: any) {
        const status = error.response?.status;
        if (status === 404 || status === 401 || status === 403) {
            throw new PermanentError(`Discord API error ${status}: ${error.message}`);
        }

        logger.error(LogMessages.integrationSendFailed('Discord'), {
            operation: LogOperation.INTEGRATION_DISCORD_SEND,
            error: error.message,
            formId,
            submissionId,
            correlationId,
        });

        throw error;
    }
}
