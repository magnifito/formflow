import axios from 'axios';
import { getEnv } from '@formflow/shared/env';
import logger, { LogOperation, LogMessages } from '@formflow/shared/logger';

export interface TelegramSendOptions {
    chatId: number;
    message: string;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export interface TelegramLogContext {
    formId?: number;
    submissionId?: number;
    targetUserId?: number;
    correlationId?: string;
}

export interface TelegramSendResult {
    success: boolean;
    messageId?: number;
    error?: string;
}

/**
 * TelegramService - Centralized Telegram Bot API integration
 *
 * Handles all Telegram messaging operations for FormFlow including:
 * - Sending form submission notifications
 * - Sending test messages
 * - Sending unlink notifications
 */
export class TelegramService {
    private readonly botToken: string;
    private readonly baseUrl: string;

    constructor(botToken?: string) {
        this.botToken = botToken || getEnv('TELEGRAM_BOT_TOKEN');
        this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    }

    /**
     * Send a message to a Telegram chat
     */
    async sendMessage(options: TelegramSendOptions, logContext?: TelegramLogContext): Promise<TelegramSendResult> {
        const { chatId, message, parseMode } = options;

        const payload: Record<string, unknown> = {
            chat_id: chatId,
            text: message,
        };

        if (parseMode) {
            payload.parse_mode = parseMode;
        }

        try {
            const response = await axios.post(`${this.baseUrl}/sendMessage`, payload);

            if (logContext) {
                logger.info(LogMessages.integrationSendSuccess('Telegram'), {
                    operation: LogOperation.INTEGRATION_TELEGRAM_SEND,
                    ...logContext,
                });
            }

            return {
                success: true,
                messageId: response.data?.result?.message_id,
            };
        } catch (err: any) {
            const errorMessage = err.response?.data?.description || err.message;

            if (logContext) {
                logger.error(LogMessages.integrationSendFailed('Telegram'), {
                    operation: LogOperation.INTEGRATION_TELEGRAM_SEND,
                    error: errorMessage,
                    ...logContext,
                });
            }

            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Send a form submission notification
     */
    async sendSubmissionNotification(
        chatId: number,
        formattedMessage: string,
        logContext: TelegramLogContext
    ): Promise<TelegramSendResult> {
        return this.sendMessage(
            { chatId, message: formattedMessage },
            logContext
        );
    }

    /**
     * Send an unlink notification when a user disconnects Telegram
     */
    async sendUnlinkNotification(chatId: number): Promise<TelegramSendResult> {
        return this.sendMessage({
            chatId,
            message: 'FormFlow will no longer be sending your form submission data to this chat!',
        });
    }

    /**
     * Format a message object into a readable string
     */
    static formatMessage(data: Record<string, unknown>): string {
        return Object.entries(data)
            .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
            .join('\n\n');
    }
}

// Default singleton instance
let defaultInstance: TelegramService | null = null;

/**
 * Get the default TelegramService instance (singleton)
 */
export function getTelegramService(): TelegramService {
    if (!defaultInstance) {
        defaultInstance = new TelegramService();
    }
    return defaultInstance;
}

export default TelegramService;
