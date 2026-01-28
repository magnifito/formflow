
import { IntegrationJobData } from '../types';
import axios from 'axios';
import logger, { LogOperation, LogMessages } from '@formflow/shared/logger';
import { PermanentError } from './index';

export async function handleSlackJob(job: IntegrationJobData): Promise<void> {
    const { submissionId, formId, formattedMessage, config, correlationId } = job;

    if (!config.accessToken || !config.channelId) {
        throw new PermanentError('Slack configuration missing (accessToken or channelId)');
    }

    const response = await axios.post('https://slack.com/api/chat.postMessage', {
        channel: config.channelId,
        text: formattedMessage,
    }, {
        headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    // Slack API returns 200 OK even on errors, with { ok: false, error: '...' }
    if (!response.data.ok) {
        const errorMsg = response.data.error || 'Unknown Slack error';

        logger.error(LogMessages.integrationSendFailed('Slack'), {
            operation: LogOperation.INTEGRATION_SLACK_SEND,
            error: errorMsg,
            formId,
            submissionId,
            correlationId,
        });

        // Permanent errors
        if (['invalid_auth', 'account_inactive', 'token_revoked', 'channel_not_found', 'not_in_channel'].includes(errorMsg)) {
            throw new PermanentError(`Slack error: ${errorMsg}`);
        }

        throw new Error(`Slack error: ${errorMsg}`);
    }

    logger.info(LogMessages.integrationSendSuccess('Slack'), {
        operation: LogOperation.INTEGRATION_SLACK_SEND,
        formId,
        submissionId,
        correlationId,
    });
}
