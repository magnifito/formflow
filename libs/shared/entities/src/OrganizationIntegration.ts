import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from "typeorm"
import { Organization } from "./Organization"
import { encrypt, decrypt } from "@formflow/shared/encryption"

@Entity()
export class OrganizationIntegration {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    organizationId: number

    // Email settings
    @Column({ default: true })
    emailEnabled: boolean

    @Column({ nullable: true, default: null })
    emailRecipients: string | null

    // Return email settings
    @Column({ default: false })
    returnEmailEnabled: boolean

    @Column({ nullable: true })
    emailSubject: string | null

    @Column({ nullable: true })
    emailBody: string | null

    @Column({ nullable: true })
    smtpHost: string | null

    @Column({ nullable: true })
    smtpPort: number | null

    @Column({ nullable: true })
    smtpUsername: string | null

    @Column({ nullable: true, transformer: {
        to: (value: string | null) => encrypt(value),
        from: (value: string | null) => decrypt(value),
    }})
    smtpPassword: string | null

    @Column({ nullable: true, transformer: {
        to: (value: string | null) => encrypt(value),
        from: (value: string | null) => decrypt(value),
    }})
    fromEmail: string | null

    @Column({ nullable: true, transformer: {
        to: (value: string | null) => encrypt(value),
        from: (value: string | null) => decrypt(value),
    }})
    fromEmailAccessToken: string | null

    @Column({ nullable: true, transformer: {
        to: (value: string | null) => encrypt(value),
        from: (value: string | null) => decrypt(value),
    }})
    fromEmailRefreshToken: string | null

    // Telegram settings
    @Column({ default: false })
    telegramEnabled: boolean

    @Column({ nullable: true, default: null })
    telegramChatId: number | null

    // Discord settings
    @Column({ default: false })
    discordEnabled: boolean

    @Column({ nullable: true, default: null })
    discordWebhook: string | null

    // Make.com settings
    @Column({ default: false })
    makeEnabled: boolean

    @Column({ nullable: true, default: null })
    makeWebhook: string | null

    // n8n settings
    @Column({ default: false })
    n8nEnabled: boolean

    @Column({ nullable: true, default: null })
    n8nWebhook: string | null

    // Generic webhook settings
    @Column({ default: false })
    webhookEnabled: boolean

    @Column({ nullable: true, default: null })
    webhookUrl: string | null

    // Slack settings
    @Column({ default: false })
    slackEnabled: boolean

    @Column({ nullable: true, default: null })
    slackChannelId: string | null

    @Column({ nullable: true, default: null })
    slackAccessToken: string | null

    @Column({ nullable: true, default: null })
    slackChannelName: string | null

    // Relationships
    @OneToOne(() => Organization, organization => organization.integration)
    @JoinColumn({ name: 'organizationId' })
    organization: Organization
}
