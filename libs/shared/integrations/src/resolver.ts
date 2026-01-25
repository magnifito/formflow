import { Integration, IntegrationScope, FormIntegration } from "@formflow/shared/entities";
import { IntegrationType } from "@formflow/shared/queue";

export type IntegrationLike = Pick<Integration, 'id' | 'organizationId' | 'formId' | 'scope' | 'type' | 'name' | 'config' | 'isActive'>;

const toRecipientsArray = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value.map(v => String(v).trim()).filter(Boolean);
    }
    return String(value)
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
};

export const normalizeIntegrationConfig = (integration: IntegrationLike): IntegrationLike => {
    const normalizedConfig = { ...(integration.config || {}) };

    if ([IntegrationType.EMAIL_SMTP, IntegrationType.EMAIL_API].includes(integration.type)) {
        normalizedConfig.recipients = toRecipientsArray(normalizedConfig.recipients);
    }

    return {
        ...integration,
        config: normalizedConfig,
    };
};

export const resolveIntegrationStack = (params: {
    orgIntegrations?: IntegrationLike[];
    formIntegrations?: IntegrationLike[];
    useOrgIntegrations?: boolean;
}): IntegrationLike[] => {
    const { orgIntegrations = [], formIntegrations = [], useOrgIntegrations = true } = params;

    const activeOrg = orgIntegrations.filter(i => i.isActive !== false);
    const activeForm = formIntegrations.filter(i => i.isActive !== false);

    if (!useOrgIntegrations) {
        return activeForm.map(normalizeIntegrationConfig);
    }

    const formTypes = new Set(activeForm.map(i => i.type));
    const orgScoped = activeOrg.filter(i => !formTypes.has(i.type));

    return [...orgScoped, ...activeForm].map(normalizeIntegrationConfig);
};

export const normalizeLegacyFormIntegration = (
    formIntegration?: FormIntegration | null,
    organizationId?: number,
    formId?: number | null
): IntegrationLike[] => {
    if (!formIntegration) return [];

    const scopedIntegrations: IntegrationLike[] = [];

    if (formIntegration.emailEnabled && formIntegration.emailRecipients) {
        scopedIntegrations.push({
            id: undefined,
            organizationId: organizationId ?? 0,
            formId: formId ?? formIntegration.formId,
            scope: IntegrationScope.FORM,
            type: IntegrationType.EMAIL_SMTP,
            name: 'Form Email',
            isActive: true,
            config: {
                recipients: toRecipientsArray(formIntegration.emailRecipients),
                subject: formIntegration.emailSubject || undefined,
                fromEmail: formIntegration.fromEmail || undefined,
                smtp: formIntegration.smtpHost && formIntegration.smtpPort && formIntegration.smtpUsername && formIntegration.smtpPassword ? {
                    host: formIntegration.smtpHost,
                    port: Number(formIntegration.smtpPort),
                    username: formIntegration.smtpUsername,
                    password: formIntegration.smtpPassword,
                    secure: true,
                } : undefined,
                oauth: formIntegration.fromEmailAccessToken || formIntegration.fromEmailRefreshToken ? {
                    clientId: null,
                    clientSecret: null,
                    accessToken: formIntegration.fromEmailAccessToken,
                    refreshToken: formIntegration.fromEmailRefreshToken,
                    user: formIntegration.fromEmail || formIntegration.smtpUsername || undefined,
                } : undefined,
            }
        });
    }

    if (formIntegration.telegramEnabled && formIntegration.telegramChatId) {
        scopedIntegrations.push({
            id: undefined,
            organizationId: organizationId ?? 0,
            formId: formId ?? formIntegration.formId,
            scope: IntegrationScope.FORM,
            type: IntegrationType.TELEGRAM,
            name: 'Form Telegram',
            isActive: true,
            config: { chatId: formIntegration.telegramChatId }
        });
    }

    if (formIntegration.discordEnabled && formIntegration.discordWebhook) {
        scopedIntegrations.push({
            id: undefined,
            organizationId: organizationId ?? 0,
            formId: formId ?? formIntegration.formId,
            scope: IntegrationScope.FORM,
            type: IntegrationType.DISCORD,
            name: 'Form Discord',
            isActive: true,
            config: { webhookUrl: formIntegration.discordWebhook }
        });
    }

    if (formIntegration.slackEnabled && (formIntegration.slackAccessToken || formIntegration.slackChannelId)) {
        scopedIntegrations.push({
            id: undefined,
            organizationId: organizationId ?? 0,
            formId: formId ?? formIntegration.formId,
            scope: IntegrationScope.FORM,
            type: IntegrationType.SLACK,
            name: 'Form Slack',
            isActive: true,
            config: {
                accessToken: formIntegration.slackAccessToken,
                channelId: formIntegration.slackChannelId,
                channelName: formIntegration.slackChannelName,
            }
        });
    }

    if (formIntegration.webhookEnabled && formIntegration.webhookUrl) {
        scopedIntegrations.push({
            id: undefined,
            organizationId: organizationId ?? 0,
            formId: formId ?? formIntegration.formId,
            scope: IntegrationScope.FORM,
            type: IntegrationType.WEBHOOK,
            name: 'Form Webhook',
            isActive: true,
            config: { webhook: formIntegration.webhookUrl, webhookSource: 'generic' }
        });
    }

    if (formIntegration.makeEnabled && formIntegration.makeWebhook) {
        scopedIntegrations.push({
            id: undefined,
            organizationId: organizationId ?? 0,
            formId: formId ?? formIntegration.formId,
            scope: IntegrationScope.FORM,
            type: IntegrationType.WEBHOOK,
            name: 'Form Make',
            isActive: true,
            config: { webhook: formIntegration.makeWebhook, webhookSource: 'make' }
        });
    }

    if (formIntegration.n8nEnabled && formIntegration.n8nWebhook) {
        scopedIntegrations.push({
            id: undefined,
            organizationId: organizationId ?? 0,
            formId: formId ?? formIntegration.formId,
            scope: IntegrationScope.FORM,
            type: IntegrationType.WEBHOOK,
            name: 'Form n8n',
            isActive: true,
            config: { webhook: formIntegration.n8nWebhook, webhookSource: 'n8n' }
        });
    }

    return scopedIntegrations.map(normalizeIntegrationConfig);
};
