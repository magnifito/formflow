import type { Job } from 'pg-boss';
import { QUEUE_NAMES, IntegrationType, IntegrationJobData } from './types';
import { getBoss } from './boss';
import {
  handleEmailSmtpJob,
  handleEmailOAuthJob,
  handleEmailApiJob,
  handleTelegramJob,
  handleWhatsAppJob,
  handleDiscordJob,
  handleSlackJob,
  handleWebhookJob,
  PermanentError,
} from './handlers';
import logger from '@formflow/shared/logger';

export async function startWorker(): Promise<void> {
  const boss = await getBoss();

  logger.info('Starting queue worker...');

  const toJobArray = (
    jobs: Job<IntegrationJobData>[] | Job<IntegrationJobData>,
  ): Job<IntegrationJobData>[] => (Array.isArray(jobs) ? jobs : [jobs]);

  const registerWithLog = async (
    queue: string,
    handler: (job: IntegrationJobData) => Promise<void>,
  ) => {
    await boss.work<IntegrationJobData>(queue, async (jobs) => {
      for (const job of toJobArray(jobs)) {
        try {
          await handler(job.data);
        } catch (err: any) {
          // Log enough context to debug retries
          logger.error('Integration job failed', {
            queue,
            jobId: job.id,
            integrationType: job.data?.integrationType,
            submissionId: job.data?.submissionId,
            formId: job.data?.formId,
            error: err.message,
          });

          // PermanentError indicates we should exhaust retries immediately
          if (err instanceof PermanentError) {
            throw err;
          }

          throw err;
        }
      }
    });
  };

  await registerWithLog(
    QUEUE_NAMES[IntegrationType.EMAIL_SMTP],
    handleEmailSmtpJob,
  );
  await registerWithLog(
    QUEUE_NAMES[IntegrationType.EMAIL_OAUTH],
    handleEmailOAuthJob,
  );
  await registerWithLog(
    QUEUE_NAMES[IntegrationType.EMAIL_API],
    handleEmailApiJob,
  );
  await registerWithLog(
    QUEUE_NAMES[IntegrationType.TELEGRAM],
    handleTelegramJob,
  );
  await registerWithLog(
    QUEUE_NAMES[IntegrationType.WHATSAPP],
    handleWhatsAppJob,
  );
  await registerWithLog(QUEUE_NAMES[IntegrationType.DISCORD], handleDiscordJob);
  await registerWithLog(QUEUE_NAMES[IntegrationType.SLACK], handleSlackJob);
  await registerWithLog(QUEUE_NAMES[IntegrationType.WEBHOOK], handleWebhookJob);

  logger.info('Queue worker started and listening for jobs.');
}

// We don't really need stopWorker since boss.stop() handles it, but nice to have for symmetry
export async function stopWorker(): Promise<void> {
  // Logic to stop specific workers if needed, but usually stopping boss is enough.
}
