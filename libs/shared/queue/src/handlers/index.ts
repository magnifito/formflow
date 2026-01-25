
export class PermanentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PermanentError';
    }
}

export * from './emailSmtpHandler';
export * from './emailApiHandler';
export * from './telegramHandler';
export * from './discordHandler';
export * from './slackHandler';
export * from './webhookHandler';
