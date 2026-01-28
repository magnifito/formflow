
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
    correlationId?: string;

    // Submission data
    formData: Record<string, any>;
    formattedMessage: string;
    formName: string;

    // Integration-specific config (encrypted values decrypted before queueing or handled by worker? 
    // actually, controller processes them so we likely pass plain values here locally, 
    // but if we want to support encrypted config in future we can. For now, we pass what the controller prepares.)
    config: {
        // Email (common)
        recipients?: string[];
        subject?: string;
        fromEmail?: string;

        // Email SMTP
        smtp?: {
            host: string;
            port: number;
            username: string; // This might be sensitive in logs, but job data is in DB.
            password: string;
            secure?: boolean;
        };

        // Email OAuth (Gmail, etc.)
        oauth?: {
            clientId: string;
            clientSecret: string;
            accessToken: string;
            refreshToken: string;
            user: string; // Email address for the user
        };

        // Email API (Mailgun, SendGrid, Postmark, etc.)
        emailApi?: {
            provider: 'mailgun' | 'sendgrid' | 'postmark' | 'ses';
            apiToken: string;
            domain?: string;      // Mailgun domain
            region?: string;      // Mailgun region (US/EU), SES region
        };

        // Telegram (chatId per-integration, botToken from org)
        chatId?: string;
        botToken?: string;  // Injected from organization settings

        // Discord
        webhookUrl?: string;

        // Slack (channelId per-integration, accessToken from org)
        channelId?: string;
        accessToken?: string;  // Injected from organization settings

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
