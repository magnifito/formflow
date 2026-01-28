import { pgTable, serial, text, boolean, integer, timestamp, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';

export const users = pgTable('user', {
    id: serial('id').primaryKey(),
    email: text('email').unique().notNull(),
    passwordHash: text('passwordHash').notNull(),
    name: text('name'),
    organizationId: integer('organizationId'),
    role: varchar('role', { length: 255 }).default('member').notNull(), // 'member' | 'org_admin'
    isSuperAdmin: boolean('isSuperAdmin').default(false).notNull(),
    isActive: boolean('isActive').default(true).notNull(),

    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
    organization: one(organizations, {
        fields: [users.organizationId],
        references: [organizations.id],
    }),
}));
