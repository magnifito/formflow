import { IntegrationJobData } from '../types';
import axios from 'axios';
import logger, { LogOperation, LogMessages } from '@formflow/shared/logger';
import { PermanentError } from './index';

export async function handleWhatsAppJob(
  job: IntegrationJobData,
): Promise<void> {
  const { submissionId, formId, formattedMessage, config, correlationId } = job;

  if (!config.whatsapp?.accessToken) {
    throw new PermanentError('No WhatsApp access token configured');
  }

  if (!config.whatsapp?.phoneNumberId) {
    throw new PermanentError('No WhatsApp phone number ID configured');
  }

  if (!config.whatsapp?.recipientNumber) {
    throw new PermanentError('No WhatsApp recipient number configured');
  }

  // Meta Cloud API URL
  const url = `https://graph.facebook.com/v17.0/${config.whatsapp.phoneNumberId}/messages`;

  // Construct payload for a simple text message
  const payload = {
    messaging_product: 'whatsapp',
    to: config.whatsapp.recipientNumber,
    type: 'text',
    text: {
      // Truncate message if needed, WhatsApp has limits (4096 chars usually, but good practice)
      body:
        formattedMessage.length > 4000
          ? formattedMessage.substring(0, 4000) + '...'
          : formattedMessage,
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${config.whatsapp.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info(LogMessages.integrationSendSuccess('WhatsApp'), {
      operation: LogOperation.INTEGRATION_WHATSAPP_SEND,
      formId,
      submissionId,
      messageId: response.data?.messages?.[0]?.id,
      correlationId,
    });
  } catch (error: any) {
    // Meta API Errors
    const metaError = error.response?.data?.error;
    const errorMessage = metaError?.message || error.message;
    const errorCode = metaError?.code;

    // Check for permanent errors
    // 190: Invalid OAuth 2.0 Access Token
    // 131030: Recipient phone number not in allowed list (for test numbers)
    // 131008: Message failed to send (sometimes permanent if blocked)
    if (errorCode === 190 || errorCode === 131030) {
      throw new PermanentError(`WhatsApp API Error: ${errorMessage}`);
    }

    logger.error(LogMessages.integrationSendFailed('WhatsApp'), {
      operation: LogOperation.INTEGRATION_WHATSAPP_SEND,
      error: errorMessage,
      errorCode,
      formId,
      submissionId,
      correlationId,
    });

    throw error; // Retry
  }
}
