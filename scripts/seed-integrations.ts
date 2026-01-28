#!/usr/bin/env tsx

/**
 * Seed a minimal dataset:
 * - Organization: Acme Org
 * - Form: Contact Form (inherits org integrations)
 * - Integration: Org-scoped Email SMTP pointing to MailPit
 *
 * Run (from repo root):
 * pnpm seed:integrations
 */

import "reflect-metadata";
import { loadEnv } from "@formflow/shared/env";
import { createDbClient, organizations, forms, integrations, IntegrationScope, generateSubmitHash } from "@formflow/shared/db";
import { IntegrationType } from "@formflow/shared/queue";
import { eq, and } from "drizzle-orm";

loadEnv();

async function main() {
    const connectionString = process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

    if (!connectionString || connectionString.includes('undefined')) {
        console.error('DATABASE_URL or DB credentials not found in environment');
        process.exit(1);
    }

    const db = createDbClient(connectionString);

    // 1) Organization
    let org = await db.query.organizations.findFirst({
        where: eq(organizations.slug, 'acme-org')
    });

    if (!org) {
        const [newOrg] = await db.insert(organizations).values({
            name: 'Acme Org',
            slug: 'acme-org',
            isActive: true,
        }).returning();
        org = newOrg;
        console.log('Created organization: Acme Org');
    } else {
        console.log('Organization exists: Acme Org');
    }

    // 2) Forms
    const formsToEnsure = [
        { name: 'Contact Form', slug: 'contact-form', useOrgIntegrations: true },
        { name: 'Telegram Feedback', slug: 'telegram-feedback', useOrgIntegrations: false },
        { name: 'Webhook Demo', slug: 'webhook-demo', useOrgIntegrations: false },
    ];

    const savedForms: Record<string, typeof forms.$inferSelect> = {};
    for (const def of formsToEnsure) {
        let form = await db.query.forms.findFirst({
            where: and(eq(forms.slug, def.slug), eq(forms.organizationId, org.id))
        });

        if (!form) {
            const [newForm] = await db.insert(forms).values({
                organizationId: org.id,
                name: def.name,
                slug: def.slug,
                submitHash: generateSubmitHash(),
                useOrgIntegrations: def.useOrgIntegrations,
                isActive: true,
            }).returning();
            form = newForm;
            console.log(`Created form: ${def.name}`);
        } else {
            console.log(`Form exists: ${def.name}`);
        }
        savedForms[def.slug] = form;
    }

    // 3) Org MailPit SMTP integration
    const existingIntegration = await db.query.integrations.findFirst({
        where: and(
            eq(integrations.organizationId, org.id),
            eq(integrations.scope, IntegrationScope.ORGANIZATION),
            eq(integrations.type, IntegrationType.EMAIL_SMTP),
            eq(integrations.name, 'MailPit SMTP')
        )
    });

    const mailpitConfig = {
        recipients: ['team@acme.test'],
        fromEmail: 'no-reply@acme.test',
        subject: 'New Contact Form Submission',
        smtp: {
            host: process.env.MAILPIT_HOST || '127.0.0.1',
            port: Number(process.env.MAILPIT_PORT || 1026),
            username: process.env.MAILPIT_USER || 'mailpit',
            password: process.env.MAILPIT_PASS || 'mailpit',
            secure: false,
        },
    };

    if (existingIntegration) {
        console.log('Updating existing integration: MailPit SMTP');
        await db.update(integrations)
            .set({ config: mailpitConfig })
            .where(eq(integrations.id, existingIntegration.id));
    } else {
        await db.insert(integrations).values({
            organizationId: org.id,
            formId: null,
            scope: IntegrationScope.ORGANIZATION,
            type: IntegrationType.EMAIL_SMTP,
            name: 'MailPit SMTP',
            isActive: true,
            config: mailpitConfig,
        });
        console.log('Created integration: MailPit SMTP');
    }

    // 4) Telegram form-scoped integration
    const telegramForm = savedForms['telegram-feedback'];
    if (telegramForm) {
        const existingTelegram = await db.query.integrations.findFirst({
            where: and(
                eq(integrations.organizationId, org.id),
                eq(integrations.formId, telegramForm.id),
                eq(integrations.scope, IntegrationScope.FORM),
                eq(integrations.type, IntegrationType.TELEGRAM)
            )
        });

        const telegramConfig = {
            chatId: process.env.TELEGRAM_CHAT_ID || '-1003716477840',
        };

        if (existingTelegram) {
            console.log('Updating existing integration: Telegram Alerts');
            await db.update(integrations)
                .set({ config: telegramConfig })
                .where(eq(integrations.id, existingTelegram.id));
        } else {
            await db.insert(integrations).values({
                organizationId: org.id,
                formId: telegramForm.id,
                scope: IntegrationScope.FORM,
                type: IntegrationType.TELEGRAM,
                name: 'Telegram Alerts',
                isActive: true,
                config: telegramConfig,
            });
            console.log('Created integration: Telegram Alerts (form override)');
        }
    }

    // 5) Webhook form-scoped integration
    const webhookForm = savedForms['webhook-demo'];
    if (webhookForm) {
        const existingWebhook = await db.query.integrations.findFirst({
            where: and(
                eq(integrations.organizationId, org.id),
                eq(integrations.formId, webhookForm.id),
                eq(integrations.scope, IntegrationScope.FORM),
                eq(integrations.type, IntegrationType.WEBHOOK)
            )
        });

        if (!existingWebhook) {
            await db.insert(integrations).values({
                organizationId: org.id,
                formId: webhookForm.id,
                scope: IntegrationScope.FORM,
                type: IntegrationType.WEBHOOK,
                name: 'Local Webhook',
                isActive: true,
                config: {
                    webhook: 'http://localhost:4200/webhook',
                    webhookSource: 'generic',
                },
            });
            console.log('Created integration: Local Webhook (form override)');
        } else {
            console.log('Integration exists: Local Webhook');
        }
    }

    console.log('\nDone.');
    process.exit(0);
}

main().catch(async (err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
