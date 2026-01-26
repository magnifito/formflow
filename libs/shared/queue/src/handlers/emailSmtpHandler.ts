
import { IntegrationJobData } from '../types';
import * as nodemailer from 'nodemailer';
import logger, { LogOperation, LogMessages } from '@formflow/shared/logger';
import { PermanentError } from './index';

export async function handleEmailSmtpJob(job: IntegrationJobData): Promise<void> {
    const { submissionId, formId, formattedMessage, config, correlationId, formName } = job;

    if (!config.recipients || config.recipients.length === 0) {
        throw new PermanentError('No email recipients configured');
    }

    if (!config.smtp && !config.oauth) {
        throw new PermanentError('Email integration missing SMTP or OAuth configuration');
    }

    // Create transporter
    let transporter: nodemailer.Transporter;

    if (config.smtp) {
        if (!config.smtp.username || !config.smtp.password || !config.smtp.host || !config.smtp.port) {
            throw new PermanentError('SMTP configuration incomplete');
        }
        transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.secure ?? (config.smtp.port === 465),
            auth: {
                user: config.smtp.username,
                pass: config.smtp.password,
            },
            tls: {
                rejectUnauthorized: false
            },
            debug: true,
            logger: true,
            connectionTimeout: 10000, // 10s
            greetingTimeout: 10000,   // 10s
            socketTimeout: 10000,     // 10s
            // Disable STARTTLS for local Mailpit to avoid handshake issues on port 1025
            ignoreTLS: config.smtp.host === '127.0.0.1' || config.smtp.host === 'localhost' || config.smtp.port === 1025,
        });
    } else {
        if (!config.oauth?.clientId || !config.oauth?.clientSecret || !config.oauth?.user || !config.oauth.refreshToken || !config.oauth.accessToken) {
            throw new PermanentError('OAuth configuration incomplete');
        }
        transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                type: 'OAuth2',
                clientId: config.oauth.clientId,
                clientSecret: config.oauth.clientSecret,
            },
        });
    }

    const mailOptions = {
        from: config.fromEmail || '"New FormFlow Submission" <new-submission@formflow.fyi>',
        to: config.recipients,
        subject: config.subject || `New Form Submission: ${formName}`,
        text: formattedMessage,
        auth: !config.smtp ? {
            user: config.oauth!.user,
            refreshToken: config.oauth!.refreshToken,
            accessToken: config.oauth!.accessToken,
            expires: 1484314697598,
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
