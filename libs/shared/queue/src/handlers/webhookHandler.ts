import { IntegrationJobData } from '../types';
import axios, { AxiosRequestConfig, Method } from 'axios';
import logger, { LogOperation, LogMessages } from '@formflow/shared/logger';
import { PermanentError } from './index';

interface KeyValuePair {
  key: string;
  value: string;
}

/**
 * Resolves template variables in a value string.
 * Supports:
 *   {{formData}} - All form data as JSON
 *   {{submissionId}} - Submission ID
 *   {{formId}} - Form ID
 *   {{formName}} - Form name
 *   {{timestamp}} - Current ISO timestamp
 *   {{field.fieldName}} - Specific form field value
 */
function resolveTemplateValue(
  template: string,
  context: {
    formData: Record<string, unknown>;
    submissionId: number;
    formId: number;
    formName: string;
  },
): string | Record<string, unknown> {
  // If the entire value is {{formData}}, return the object directly
  if (template === '{{formData}}') {
    return context.formData;
  }

  // Handle other simple replacements
  if (template === '{{submissionId}}') {
    return String(context.submissionId);
  }
  if (template === '{{formId}}') {
    return String(context.formId);
  }
  if (template === '{{formName}}') {
    return context.formName;
  }
  if (template === '{{timestamp}}') {
    return new Date().toISOString();
  }

  // Handle field references: {{field.fieldName}}
  const fieldMatch = template.match(/^\{\{field\.(.+)\}\}$/);
  if (fieldMatch && fieldMatch[1]) {
    const fieldName = fieldMatch[1];
    const fieldValue = context.formData[fieldName];
    return fieldValue !== undefined ? String(fieldValue) : '';
  }

  // If it contains template syntax but isn't a simple match, do string interpolation
  let result = template;
  result = result.replace(
    /\{\{submissionId\}\}/g,
    String(context.submissionId),
  );
  result = result.replace(/\{\{formId\}\}/g, String(context.formId));
  result = result.replace(/\{\{formName\}\}/g, context.formName);
  result = result.replace(/\{\{timestamp\}\}/g, new Date().toISOString());
  result = result.replace(/\{\{field\.(\w+)\}\}/g, (_, fieldName) => {
    const fieldValue = context.formData[fieldName];
    return fieldValue !== undefined ? String(fieldValue) : '';
  });

  return result;
}

/**
 * Builds request body from bodyParams configuration.
 * If no bodyParams are specified, returns the full formData.
 */
function buildRequestBody(
  bodyParams: KeyValuePair[] | undefined,
  context: {
    formData: Record<string, unknown>;
    submissionId: number;
    formId: number;
    formName: string;
  },
): Record<string, unknown> {
  // If no custom body params, send full form data with metadata
  if (!bodyParams || bodyParams.length === 0) {
    return {
      ...context.formData,
      _meta: {
        submissionId: context.submissionId,
        formId: context.formId,
        formName: context.formName,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Build custom body from params
  const body: Record<string, unknown> = {};
  for (const param of bodyParams) {
    if (param.key) {
      body[param.key] = resolveTemplateValue(param.value, context);
    }
  }
  return body;
}

/**
 * Builds URL with query parameters from urlParams configuration.
 */
function buildUrlWithParams(
  baseUrl: string,
  urlParams: KeyValuePair[] | undefined,
  context: {
    formData: Record<string, unknown>;
    submissionId: number;
    formId: number;
    formName: string;
  },
): string {
  if (!urlParams || urlParams.length === 0) {
    return baseUrl;
  }

  const url = new URL(baseUrl);
  for (const param of urlParams) {
    if (param.key) {
      const value = resolveTemplateValue(param.value, context);
      url.searchParams.append(param.key, String(value));
    }
  }
  return url.toString();
}

/**
 * Builds headers from headers configuration.
 */
function buildHeaders(
  headerParams: KeyValuePair[] | undefined,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!headerParams || headerParams.length === 0) {
    return headers;
  }

  for (const param of headerParams) {
    if (param.key && param.value) {
      headers[param.key] = param.value;
    }
  }
  return headers;
}

/**
 * Builds cookie header from cookies configuration.
 */
function buildCookieHeader(
  cookieParams: KeyValuePair[] | undefined,
): string | undefined {
  if (!cookieParams || cookieParams.length === 0) {
    return undefined;
  }

  const cookies = cookieParams
    .filter((c) => c.key && c.value)
    .map((c) => `${c.key}=${c.value}`)
    .join('; ');

  return cookies || undefined;
}

export async function handleWebhookJob(job: IntegrationJobData): Promise<void> {
  const { submissionId, formId, formData, formName, config, correlationId } =
    job;

  if (!config.webhook) {
    throw new PermanentError('No webhook URL configured');
  }

  const sourceName = 'Webhook';
  const logOpSuccess = LogOperation.INTEGRATION_WEBHOOK_SEND;

  // Build request context
  const context = { formData, submissionId, formId, formName };

  // Build request components
  const method: Method = (config.httpMethod || 'POST') as Method;
  const url = buildUrlWithParams(
    config.webhook as string,
    config.urlParams,
    context,
  );
  const headers = buildHeaders(config.headers);
  const cookieHeader = buildCookieHeader(config.cookies);

  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  // Build body (only for methods that support it)
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);
  const body = hasBody
    ? buildRequestBody(config.bodyParams, context)
    : undefined;

  const axiosConfig: AxiosRequestConfig = {
    method,
    url,
    headers,
    data: body,
  };

  try {
    const response = await axios(axiosConfig);

    logger.info(LogMessages.integrationSendSuccess(sourceName), {
      operation: logOpSuccess,
      formId,
      submissionId,
      correlationId,
      httpMethod: method,
      statusCode: response.status,
    });
  } catch (error: unknown) {
    const axiosError = error as {
      response?: { status?: number };
      message?: string;
    };
    const status = axiosError.response?.status;
    const message = axiosError.message || 'Unknown error';

    // Permanent errors - don't retry
    if (status === 404 || status === 401 || status === 403 || status === 400) {
      throw new PermanentError(`${sourceName} error ${status}: ${message}`);
    }

    logger.error(LogMessages.integrationSendFailed(sourceName), {
      operation: logOpSuccess,
      error: message,
      formId,
      submissionId,
      correlationId,
      httpMethod: method,
      statusCode: status,
    });

    throw error;
  }
}
