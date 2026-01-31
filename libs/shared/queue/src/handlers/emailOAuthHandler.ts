import { IntegrationJobData } from '../types';
import * as nodemailer from 'nodemailer';
import logger, { LogOperation, LogMessages } from '@formflow/shared/logger';
import { PermanentError } from './index';

export async function handleEmailOAuthJob(
  job: IntegrationJobData,
): Promise<void> {
  const {
    submissionId,
    formId,
    formattedMessage,
    config,
    correlationId,
    formName,
  } = job;

  if (!config.recipients || config.recipients.length === 0) {
    throw new PermanentError('No email recipients configured');
  }

  if (
    !config.oauth?.clientId ||
    !config.oauth?.clientSecret ||
    !config.oauth?.user ||
    !config.oauth.refreshToken ||
    !config.oauth.accessToken
  ) {
    throw new PermanentError('OAuth configuration incomplete');
  }

  // Create transporter (Gmail/Outlook specific for now)
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // TODO: Make this configurable if supporting Outlook or others
    port: 465,
    secure: true,
    auth: {
      type: 'OAuth2',
      clientId: config.oauth.clientId,
      clientSecret: config.oauth.clientSecret,
    },
  });

  const mailOptions = {
    from:
      config.fromEmail ||
      '"New FormFlow Submission" <new-submission@formflow.fyi>',
    to: config.recipients,
    subject: config.subject || `New Form Submission: ${formName}`,
    text: formattedMessage,
    auth: {
      user: config.oauth.user,
      refreshToken: config.oauth.refreshToken,
      accessToken: config.oauth.accessToken,
      expires: 1484314697598, // This seems to be a hardcoded future timestamp or something? Needs investigation but keeping as-is from legacy code.
    },
  };

  try {
    await transporter.sendMail(mailOptions);

    logger.info(LogMessages.integrationSendSuccess('Email (OAuth)'), {
      operation: LogOperation.INTEGRATION_EMAIL_SEND,
      formId,
      submissionId,
      recipientCount: config.recipients.length,
      correlationId,
    });
  } catch (error: any) {
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      throw new PermanentError(`Authentication failed: ${error.message}`);
    }

    logger.error(LogMessages.integrationSendFailed('Email (OAuth)'), {
      operation: LogOperation.INTEGRATION_EMAIL_SEND,
      error: error.message,
      formId,
      submissionId,
      recipientCount: config.recipients.length,
      correlationId,
    });

    throw error;
  }
}
