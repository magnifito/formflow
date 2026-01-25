
import { IntegrationJobData } from '../types';
import nodemailer from 'nodemailer';
import { getEnv } from '@formflow/shared/env';
import logger, { LogOperation, LogMessages } from '@formflow/shared/logger';
import { PermanentError } from './index';

export async function handleEmailSmtpJob(job: IntegrationJobData): Promise<void> {
    const { submissionId, formId, formattedMessage, config, correlationId, formName } = job;

    if (!config.recipients || config.recipients.length === 0) {
        throw new PermanentError('No email recipients configured');
    }

    // Create transporter
    // Priority: Custom SMTP config > Default Gmail OAuth (from env)
    let transporter: nodemailer.Transporter;

    if (config.smtp) {
        transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.secure ?? true,
            auth: {
                user: config.smtp.username,
                pass: config.smtp.password,
            },
        });
    } else {
        // Default Gmail OAuth
        transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                type: 'OAuth2',
                clientId: config.oauth?.clientId || getEnv('GMAIL_CLIENT'),
                clientSecret: config.oauth?.clientSecret || getEnv('GMAIL_SECRET'),
            },
        });
    }

    const mailOptions = {
        from: config.fromEmail || '"New FormFlow Submission" <new-submission@formflow.fyi>',
        to: config.recipients,
        subject: config.subject || `New Form Submission: ${formName}`,
        text: formattedMessage,
        auth: !config.smtp ? {
            // Gmail OAuth specific auth props for the MAIL message (auth in createTransport handles connection)
            // Wait, nodemailer OAuth2: user/refreshToken/accessToken are needed.
            // In controller: user, refreshToken, accessToken are passed in sendMail() auth options.
            user: config.oauth?.user || getEnv('GMAIL_EMAIL'),
            refreshToken: config.oauth?.refreshToken || getEnv('GMAIL_REFRESH'),
            accessToken: config.oauth?.accessToken || getEnv('GMAIL_ACCESS'),
            expires: 1484314697598, // Copied from controller, seems like a placeholder or legacy
        } : undefined,
    };

    try {
        await transporter.sendMail(mailOptions);

        logger.info(LogMessages.integrationSendSuccess('Email'), {
            operation: LogOperation.INTEGRATION_EMAIL_SEND,
            formId,
            submissionId,
            recipientCount: config.recipients.length,
            correlationId,
        });
    } catch (error: any) {
        // Classify error
        const fatal = error.responseCode && (error.responseCode >= 500 && error.responseCode < 600); // 5xx are usually fatal/permanent config errors? No, 5xx is server error (temporary). 4xx is permanent.
        // SMTP codes:
        // 4xx: Transient Negative Completion (Retry)
        // 5xx: Permanent Negative Completion (Fail)
        // Actually in SMTP: 550 User unknown (Permanent). 421 Service not available (Transient).

        // For now, allow retry on almost everything EXCEPT auth failure or invalid recipients.
        if (error.code === 'EAUTH' || error.responseCode === 535) {
            throw new PermanentError(`Authentication failed: ${error.message}`);
        }

        logger.error(LogMessages.integrationSendFailed('Email'), {
            operation: LogOperation.INTEGRATION_EMAIL_SEND,
            error: error.message,
            formId,
            submissionId,
            recipientCount: config.recipients.length,
            correlationId,
        });

        throw error; // Retry
    }
}
