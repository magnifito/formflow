import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';

export const whitelistedDomains = pgTable('whitelisted_domain', {
    id: serial('id').primaryKey(),
    organizationId: integer('organizationId').notNull(),
    domain: text('domain').notNull(),

    createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export const whitelistedDomainsRelations = relations(whitelistedDomains, ({ one }) => ({
    organization: one(organizations, {
        fields: [whitelistedDomains.organizationId],
        references: [organizations.id],
    }),
}));
