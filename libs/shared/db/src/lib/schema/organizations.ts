import { pgTable, serial, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { forms } from './forms';
import { whitelistedDomains } from './whitelisted-domains';
import { integrations } from './integrations';

export const organizations = pgTable('organization', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').unique().notNull(),
    isActive: boolean('isActive').default(true).notNull(),
    maxSubmissionsPerMonth: integer('maxSubmissionsPerMonth'),

    // Default Security Settings
    defaultRateLimitEnabled: boolean('defaultRateLimitEnabled').default(true).notNull(),
    defaultRateLimitMaxRequests: integer('defaultRateLimitMaxRequests').default(10),
    defaultRateLimitWindowSeconds: integer('defaultRateLimitWindowSeconds').default(60),
    defaultRateLimitMaxRequestsPerHour: integer('defaultRateLimitMaxRequestsPerHour').default(50),

    defaultMinTimeBetweenSubmissionsEnabled: boolean('defaultMinTimeBetweenSubmissionsEnabled').default(true).notNull(),
    defaultMinTimeBetweenSubmissionsSeconds: integer('defaultMinTimeBetweenSubmissionsSeconds').default(10),

    defaultMaxRequestSizeBytes: integer('defaultMaxRequestSizeBytes').default(100000),
    defaultRefererFallbackEnabled: boolean('defaultRefererFallbackEnabled').default(true).notNull(),

    // Integration Bot Credentials (org-level)
    slackBotToken: text('slackBotToken'),
    telegramBotToken: text('telegramBotToken'),

    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
    users: many(users),
    forms: many(forms),
    whitelistedDomains: many(whitelistedDomains),
    integrations: many(integrations),
}));
