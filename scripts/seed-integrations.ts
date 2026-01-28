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
            name: 'Acme Corp',
            slug: 'acme-org',
            isActive: true,
            // Set org-level bot tokens if provided
            slackBotToken: process.env.SLACK_BOT_TOKEN || null,
            telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || null,
        }).returning();
        org = newOrg;
        console.log('Created organization: Acme Corp');
    } else {
        // Update org-level bot tokens if provided
        const updates: any = {};
        if (process.env.SLACK_BOT_TOKEN) updates.slackBotToken = process.env.SLACK_BOT_TOKEN;
        if (process.env.TELEGRAM_BOT_TOKEN) updates.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

        if (Object.keys(updates).length > 0) {
            await db.update(organizations).set(updates).where(eq(organizations.id, org.id));
            console.log('Updated organization bot tokens');
        }
        console.log('Organization exists: Acme Corp');
    }

    // 2) Forms
    const formsToEnsure = [
        { name: 'Website Contact', slug: 'website-contact', useOrgIntegrations: true },
        { name: 'Bug Reports', slug: 'bug-reports', useOrgIntegrations: false },
        { name: 'Customer Feedback', slug: 'customer-feedback', useOrgIntegrations: false },
        { name: 'Newsletter Signup', slug: 'newsletter-signup', useOrgIntegrations: false },
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

    // 3) Org Email SMTP integration
    const existingIntegration = await db.query.integrations.findFirst({
        where: and(
            eq(integrations.organizationId, org.id),
            eq(integrations.scope, IntegrationScope.ORGANIZATION),
            eq(integrations.type, IntegrationType.EMAIL_SMTP)
        )
    });

    const mailpitConfig = {
        recipients: ['team@acme.test'],
        fromEmail: 'no-reply@acme.test',
        subject: 'New Website Contact Submission',
        smtp: {
            host: process.env.SYSTEM_MAIL_HOST || '127.0.0.1',
            port: Number(process.env.MAILPIT_PORT || 1026),
            username: process.env.MAILPIT_USER || 'mailpit',
            password: process.env.MAILPIT_PASS || 'mailpit',
            secure: false,
        },
    };

    if (existingIntegration) {
        console.log('Updating existing integration: Contact Notifications → Email');
        await db.update(integrations)
            .set({ config: mailpitConfig })
            .where(eq(integrations.id, existingIntegration.id));
    } else {
        await db.insert(integrations).values({
            organizationId: org.id,
            formId: null,
            scope: IntegrationScope.ORGANIZATION,
            type: IntegrationType.EMAIL_SMTP,
            name: 'Contact Notifications → Email',
            isActive: true,
            config: mailpitConfig,
        });
        console.log('Created integration: Contact Notifications → Email');
    }

    // 4) Telegram form-scoped integration (bot token comes from org)
    const bugReportsForm = savedForms['bug-reports'];
    if (bugReportsForm && process.env.TELEGRAM_CHAT_ID) {
        const existingTelegram = await db.query.integrations.findFirst({
            where: and(
                eq(integrations.organizationId, org.id),
                eq(integrations.formId, bugReportsForm.id),
                eq(integrations.scope, IntegrationScope.FORM),
                eq(integrations.type, IntegrationType.TELEGRAM)
            )
        });

        // Only store chatId - botToken comes from organization settings
        const telegramConfig = {
            chatId: process.env.TELEGRAM_CHAT_ID,
        };

        if (existingTelegram) {
            console.log('Updating existing integration: Bug Reports → Telegram');
            await db.update(integrations)
                .set({ config: telegramConfig })
                .where(eq(integrations.id, existingTelegram.id));
        } else {
            await db.insert(integrations).values({
                organizationId: org.id,
                formId: bugReportsForm.id,
                scope: IntegrationScope.FORM,
                type: IntegrationType.TELEGRAM,
                name: 'Bug Reports → Telegram',
                isActive: true,
                config: telegramConfig,
            });
            console.log('Created integration: Bug Reports → Telegram');
        }
    } else if (bugReportsForm) {
        console.log('Skipping Telegram integration (TELEGRAM_CHAT_ID not set)');
    }

    // 5) Slack form-scoped integration (bot token comes from org)
    const feedbackForm = savedForms['customer-feedback'];
    if (feedbackForm && process.env.SLACK_CHANNEL_ID) {
        const existingSlack = await db.query.integrations.findFirst({
            where: and(
                eq(integrations.organizationId, org.id),
                eq(integrations.formId, feedbackForm.id),
                eq(integrations.scope, IntegrationScope.FORM),
                eq(integrations.type, IntegrationType.SLACK)
            )
        });

        // Only store channelId - accessToken comes from organization settings
        const slackConfig = {
            channelId: process.env.SLACK_CHANNEL_ID,
        };

        if (existingSlack) {
            console.log('Updating existing integration: Customer Feedback → Slack');
            await db.update(integrations)
                .set({ config: slackConfig })
                .where(eq(integrations.id, existingSlack.id));
        } else {
            await db.insert(integrations).values({
                organizationId: org.id,
                formId: feedbackForm.id,
                scope: IntegrationScope.FORM,
                type: IntegrationType.SLACK,
                name: 'Customer Feedback → Slack',
                isActive: true,
                config: slackConfig,
            });
            console.log('Created integration: Customer Feedback → Slack');
        }
    } else if (feedbackForm) {
        console.log('Skipping Slack integration (SLACK_CHANNEL_ID not set)');
    }

    // 6) Webhook form-scoped integration
    const newsletterForm = savedForms['newsletter-signup'];
    if (newsletterForm) {
        const existingWebhook = await db.query.integrations.findFirst({
            where: and(
                eq(integrations.organizationId, org.id),
                eq(integrations.formId, newsletterForm.id),
                eq(integrations.scope, IntegrationScope.FORM),
                eq(integrations.type, IntegrationType.WEBHOOK)
            )
        });

        if (!existingWebhook) {
            await db.insert(integrations).values({
                organizationId: org.id,
                formId: newsletterForm.id,
                scope: IntegrationScope.FORM,
                type: IntegrationType.WEBHOOK,
                name: 'Newsletter → CRM Webhook',
                isActive: true,
                config: {
                    webhook: 'http://localhost:4200/webhook',
                    webhookSource: 'generic',
                },
            });
            console.log('Created integration: Newsletter → CRM Webhook');
        } else {
            console.log('Integration exists: Newsletter → CRM Webhook');
        }
    }

    console.log('\nDone.');
    process.exit(0);
}

main().catch(async (err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
