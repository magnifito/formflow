export class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentError';
  }
}

export * from './emailSmtpHandler';
export * from './emailOAuthHandler';
export * from './emailApiHandler';
export * from './telegramHandler';
export * from './whatsappHandler';
export * from './discordHandler';
export * from './slackHandler';
export * from './webhookHandler';
