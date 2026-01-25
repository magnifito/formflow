
import { IntegrationJobData } from '../types';
import axios from 'axios';
import logger, { LogOperation, LogMessages } from '@formflow/shared/logger';
import { PermanentError } from './index';

export async function handleWebhookJob(job: IntegrationJobData): Promise<void> {
    const { submissionId, formId, formData, config, correlationId } = job;

    if (!config.webhook) {
        throw new PermanentError('No webhook URL configured');
    }

    const sourceName = config.webhookSource === 'make' ? 'Make.com' :
        config.webhookSource === 'n8n' ? 'n8n' : 'Webhook';

    // Map source to LogOperation
    let logOpSuccess = LogOperation.INTEGRATION_WEBHOOK_SEND;
    let logOpFail = LogOperation.INTEGRATION_WEBHOOK_SEND;
    // LogOperation enum likely has distinct values.

    // Re-checking the controller:
    // Make -> INTEGRATION_MAKE_SEND
    // n8n -> INTEGRATION_N8N_SEND
    // Webhook -> INTEGRATION_WEBHOOK_SEND
    // I should try to map them if possible, or just use generic if not exported.
    // Assuming they are exported as I used them in string form in plan.

    switch (config.webhookSource) {
        case 'make': logOpSuccess = LogOperation.INTEGRATION_MAKE_SEND; break;
        case 'n8n': logOpSuccess = LogOperation.INTEGRATION_N8N_SEND; break;
        default: logOpSuccess = LogOperation.INTEGRATION_WEBHOOK_SEND;
    }
    // Using same for fail just assuming typical pattern or use generic.

    try {
        await axios.post(config.webhook, formData);

        logger.info(LogMessages.integrationSendSuccess(sourceName), {
            operation: logOpSuccess,
            formId,
            submissionId,
            correlationId,
        });
    } catch (error: any) {
        const status = error.response?.status;
        if (status === 404 || status === 401 || status === 403) {
            throw new PermanentError(`${sourceName} error ${status}: ${error.message}`);
        }

        logger.error(LogMessages.integrationSendFailed(sourceName), {
            operation: logOpSuccess, // reuse success op code or find fail one? Controller reuses same op code for success/fail log.
            error: error.message,
            formId,
            submissionId,
            correlationId,
        });

        throw error;
    }
}
