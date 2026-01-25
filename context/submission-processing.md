# Submission Processing Queue Implementation Plan

## Problem Statement

Currently, when a form submission is posted to the collector-api, integrations (email, webhooks, Telegram, Discord, Slack, Make.com, n8n) are executed synchronously within the same request handler. This causes:

1. **Submission failures due to integration failures** - If any integration fails (e.g., Slack API is down), the entire submission response can be affected
2. **Increased latency** - Users wait for all integrations to complete before receiving a response
3. **No retry mechanism** - Failed integrations are logged but never retried
4. **Tight coupling** - Integration execution is tightly coupled to submission success

## Proposed Solution

Implement a job queue system that decouples form submissions from integration processing.

### Flow Comparison

**Current Flow:**
```
Submit Form → Validate → Save Submission → Execute All Integrations → Respond
                                                  ↓ (if any fail)
                                           Submission may fail
```

**Proposed Flow:**
```
Submit Form → Validate → Save Submission → Queue Integration Jobs → Respond (immediately)
                                                  ↓
                               Worker processes jobs asynchronously
                                                  ↓
                               Failed jobs are retried with backoff
```

---

## Queue Solution: **pg-boss**

### Why pg-boss?

pg-boss is a PostgreSQL-native job queue that leverages the existing database infrastructure, eliminating the need for additional services like Redis.

**Advantages:**
- ✅ **No new infrastructure** - Uses existing PostgreSQL database
- ✅ **ACID guarantees** - Jobs are transactional with submissions
- ✅ **Built-in retry with backoff** - Exponential backoff out of the box
- ✅ **Job prioritization** - Supports priority queues
- ✅ **Good TypeScript support** - Well-typed API
- ✅ **Active maintenance** - Regularly updated
- ✅ **Scheduled jobs** - Built-in cron-like scheduling
- ✅ **Job throttling** - Rate limiting per queue
- ✅ **Automatic archival** - Completed/failed jobs auto-archived

