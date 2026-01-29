import axios from 'axios';
import { getEnv } from '@formflow/shared/env';
import logger, { LogOperation, LogMessages } from '@formflow/shared/logger';

export interface SlackSendOptions {
    channel: string;
    message: string;
    username?: string;
    iconEmoji?: string;
    iconUrl?: string;
    blocks?: SlackBlock[];
}

export interface SlackBlock {
    type: string;
    text?: {
        type: 'plain_text' | 'mrkdwn';
        text: string;
        emoji?: boolean;
    };
    fields?: Array<{
        type: 'plain_text' | 'mrkdwn';
        text: string;
    }>;
    accessory?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface SlackLogContext {
    formId?: number;
    submissionId?: number;
    targetUserId?: number;
    correlationId?: string;
}

export interface SlackSendResult {
    success: boolean;
    ts?: string;
    channel?: string;
    error?: string;
}

/**
 * SlackService - Centralized Slack Bot API integration
 *
 * Handles all Slack messaging operations for FormFlow including:
 * - Sending form submission notifications to channels
 * - Sending direct messages to users
 * - Sending test messages
 * - Sending unlink notifications
 */
export class SlackService {
    private readonly botToken: string;
    private readonly baseUrl = 'https://slack.com/api';

    constructor(botToken?: string) {
        this.botToken = botToken || getEnv('SLACK_BOT_TOKEN');
    }

    /**
     * Send a message to a Slack channel or user
     */
    async sendMessage(options: SlackSendOptions, logContext?: SlackLogContext): Promise<SlackSendResult> {
        const { channel, message, username, iconEmoji, iconUrl, blocks } = options;

        const payload: Record<string, unknown> = {
            channel,
            text: message,
        };

        if (username) {
            payload.username = username;
        }

        if (iconEmoji) {
            payload.icon_emoji = iconEmoji;
        }

        if (iconUrl) {
            payload.icon_url = iconUrl;
        }

        if (blocks && blocks.length > 0) {
            payload.blocks = blocks;
        }

        try {
            const response = await axios.post(`${this.baseUrl}/chat.postMessage`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.botToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.data.ok) {
                throw new Error(response.data.error || 'Unknown Slack API error');
            }

            if (logContext) {
                logger.info(LogMessages.integrationSendSuccess('Slack'), {
                    operation: LogOperation.INTEGRATION_SLACK_SEND,
                    ...logContext,
                });
            }

            return {
                success: true,
                ts: response.data.ts,
                channel: response.data.channel,
            };
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
            const errorMessage = axiosError.response?.data?.error || axiosError.message || 'Unknown error';

            if (logContext) {
                logger.error(LogMessages.integrationSendFailed('Slack'), {
                    operation: LogOperation.INTEGRATION_SLACK_SEND,
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
        channel: string,
        formattedMessage: string,
        logContext: SlackLogContext
    ): Promise<SlackSendResult> {
        return this.sendMessage(
            { channel, message: formattedMessage },
            logContext
        );
    }

    /**
     * Send a rich form submission notification with blocks
     */
    async sendRichSubmissionNotification(
        channel: string,
        formName: string,
        submissionData: Record<string, unknown>,
        logContext: SlackLogContext
    ): Promise<SlackSendResult> {
        const blocks: SlackBlock[] = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `New submission: ${formName}`,
                    emoji: true,
                },
            },
            {
                type: 'divider',
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: SlackService.formatMessageAsMarkdown(submissionData),
                },
            },
        ];

        return this.sendMessage(
            {
                channel,
                message: `New form submission for ${formName}`,
                blocks,
            },
            logContext
        );
    }

    /**
     * Send an unlink notification when a user disconnects Slack
     */
    async sendUnlinkNotification(channel: string): Promise<SlackSendResult> {
        return this.sendMessage({
            channel,
            message: 'FormFlow will no longer be sending your form submission data to this channel!',
        });
    }

    /**
     * Send a test message to verify the integration
     */
    async sendTestMessage(channel: string): Promise<SlackSendResult> {
        return this.sendMessage({
            channel,
            message: 'This is a test message from FormFlow. Your Slack integration is working correctly!',
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

    /**
     * Format a message object into Slack mrkdwn format
     */
    static formatMessageAsMarkdown(data: Record<string, unknown>): string {
        return Object.entries(data)
            .map(([k, v]) => `*${k}:* ${typeof v === 'string' ? v : JSON.stringify(v)}`)
            .join('\n');
    }
}

// Default singleton instance
let defaultInstance: SlackService | null = null;

/**
 * Get the default SlackService instance (singleton)
 */
export function getSlackService(): SlackService {
    if (!defaultInstance) {
        defaultInstance = new SlackService();
    }
    return defaultInstance;
}

export default SlackService;
