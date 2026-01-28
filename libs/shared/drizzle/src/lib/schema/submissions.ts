import { pgTable, serial, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { forms } from './forms';

export const submissions = pgTable('submission', {
    id: serial('id').primaryKey(),
    formId: integer('formId').notNull(),
    data: jsonb('data').notNull(),
    originDomain: text('originDomain'),
    ipAddress: text('ipAddress'),

    createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export const submissionsRelations = relations(submissions, ({ one }) => ({
    form: one(forms, {
        fields: [submissions.formId],
        references: [forms.id],
    }),
}));
