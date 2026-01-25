
import { IntegrationJobData } from '../types';
import logger from '@formflow/shared/logger';
import { PermanentError } from './index';

export async function handleEmailApiJob(job: IntegrationJobData): Promise<void> {
    const { config, formId, submissionId } = job;
    const apiConfig = config.emailApi;

    if (!config.recipients || config.recipients.length === 0) {
        throw new PermanentError('No recipients configured for email API integration');
    }

    if (!apiConfig || !apiConfig.provider || !apiConfig.apiKey) {
        throw new PermanentError('Email API configuration missing provider or apiKey');
    }

    logger.warn('Email API handler not implemented; skipping send', {
        formId,
        submissionId,
        provider: apiConfig.provider
    });
}
