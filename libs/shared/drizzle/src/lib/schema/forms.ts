import { pgTable, serial, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { submissions } from './submissions';
import { integrations } from './integrations';

export const forms = pgTable('form', {
    id: serial('id').primaryKey(),
    organizationId: integer('organizationId'),
    name: text('name').notNull(),
    slug: text('slug').unique().notNull(),
    description: text('description'),
    submitHash: text('submitHash').unique().notNull(),
    isActive: boolean('isActive').default(true).notNull(),
    useOrgIntegrations: boolean('useOrgIntegrations').default(true).notNull(),

    // Protection
    captchaEnabled: boolean('captchaEnabled').default(false).notNull(),
    csrfEnabled: boolean('csrfEnabled').default(false).notNull(),

    // Security
    useOrgSecuritySettings: boolean('useOrgSecuritySettings').default(true).notNull(),

    // Rate Limiting
    rateLimitEnabled: boolean('rateLimitEnabled').default(true).notNull(),
    rateLimitMaxRequests: integer('rateLimitMaxRequests').default(10),
    rateLimitWindowSeconds: integer('rateLimitWindowSeconds').default(60),
    rateLimitMaxRequestsPerHour: integer('rateLimitMaxRequestsPerHour').default(50),

    // Min Time
    minTimeBetweenSubmissionsEnabled: boolean('minTimeBetweenSubmissionsEnabled').default(true).notNull(),
    minTimeBetweenSubmissionsSeconds: integer('minTimeBetweenSubmissionsSeconds').default(10),

    // Request Size
    maxRequestSizeBytes: integer('maxRequestSizeBytes').default(100000),

    // Referer
    refererFallbackEnabled: boolean('refererFallbackEnabled').default(true).notNull(),

    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const formsRelations = relations(forms, ({ one, many }) => ({
    organization: one(organizations, {
        fields: [forms.organizationId],
        references: [organizations.id],
    }),
    submissions: many(submissions),
    integrations: many(integrations),
}));
