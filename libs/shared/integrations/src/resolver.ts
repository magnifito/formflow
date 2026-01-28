import { Integration, IntegrationScope } from "@formflow/shared/db";
import { IntegrationType } from "@formflow/shared/queue";

export type IntegrationLike = Pick<Integration, 'id' | 'organizationId' | 'formId' | 'scope' | 'type' | 'name' | 'config' | 'isActive'>;

const toRecipientsArray = (value: unknown): string[] => {
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
    const normalizedConfig = { ...((integration.config as object) || {}) } as Record<string, any>;

    if (([IntegrationType.EMAIL_SMTP, IntegrationType.EMAIL_API] as string[]).includes(integration.type)) {
        normalizedConfig['recipients'] = toRecipientsArray(normalizedConfig['recipients']);
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
