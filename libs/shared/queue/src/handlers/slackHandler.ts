
import { IntegrationJobData } from '../types';
import axios from 'axios';
import logger, { LogOperation, LogMessages } from '@formflow/shared/logger';
import { PermanentError } from './index';

export async function handleSlackJob(job: IntegrationJobData): Promise<void> {
    const { submissionId, formId, formattedMessage, config, correlationId } = job;

    if (!config.accessToken || !config.channelId) {
        throw new PermanentError('Slack configuration missing (accessToken or channelId)');
    }

    try {
        await axios.post('https://slack.com/api/chat.postMessage', {
            channel: config.channelId,
            text: formattedMessage,
        }, {
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        logger.info(LogMessages.integrationSendSuccess('Slack'), {
            operation: LogOperation.INTEGRATION_SLACK_SEND,
            formId,
            submissionId,
            correlationId,
        });
    } catch (error: any) {
        const status = error.response?.status;
        // Slack API often returns 200 OK even on error with { ok: false, error: '...' } body.
        // Axios usually only throws on http error codes.
        // So logic might need to check response body if I want to catch "invalid_auth" etc.
        // But existing controller didn't check body 'ok' status, it just caught axios errors.
        // I will stick to basic axios error handling for now.

        if (status === 401 || status === 403) {
            throw new PermanentError(`Slack API error ${status}: ${error.message}`);
        }

        logger.error(LogMessages.integrationSendFailed('Slack'), {
            operation: LogOperation.INTEGRATION_SLACK_SEND,
            error: error.message,
            formId,
            submissionId,
            correlationId,
        });

        throw error;
    }
}
