import { pgTable, serial, text, boolean, integer, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { forms } from './forms';

// Enums
export const integrationTypeEnum = pgEnum('integration_type_enum', [
    'webhook',
    'slack',
    'telegram',
    'email-smtp',
    'email-api',
    'discord',
]);

// Defines the scope of the integration
export const IntegrationScope = {
    ORGANIZATION: 'organization',
    FORM: 'form',
} as const;

export const integrationScopeEnum = pgEnum('integration_scope_enum', [
    IntegrationScope.ORGANIZATION,
    IntegrationScope.FORM,
]);

export const integrations = pgTable('integration', {
    id: serial('id').primaryKey(),
    organizationId: integer('organizationId').notNull(),
    formId: integer('formId'),
    scope: integrationScopeEnum('scope').default('organization').notNull(),
    type: integrationTypeEnum('type').default('webhook').notNull(),
    name: text('name').notNull(),
    config: jsonb('config').default({}).notNull(),
    isActive: boolean('isActive').default(true).notNull(),

    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const integrationsRelations = relations(integrations, ({ one }) => ({
    organization: one(organizations, {
        fields: [integrations.organizationId],
        references: [organizations.id],
    }),
    form: one(forms, {
        fields: [integrations.formId],
        references: [forms.id],
    }),
}));

export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;
export type IntegrationScope = (typeof IntegrationScope)[keyof typeof IntegrationScope];