**Trade-offs:**
- ⚠️ Lower throughput than Redis for very high-volume scenarios (not a concern for FormFlow's scale)
- ⚠️ Additional database load (mitigated by pg-boss's efficient polling)

### pg-boss Features We'll Use

| Feature | Usage |
|---------|-------|
| **Queues** | One queue per integration type for isolation |
| **Retry with backoff** | Automatic retry on failure with exponential backoff |
| **Dead letter queue** | Failed jobs after max retries moved to archive |
| **Job expiration** | Jobs expire if not processed within timeframe |
| **Singleton jobs** | Prevent duplicate jobs for same submission+integration |
| **Monitoring** | Query job tables directly for status |

---

## Implementation Architecture

### No New Infrastructure Required

pg-boss creates its own schema (`pgboss`) in the existing PostgreSQL database. Tables are auto-created on first connection:

- `pgboss.job` - Active jobs
- `pgboss.archive` - Completed/failed jobs
- `pgboss.schedule` - Scheduled/recurring jobs
- `pgboss.subscription` - Worker subscriptions
- `pgboss.version` - Schema version

### New Shared Library: `@formflow/shared/queue`

```
libs/shared/queue/
├── src/
│   ├── index.ts                  # Public exports
│   ├── boss.ts                   # pg-boss instance factory
│   ├── queues.ts                 # Queue name constants
│   ├── types.ts                  # Job payload types
│   ├── handlers/
│   │   ├── index.ts              # Handler registry
│   │   ├── emailSmtpHandler.ts   # SMTP email (Gmail OAuth, custom SMTP)
│   │   ├── emailApiHandler.ts    # Transactional email APIs (Mailgun, SendGrid, Postmark, SES)
│   │   ├── webhookHandler.ts     # Webhook handler (generic, Make.com, n8n)
│   │   ├── telegramHandler.ts    # Telegram handler
│   │   ├── discordHandler.ts     # Discord handler
│   │   └── slackHandler.ts       # Slack handler
│   └── worker.ts                 # Worker setup and lifecycle
├── project.json
└── tsconfig.json
```

### Job Payload Structure

```typescript
// libs/shared/queue/src/types.ts

export enum IntegrationType {
  EMAIL_SMTP = 'email-smtp',           // Traditional SMTP (Gmail, custom SMTP servers)
  EMAIL_API = 'email-api',             // Transactional email APIs (Mailgun, SendGrid, Postmark, etc.)
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  SLACK = 'slack',
  WEBHOOK = 'webhook',                 // Handles generic webhook, Make.com, and n8n
}

// Queue names follow pattern: integration-{type}
export const QUEUE_NAMES = {
  [IntegrationType.EMAIL_SMTP]: 'integration-email-smtp',
  [IntegrationType.EMAIL_API]: 'integration-email-api',
  [IntegrationType.TELEGRAM]: 'integration-telegram',
  [IntegrationType.DISCORD]: 'integration-discord',
  [IntegrationType.SLACK]: 'integration-slack',
  [IntegrationType.WEBHOOK]: 'integration-webhook',
} as const;

export interface IntegrationJobData {
  submissionId: number;
  formId: number;
  organizationId: number;
  integrationType: IntegrationType;
  correlationId: string;

  // Submission data
  formData: Record<string, any>;
  formattedMessage: string;
  formName: string;

  // Integration-specific config (encrypted values decrypted before queueing)
  config: {
    // Email (common)
    recipients?: string[];
    subject?: string;
    fromEmail?: string;

    // Email SMTP
    smtp?: {
      host: string;
      port: number;
      username: string;
      password: string;
      secure?: boolean;
    };

    // Email OAuth (Gmail, etc.)
    oauth?: {
      clientId: string;
      clientSecret: string;
      accessToken: string;
      refreshToken: string;
    };

    // Email API (Mailgun, SendGrid, Postmark, etc.)
    emailApi?: {
      provider: 'mailgun' | 'sendgrid' | 'postmark' | 'ses';
      apiKey: string;
      domain?: string;      // Mailgun domain
      region?: string;      // Mailgun region (US/EU), SES region
    };

    // Telegram
    chatId?: number;

    // Discord
    webhookUrl?: string;

    // Slack
    channelId?: string;
    accessToken?: string;

    // Webhook (generic, Make.com, n8n - all use same handler)
    webhook?: string;
    webhookSource?: 'generic' | 'make' | 'n8n';  // For logging/metrics only
  };
}

// pg-boss job options per integration type
export interface QueueJobOptions {
  retryLimit?: number;
  retryDelay?: number;      // seconds
  retryBackoff?: boolean;   // exponential backoff
  expireInSeconds?: number;
  priority?: number;
  singletonKey?: string;    // prevent duplicates
}
```

### pg-boss Instance Factory

```typescript
// libs/shared/queue/src/boss.ts

import PgBoss from 'pg-boss';
import { getEnv } from '@formflow/shared/env';
import logger from '@formflow/shared/logger';

let bossInstance: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (bossInstance) {
    return bossInstance;
  }

  const connectionString = `postgresql://${getEnv('DB_USER')}:${getEnv('DB_PASSWORD')}@${getEnv('DB_HOST')}:${getEnv('DB_PORT')}/${getEnv('DB_NAME')}`;

  bossInstance = new PgBoss({
    connectionString,
    // Archive completed jobs after 24 hours
    archiveCompletedAfterSeconds: 24 * 60 * 60,
    // Archive failed jobs after 7 days
    archiveFailedAfterSeconds: 7 * 24 * 60 * 60,
    // Delete archived jobs after 30 days
    deleteAfterSeconds: 30 * 24 * 60 * 60,
    // Maintenance interval (cleanup old jobs)
    maintenanceIntervalSeconds: 60,
    // Monitor state changes for logging
    monitorStateIntervalSeconds: 30,
  });

  bossInstance.on('error', (error) => {
    logger.error('pg-boss error', { error: error.message });
  });

  bossInstance.on('monitor-states', (states) => {
    logger.debug('pg-boss queue states', { states });
  });

  await bossInstance.start();
  logger.info('pg-boss started successfully');

  return bossInstance;
}

export async function stopBoss(): Promise<void> {
  if (bossInstance) {
    await bossInstance.stop({ graceful: true, timeout: 30000 });
    bossInstance = null;
    logger.info('pg-boss stopped');
  }
}
```

---

## Implementation Steps

### Phase 1: Library Setup

1. **Install pg-boss dependency**
   ```bash
   pnpm add pg-boss
   ```

2. **Create `@formflow/shared/queue` library**
   ```bash
   # Create library structure
   mkdir -p libs/shared/queue/src/handlers
   ```

3. **Create project.json and tsconfig.json**

### Phase 2: Queue Library Implementation

1. **Implement pg-boss instance factory** (`boss.ts`)
   - Connection using existing DB credentials
   - Lifecycle management (start/stop)
   - Error handling and logging

2. **Implement job handlers** (`handlers/*.ts`)
   - Move integration logic from SubmissionController
   - Each handler returns success/failure for retry logic
   - Proper error classification (retryable vs permanent)

3. **Implement worker setup** (`worker.ts`)
   - Subscribe to all integration queues
   - Route jobs to appropriate handlers
   - Handle graceful shutdown

### Phase 3: Collector API Changes

1. **Update `SubmissionController.ts`**
   ```typescript
   // After saving submission, queue jobs instead of executing
   import { getBoss, QUEUE_NAMES, IntegrationType } from '@formflow/shared/queue';

   // ... after saving submission ...

   const boss = await getBoss();

   // Queue each enabled integration as a separate job
   if (integration.emailEnabled && integration.emailRecipients) {
     await boss.send(QUEUE_NAMES[IntegrationType.EMAIL], {
       submissionId: submission.id,
       formId: form.id,
       // ... job data
     }, {
       retryLimit: 5,
       retryDelay: 10,
       retryBackoff: true,
       singletonKey: `${submission.id}-email`,
     });
   }

   // Similar for other integrations...
   ```

2. **Add worker startup in `index.ts`**
   ```typescript
   import { getBoss, stopBoss, startWorker } from '@formflow/shared/queue';

   // On startup
   await getBoss();
   await startWorker();

   // On shutdown (SIGTERM/SIGINT)
   await stopBoss();
   ```

### Phase 4: Integration Handlers

Move existing integration code from `SubmissionController.ts` to individual handlers:

```typescript
// libs/shared/queue/src/handlers/emailHandler.ts

import { IntegrationJobData } from '../types';
import nodemailer from 'nodemailer';
import { getEnv } from '@formflow/shared/env';
import logger, { LogOperation, LogMessages } from '@formflow/shared/logger';

export async function handleEmailJob(job: IntegrationJobData): Promise<void> {
  const { submissionId, formId, formattedMessage, config, correlationId } = job;

  if (!config.recipients || config.recipients.length === 0) {
    throw new Error('No email recipients configured');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      type: 'OAuth2',
      clientId: getEnv('GMAIL_CLIENT'),
      clientSecret: getEnv('GMAIL_SECRET'),
    },
  });

  await transporter.sendMail({
    from: '"New FormFlow Submission" <new-submission@formflow.fyi>',
    to: config.recipients,
    subject: `New Form Submission: ${job.formName}`,
    text: formattedMessage,
    auth: {
      user: getEnv('GMAIL_EMAIL'),
      refreshToken: getEnv('GMAIL_REFRESH'),
      accessToken: getEnv('GMAIL_ACCESS'),
      expires: 1484314697598,
    },
  });

  logger.info(LogMessages.integrationSendSuccess('Email'), {
    operation: LogOperation.INTEGRATION_EMAIL_SEND,
    formId,
    submissionId,
    recipientCount: config.recipients.length,
    correlationId,
  });
}
```

---

## Job Configuration

```typescript
// Default job options per integration type
export const JOB_OPTIONS: Record<IntegrationType, QueueJobOptions> = {
  [IntegrationType.EMAIL_SMTP]: {
    retryLimit: 5,           // More retries for email
    retryDelay: 10,          // 10s initial delay
    retryBackoff: true,      // Exponential: 10s, 20s, 40s, 80s, 160s
    expireInSeconds: 3600,   // Expire after 1 hour
  },
  [IntegrationType.EMAIL_API]: {
    retryLimit: 5,           // More retries for email
    retryDelay: 5,           // API calls can retry faster
    retryBackoff: true,
    expireInSeconds: 3600,
  },
  [IntegrationType.TELEGRAM]: {
    retryLimit: 3,
    retryDelay: 5,
    retryBackoff: true,
    expireInSeconds: 1800,
  },
  [IntegrationType.DISCORD]: {
    retryLimit: 3,
    retryDelay: 5,
    retryBackoff: true,
    expireInSeconds: 1800,
  },
  [IntegrationType.SLACK]: {
    retryLimit: 3,
    retryDelay: 5,
    retryBackoff: true,
    expireInSeconds: 1800,
  },
  [IntegrationType.WEBHOOK]: {
    retryLimit: 3,
    retryDelay: 5,
    retryBackoff: true,
    expireInSeconds: 1800,
  },
};
```

---

## Error Handling Strategy

```typescript
// libs/shared/queue/src/handlers/index.ts

export class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentError';
  }
}

// In handler:
export async function handleWebhookJob(job: IntegrationJobData): Promise<void> {
  try {
    const response = await axios.post(job.config.webhook!, job.formData, {
      timeout: 30000,
    });
  } catch (error: any) {
    // Permanent failures - don't retry
    if (error.response?.status === 404) {
      throw new PermanentError('Webhook URL not found (404)');
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new PermanentError('Webhook authentication failed');
    }

    // Retryable failures - throw normally, pg-boss will retry
    throw error;
  }
}
```

| Scenario | Handling |
|----------|----------|
| Integration API temporarily unavailable (5xx) | Retry with exponential backoff |
| Invalid configuration (404, bad URL) | `PermanentError` - fail immediately, no retry |
| Rate limited (429) | Retry with backoff |
| Network timeout | Retry with backoff |
| Authentication failure (401/403) | `PermanentError` - fail immediately |
| Max retries exceeded | Job archived as failed, logged for review |

---

## Queue Processing Behavior

### Polling & Concurrency

pg-boss workers poll for jobs continuously:

```typescript
// Worker configuration
await boss.work(
  QUEUE_NAMES[IntegrationType.WEBHOOK],
  {
    teamSize: 5,          // Process up to 5 jobs concurrently
    teamConcurrency: 2,   // Max 2 jobs per batch fetch
    newJobCheckInterval: 2000,  // Poll every 2 seconds (default)
  },
  handleWebhookJob
);
```

| Setting | Default | Description |
|---------|---------|-------------|
| `teamSize` | 1 | Max concurrent jobs per worker |
| `teamConcurrency` | 1 | Jobs fetched per poll |
| `newJobCheckInterval` | 2000ms | Polling interval |

### Job Lifecycle & Failed Jobs

```
Job Created → Processing → Success → Archived (completed)
                 ↓
              Failure
                 ↓
         Retry with backoff (attempts 1, 2, 3...)
                 ↓
         Max retries exceeded (retryLimit)
                 ↓
         Archived as 'failed' → Deleted after 30 days
```

**Failed jobs do NOT clog the active queue.** Once `retryLimit` is exhausted:

1. Job state changes to `failed`
2. Job moves from `pgboss.job` → `pgboss.archive`
3. `archiveFailedAfterSeconds` (7 days) - time before archival
4. `deleteAfterSeconds` (30 days) - permanently deleted

### Backpressure & Queue Health

If jobs accumulate faster than processing (e.g., external API is down):

```typescript
// Option 1: Job expiration - jobs auto-fail if not processed in time
{
  expireInSeconds: 1800,  // Fail if not processed within 30 min
}

// Option 2: Singleton jobs - prevent duplicate jobs per submission
{
  singletonKey: `${submissionId}-webhook`,  // Only one webhook job per submission
}

// Option 3: Rate limiting - throttle job creation
{
  singletonSeconds: 60,  // Only allow one job with this key per 60 seconds
}
```

### Monitoring Queue Health

```sql
-- Queue depth (jobs waiting to be processed)
SELECT name, COUNT(*) as pending
FROM pgboss.job
WHERE state = 'created'
GROUP BY name;

-- Jobs currently being processed
SELECT name, COUNT(*) as active
FROM pgboss.job
WHERE state = 'active'
GROUP BY name;

-- Retry jobs (failed but will retry)
SELECT name, COUNT(*) as retrying
FROM pgboss.job
WHERE state = 'retry'
GROUP BY name;

-- Failed jobs in archive (last 24h)
SELECT name, COUNT(*) as failed_count
FROM pgboss.archive
WHERE state = 'failed'
  AND archivedon > NOW() - INTERVAL '24 hours'
GROUP BY name;
```

### Alerting (Future Enhancement)

Add monitoring for:
- Queue depth exceeds threshold (e.g., > 1000 pending jobs)
- Failure rate exceeds threshold (e.g., > 10% in last hour)
- Job processing time exceeds expected (e.g., avg > 30s)

---

## Monitoring Jobs

pg-boss jobs can be monitored by querying the database directly:

```sql
-- Active jobs by queue
SELECT name, state, COUNT(*)
FROM pgboss.job
GROUP BY name, state;

-- Failed jobs in last 24h
SELECT name, data, output, completedon
FROM pgboss.archive
WHERE state = 'failed'
  AND archivedon > NOW() - INTERVAL '24 hours';

-- Average processing time by queue
SELECT name, AVG(EXTRACT(EPOCH FROM (completedon - createdon))) as avg_seconds
FROM pgboss.archive
WHERE state = 'completed'
GROUP BY name;
```

Future enhancement: Add a dashboard endpoint in dashboard-api to expose these metrics.

---

## Rollback & Migration Strategy

### Backward Compatibility

The new system is **feature-flagged**:

```typescript
// Environment variable
QUEUE_ENABLED=true  // false = old synchronous behavior

// In SubmissionController
if (getEnv('QUEUE_ENABLED') === 'true') {
  await queueIntegrationJobs(submission, integration, ...);
} else {
  await executeIntegrationsSynchronously(...);  // Existing code preserved
}
```

### Rollback Plan

1. Set `QUEUE_ENABLED=false` to revert to synchronous processing
2. Existing queued jobs will be processed by workers until drained
3. No data loss - submissions are saved before queueing

---

## Files to Create

```
libs/shared/queue/
├── src/
│   ├── index.ts                  # Public exports
│   ├── boss.ts                   # pg-boss instance factory
│   ├── queues.ts                 # Queue name constants
│   ├── types.ts                  # Job payload types
│   ├── worker.ts                 # Worker setup and lifecycle
│   └── handlers/
│       ├── index.ts              # Handler registry & error types
│       ├── emailSmtpHandler.ts   # SMTP email (Gmail OAuth, custom SMTP)
│       ├── emailApiHandler.ts    # Transactional APIs (Mailgun, SendGrid, Postmark, SES)
│       ├── webhookHandler.ts     # Handles generic, Make.com, and n8n
│       ├── telegramHandler.ts
│       ├── discordHandler.ts
│       └── slackHandler.ts
├── project.json
└── tsconfig.json
```

## Files to Modify

- `apps/collector-api/src/controller/SubmissionController.ts` - Queue jobs instead of sync execution
- `apps/collector-api/src/index.ts` - Start/stop pg-boss worker
- `apps/collector-api/package.json` - Add pg-boss dependency
- `.env.development.example` - Add `QUEUE_ENABLED=true`
- `.env.production.example` - Add `QUEUE_ENABLED=true`
- `tsconfig.base.json` - Add path alias for `@formflow/shared/queue`

---

## Testing Strategy

1. **Unit tests for job handlers**
   - Mock external APIs (nodemailer, axios)
   - Test success/failure scenarios
   - Test `PermanentError` vs retryable error classification

2. **Integration tests**
   - Use test database
   - Verify jobs are queued correctly
   - Verify worker processes jobs
   - Test retry behavior

3. **Manual testing in test-lab**
   - Submit forms and verify integrations fire asynchronously
   - Test failure scenarios (invalid webhook URLs, etc.)
   - Verify jobs appear in `pgboss.job` table

---

## Timeline Estimate

| Phase | Effort |
|-------|--------|
| Phase 1: Library setup | 1-2 hours |
| Phase 2: Queue library implementation | 3-4 hours |
| Phase 3: Collector API changes | 2-3 hours |
| Phase 4: Integration handlers | 2-3 hours |
| Testing & validation | 2-3 hours |
| **Total** | **10-15 hours** |

---

## Future Enhancements

1. **Priority queues** - Paid tiers get higher priority jobs
2. **Dashboard monitoring** - API endpoint to view job status/metrics
3. **Webhook delivery reports** - Show delivery status in submission details
4. **Rate limiting per organization** - Use pg-boss throttling
5. **Custom retry policies per form** - Configurable in dashboard
6. **Job scheduling** - Delay delivery until specific time (pg-boss supports this natively)
7. **Batch processing** - Group multiple submissions for bulk webhook delivery

---

## Execution Task List

### Phase 1: Library Setup

- [ ] **1.1** Install pg-boss dependency
  ```bash
  pnpm add pg-boss
  ```

- [ ] **1.2** Create library directory structure
  ```bash
  mkdir -p libs/shared/queue/src/handlers
  ```

- [ ] **1.3** Create `libs/shared/queue/project.json`
  ```json
  {
    "name": "shared-queue",
    "$schema": "../../../node_modules/nx/schemas/project-schema.json",
    "sourceRoot": "libs/shared/queue/src",
    "projectType": "library",
    "tags": ["scope:shared"],
    "targets": {}
  }
  ```

- [ ] **1.4** Create `libs/shared/queue/tsconfig.json`

- [ ] **1.5** Add path alias to `tsconfig.base.json`
  ```json
  "@formflow/shared/queue": ["libs/shared/queue/src/index.ts"]
  ```

- [ ] **1.6** Add `QUEUE_ENABLED=false` to `.env.development.example`

- [ ] **1.7** Add `QUEUE_ENABLED=false` to `.env.production.example`

---

### Phase 2: Core Queue Library

- [ ] **2.1** Create `libs/shared/queue/src/types.ts`
  - Define `IntegrationType` enum
  - Define `QUEUE_NAMES` constant
  - Define `IntegrationJobData` interface
  - Define `QueueJobOptions` interface

- [ ] **2.2** Create `libs/shared/queue/src/boss.ts`
  - Implement `getBoss()` singleton factory
  - Implement `stopBoss()` for graceful shutdown
  - Configure archive/delete intervals
  - Add error and monitoring event handlers

- [ ] **2.3** Create `libs/shared/queue/src/handlers/index.ts`
  - Define `PermanentError` class for non-retryable failures
  - Export handler registry type

- [ ] **2.4** Create `libs/shared/queue/src/worker.ts`
  - Implement `startWorker()` - subscribe to all queues
  - Implement `stopWorker()` - graceful shutdown
  - Route jobs to appropriate handlers
  - Handle `PermanentError` vs retryable errors

- [ ] **2.5** Create `libs/shared/queue/src/index.ts`
  - Export all public APIs

---

### Phase 3: Integration Handlers

- [ ] **3.1** Create `libs/shared/queue/src/handlers/emailSmtpHandler.ts`
  - Move Gmail OAuth logic from SubmissionController
  - Add support for custom SMTP servers
  - Implement proper error classification

- [ ] **3.2** Create `libs/shared/queue/src/handlers/emailApiHandler.ts`
  - Implement Mailgun support
  - Implement SendGrid support
  - Implement Postmark support
  - Implement AWS SES support
  - Add provider detection from config

- [ ] **3.3** Create `libs/shared/queue/src/handlers/telegramHandler.ts`
  - Move Telegram logic from SubmissionController
  - Use existing `@formflow/shared/telegram` service

- [ ] **3.4** Create `libs/shared/queue/src/handlers/discordHandler.ts`
  - Move Discord webhook logic from SubmissionController
  - Add proper error handling for Discord API errors

- [ ] **3.5** Create `libs/shared/queue/src/handlers/slackHandler.ts`
  - Move Slack logic from SubmissionController
  - Handle Slack API rate limits

- [ ] **3.6** Create `libs/shared/queue/src/handlers/webhookHandler.ts`
  - Consolidate generic webhook, Make.com, n8n logic
  - Add timeout handling (30s)
  - Classify 4xx vs 5xx errors appropriately

---

### Phase 4: Collector API Integration

- [ ] **4.1** Create helper function `queueIntegrationJobs()` in SubmissionController
  - Accept submission, integration, form data
  - Queue appropriate jobs based on enabled integrations
  - Use singleton keys to prevent duplicates

- [ ] **4.2** Update `SubmissionController.ts` POST handler
  - Add feature flag check `QUEUE_ENABLED`
  - If enabled: call `queueIntegrationJobs()` and return immediately
  - If disabled: keep existing synchronous behavior
  - Keep existing integration code intact for rollback

- [ ] **4.3** Update `apps/collector-api/src/index.ts`
  - Import queue library
  - Start pg-boss and worker on app startup
  - Add graceful shutdown handlers (SIGTERM, SIGINT)
  - Ensure worker stops before process exits

- [ ] **4.4** Update `apps/collector-api/package.json`
  - Add pg-boss to dependencies (if not using workspace root)

---

### Phase 5: Entity & Database Updates (Optional)

- [ ] **5.1** Consider adding `IntegrationJob` entity for tracking
  - Links to Submission
  - Stores integration type, status, attempts, errors
  - Allows dashboard to show delivery status

- [ ] **5.2** Create migration if entity added
  - `apps/dashboard-api/src/migrations/XXXX-CreateIntegrationJobTable.ts`

- [ ] **5.3** Update `Submission` entity with relation (if entity added)

---

### Phase 6: Testing

- [ ] **6.1** Write unit tests for `boss.ts`
  - Test singleton behavior
  - Test connection string construction
  - Mock pg-boss for unit tests

- [ ] **6.2** Write unit tests for each handler
  - Mock external services (nodemailer, axios, telegram)
  - Test success scenarios
  - Test retryable error scenarios
  - Test permanent error scenarios

- [ ] **6.3** Write unit tests for `worker.ts`
  - Test job routing to correct handlers
  - Test error handling and classification

- [ ] **6.4** Write integration tests
  - Use test database
  - Verify jobs queued correctly
  - Verify jobs processed correctly
  - Verify retry behavior

- [ ] **6.5** Manual testing in test-lab
  - Submit form with all integrations enabled
  - Verify async processing (fast response)
  - Check `pgboss.job` table for queued jobs
  - Check `pgboss.archive` for completed jobs
  - Test with invalid webhook URL (verify retries then archive)

---

### Phase 7: Documentation & Cleanup

- [ ] **7.1** Update CLAUDE.md with queue library info

- [ ] **7.2** Add inline code comments for complex logic

- [ ] **7.3** Remove dead code after feature flag is confirmed working

- [ ] **7.4** Update context/ENVIRONMENT_CONFIGURATION.md with `QUEUE_ENABLED`

---

### Phase 8: Deployment & Rollout

- [ ] **8.1** Deploy with `QUEUE_ENABLED=false` (no behavior change)

- [ ] **8.2** Verify pg-boss schema created in database
  ```sql
  SELECT * FROM pgboss.version;
  ```

- [ ] **8.3** Enable queue in staging: `QUEUE_ENABLED=true`

- [ ] **8.4** Monitor staging for issues
  - Check logs for queue errors
  - Verify integrations still fire
  - Check queue depth and processing times

- [ ] **8.5** Enable queue in production: `QUEUE_ENABLED=true`

- [ ] **8.6** Monitor production
  - Set up alerts for queue depth > threshold
  - Set up alerts for failure rate > threshold

- [ ] **8.7** After 1 week stable: Remove feature flag and synchronous code path

---

### Summary Checklist

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1: Library Setup | 7 tasks | ⬜ Not started |
| Phase 2: Core Queue Library | 5 tasks | ⬜ Not started |
| Phase 3: Integration Handlers | 6 tasks | ⬜ Not started |
| Phase 4: Collector API Integration | 4 tasks | ⬜ Not started |
| Phase 5: Entity & Database (Optional) | 3 tasks | ⬜ Not started |
| Phase 6: Testing | 5 tasks | ⬜ Not started |
| Phase 7: Documentation & Cleanup | 4 tasks | ⬜ Not started |
| Phase 8: Deployment & Rollout | 7 tasks | ⬜ Not started |
| **Total** | **41 tasks** | |
