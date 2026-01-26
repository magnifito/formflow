#!/usr/bin/env ts-node

/**
 * Seed a minimal dataset:
 * - Organization: Acme Org
 * - Form: Contact Form (inherits org integrations)
 * - Integration: Org-scoped Email SMTP pointing to MailPit
 *
 * Run (from repo root):
 * pnpm exec ts-node --project scripts/tsconfig.json scripts/seed-mailpit-acme.ts
 */

import "reflect-metadata";
import { loadEnv } from "@formflow/shared/env";
import { AppDataSource } from "@formflow/shared/data-source";
import { Organization, Form, Integration, IntegrationScope } from "@formflow/shared/entities";
import { IntegrationType } from "@formflow/shared/queue";
import crypto from "crypto";
import { generateSubmitHash } from "@formflow/shared/entities";

loadEnv();

async function main() {
    await AppDataSource.initialize();

    const orgRepo = AppDataSource.getRepository(Organization);
    const formRepo = AppDataSource.getRepository(Form);
    const integrationRepo = AppDataSource.getRepository(Integration);

    // 1) Organization
    let org = await orgRepo.findOne({ where: { slug: 'acme-org' } });
    if (!org) {
        org = orgRepo.create({
            name: 'Acme Org',
            slug: 'acme-org',
            isActive: true,
        });
        org = await orgRepo.save(org);
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

    const savedForms: Record<string, Form> = {};
    for (const def of formsToEnsure) {
        let form = await formRepo.findOne({ where: { slug: def.slug, organizationId: org.id } });
        if (!form) {
            form = formRepo.create({
                organizationId: org.id,
                name: def.name,
                slug: def.slug,
                submitHash: generateSubmitHash(),
                useOrgIntegrations: def.useOrgIntegrations,
                isActive: true,
            });
            form = await formRepo.save(form);
            console.log(`Created form: ${def.name}`);
        } else {
            console.log(`Form exists: ${def.name}`);
        }
        savedForms[def.slug] = form;
    }

    // 3) Org MailPit SMTP integration
    const existingIntegration = await integrationRepo.findOne({
        where: {
            organizationId: org.id,
            scope: IntegrationScope.ORGANIZATION,
            type: IntegrationType.EMAIL_SMTP,
            name: 'MailPit SMTP',
        }
    });

    if (existingIntegration) {
        console.log('Updating existing integration: MailPit SMTP');
        existingIntegration.config = {
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
        await integrationRepo.save(existingIntegration);
    } else {
        const mailpitIntegration = integrationRepo.create({
            organizationId: org.id,
            formId: null,
            scope: IntegrationScope.ORGANIZATION,
            type: IntegrationType.EMAIL_SMTP,
            name: 'MailPit SMTP',
            isActive: true,
            config: {
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
            },
        });
        await integrationRepo.save(mailpitIntegration);
        console.log('Created integration: MailPit SMTP');
    }

    // 4) Telegram form-scoped integration
    const telegramForm = savedForms['telegram-feedback'];
    if (telegramForm) {
        const existingTelegram = await integrationRepo.findOne({
            where: {
                organizationId: org.id,
                formId: telegramForm.id,
                scope: IntegrationScope.FORM,
                type: IntegrationType.TELEGRAM,
            }
        });
        if (existingTelegram) {
            console.log('Updating existing integration: Telegram Alerts');
            existingTelegram.config = {
                chatId: process.env.TELEGRAM_CHAT_ID || '-1003716477840',
            };
            await integrationRepo.save(existingTelegram);
        } else {
            const telegramIntegration = integrationRepo.create({
                organizationId: org.id,
                formId: telegramForm.id,
                scope: IntegrationScope.FORM,
                type: IntegrationType.TELEGRAM,
                name: 'Telegram Alerts',
                isActive: true,
                config: {
                    chatId: process.env.TELEGRAM_CHAT_ID || '-1003716477840',
                },
            });
            await integrationRepo.save(telegramIntegration);
            console.log('Created integration: Telegram Alerts (form override)');
        }
    }

    // 5) Webhook form-scoped integration
    const webhookForm = savedForms['webhook-demo'];
    if (webhookForm) {
        const existingWebhook = await integrationRepo.findOne({
            where: {
                organizationId: org.id,
                formId: webhookForm.id,
                scope: IntegrationScope.FORM,
                type: IntegrationType.WEBHOOK,
            }
        });
        if (!existingWebhook) {
            const webhookIntegration = integrationRepo.create({
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
            await integrationRepo.save(webhookIntegration);
            console.log('Created integration: Local Webhook (form override)');
        } else {
            console.log('Integration exists: Local Webhook');
        }
    }

    console.log('\nDone.');
    await AppDataSource.destroy();
}

main().catch(async (err) => {
    console.error('Seeding failed:', err);
    if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
    }
    process.exit(1);
});
