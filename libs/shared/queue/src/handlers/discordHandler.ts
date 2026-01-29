import { IntegrationJobData } from '../types';
import { DiscordService } from '@formflow/shared/discord';
import { PermanentError } from './index';

export async function handleDiscordJob(job: IntegrationJobData): Promise<void> {
    const { submissionId, formId, formData, formName, config, correlationId } = job;

    if (!config.webhookUrl) {
        throw new PermanentError('No Discord webhook URL configured');
    }

    const discordService = new DiscordService(config.webhookUrl as string);

    const result = await discordService.sendSubmissionNotification(
        formName,
        formData,
        { formId, submissionId, correlationId }
    );

    if (!result.success) {
        const errorMsg = result.error || 'Unknown Discord error';

        // Check if this is a permanent error (bad webhook URL, unauthorized, etc.)
        if (
            errorMsg.includes('[404]') ||
            errorMsg.includes('[401]') ||
            errorMsg.includes('[403]')
        ) {
            throw new PermanentError(`Discord error: ${errorMsg}`);
        }

        throw new Error(`Discord error: ${errorMsg}`);
    }
}
