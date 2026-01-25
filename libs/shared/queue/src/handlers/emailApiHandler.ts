
import { IntegrationJobData } from '../types';

export async function handleEmailApiJob(job: IntegrationJobData): Promise<void> {
    // TODO: Implement
    console.log('Processing Email API job', job.submissionId);
}
