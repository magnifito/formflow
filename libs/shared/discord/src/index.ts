import axios from 'axios';
import logger, { LogOperation, LogMessages } from '@formflow/shared/logger';

export interface DiscordEmbedField {
    name: string;
    value: string;
    inline?: boolean;
}

export interface DiscordEmbedFooter {
    text: string;
    icon_url?: string;
}

export interface DiscordEmbed {
    title?: string;
    description?: string;
    url?: string;
    color?: number;
    fields?: DiscordEmbedField[];
    footer?: DiscordEmbedFooter;
    timestamp?: string;
}

export interface DiscordSendOptions {
    content?: string;
    username?: string;
    avatarUrl?: string;
    embeds?: DiscordEmbed[];
}

export interface DiscordLogContext {
    formId?: number;
    submissionId?: number;
    correlationId?: string;
}

export interface DiscordSendResult {
    success: boolean;
    error?: string;
}

// Discord embed color constants
export const DiscordColors = {
    PRIMARY: 0x5865f2,    // Discord Blurple
    SUCCESS: 0x57f287,    // Green
    WARNING: 0xfee75c,    // Yellow
    ERROR: 0xed4245,      // Red
    INFO: 0x5865f2,       // Blurple
} as const;

/**
 * DiscordService - Discord Webhook integration
 *
 * Handles all Discord messaging operations for FormFlow including:
 * - Sending form submission notifications with rich embeds
 * - Sending test messages
 */
export class DiscordService {
    private readonly webhookUrl: string;

    constructor(webhookUrl: string) {
        if (!webhookUrl) {
            throw new Error('Discord webhook URL is required');
        }
        this.webhookUrl = webhookUrl;
    }

    /**
     * Send a message to Discord via webhook
     */
    async sendMessage(options: DiscordSendOptions, logContext?: DiscordLogContext): Promise<DiscordSendResult> {
        const { content, username, avatarUrl, embeds } = options;

        const payload: Record<string, unknown> = {};

        if (content) {
            payload.content = content;
        }
        if (username) {
            payload.username = username;
        }
        if (avatarUrl) {
            payload.avatar_url = avatarUrl;
        }
        if (embeds && embeds.length > 0) {
            payload.embeds = embeds;
        }

        try {
            await axios.post(this.webhookUrl, payload);

            if (logContext) {
                logger.info(LogMessages.integrationSendSuccess('Discord'), {
                    operation: LogOperation.INTEGRATION_DISCORD_SEND,
                    ...logContext,
                });
            }

            return { success: true };
        } catch (err: unknown) {
            const axiosError = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
            const errorMessage = axiosError.response?.data?.message || axiosError.message || 'Unknown error';
            const status = axiosError.response?.status;

            if (logContext) {
                logger.error(LogMessages.integrationSendFailed('Discord'), {
                    operation: LogOperation.INTEGRATION_DISCORD_SEND,
                    error: errorMessage,
                    status,
                    ...logContext,
                });
            }

            return {
                success: false,
                error: `${status ? `[${status}] ` : ''}${errorMessage}`,
            };
        }
    }

    /**
     * Send a form submission notification with rich embed
     */
    async sendSubmissionNotification(
        formName: string,
        formData: Record<string, unknown>,
        logContext: DiscordLogContext
    ): Promise<DiscordSendResult> {
        const fields: DiscordEmbedField[] = Object.entries(formData).map(([key, value]) => ({
            name: key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            inline: String(value).length < 30,
        }));

        const embed: DiscordEmbed = {
            title: `New Submission: ${formName}`,
            color: DiscordColors.PRIMARY,
            fields,
            footer: {
                text: 'FormFlow',
            },
            timestamp: new Date().toISOString(),
        };

        return this.sendMessage(
            { embeds: [embed], username: 'FormFlow' },
            logContext
        );
    }

    /**
     * Send a simple text message (for testing or notifications)
     */
    async sendTextMessage(message: string, logContext?: DiscordLogContext): Promise<DiscordSendResult> {
        return this.sendMessage({ content: message }, logContext);
    }

    /**
     * Check if an error is permanent (should not retry)
     */
    static isPermanentError(status?: number): boolean {
        return status === 404 || status === 401 || status === 403;
    }

    /**
     * Format form data into a readable string (fallback for plain text)
     */
    static formatMessage(data: Record<string, unknown>): string {
        return Object.entries(data)
            .map(([k, v]) => `**${k}:** ${typeof v === 'string' ? v : JSON.stringify(v)}`)
            .join('\n');
    }
}

export default DiscordService;
