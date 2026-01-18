import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { encrypt, decrypt } from "@formflow/shared/encryption"
import { Organization } from "./Organization"

// User role within an organization
export type UserRole = 'member' | 'org_admin';

@Entity()
export class User {

    //Basic user info start ___________________________________________________________________
    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: true })
    email: string;

    @Column()
    passwordHash: string;

    @Column({nullable: true})
    name: string | null

    @Column({nullable: true})
    apiKey: string | null

    // Organization relationship (nullable for Super Admins without org)
    @Column({ nullable: true, default: null })
    organizationId: number | null

    // Role within the organization
    @Column({ type: 'varchar', default: 'member' })
    role: UserRole

    // Super Admin flag - system-wide admin access
    @Column({ default: false })
    isSuperAdmin: boolean

    // Active status - can be suspended by super admins
    @Column({ default: true })
    isActive: boolean

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    // Relationship to Organization
    @ManyToOne(() => Organization, organization => organization.users, { nullable: true })
    @JoinColumn({ name: 'organizationId' })
    organization: Organization | null
    //Basic user info end _____________________________________________________________________

    //Return email settings start _____________________________________________________________
    @Column({nullable: true, default: false})
    returnBoolean: boolean | null;

    @Column({nullable: true, transformer: {
        to: (value: string | null) => encrypt(value),
        from: (value: string | null) => decrypt(value),
    }})
    fromEmailAccessToken: string | null;

    @Column({nullable: true, transformer: {
        to: (value: string | null) => encrypt(value),
        from: (value: string | null) => decrypt(value),
    }})
    fromEmail: string | null;

    @Column({nullable: true, transformer: {
        to: (value: string | null) => encrypt(value),
        from: (value: string | null) => decrypt(value),
    }})
    fromEmailRefreshToken: string | null;

    @Column({nullable: true})
    smtpHost: string | null;

    @Column({nullable: true})
    smtpPort: number | null;

    @Column({nullable: true})
    smtpUsername: string | null;

    @Column({nullable: true, transformer: {
        to: (value: string | null) => encrypt(value),
        from: (value: string | null) => decrypt(value),
    }})
    smtpPassword: string | null;

    @Column({nullable: true})
    emailSubject: string | null;

    @Column({nullable: true})
    emailBody: string | null;
    //Return email settings end _________________________________________________________________


    //Telegram settings start _________________________________________________________________
    @Column({nullable: false, default: false})
    telegramBoolean: boolean;

    @Column({nullable: true})
    telegramChatId: number | null;

    //Telegram settings end ____________________________________________________________________

    //Discord settings start _________________________________________________________________
    @Column({nullable: false, default: false})
    discordBoolean: boolean;

    @Column({nullable: true})
    discordWebhook: string | null;

    //Discord settings end ____________________________________________________________________

    //Slack settings start _________________________________________________________________

    @Column({nullable: false, default: false})
    slackBoolean: boolean;

    @Column({nullable: true})
    slackChannelId: string | null;

    @Column({nullable: true})
    slackAccessToken: string | null;

    @Column({nullable: true})
    slackChannelName: string | null;

    //Slack settings end ____________________________________________________________________

    //Make settings start ___________________________________________________________________

    @Column({nullable: true})
    makeWebhook: string | null;

    @Column({nullable: false, default: false})
    makeBoolean: boolean;
    //Make settings end ____________________________________________________________________

    //n8n settings start ___________________________________________________________________

    @Column({nullable: true})
    n8nWebhook: string | null;

    @Column({nullable: false, default: false})
    n8nBoolean: boolean;
    //n8n settings end ____________________________________________________________________

    // Misc Webhook settings start _____________________________________________________________

    @Column({nullable: true})
    webhookWebhook: string | null;

    @Column({nullable: false, default: false})
    webhookBoolean: boolean;
    // Misc Webhook settings end _________________________________________________________________

@Column('text', {
    nullable: true,
    default: '',
    transformer: {
        to: (value: string[]): string => {
            const uniqueValues = Array.from(new Set(value));
            return uniqueValues.join(',');
        },
        from: (value: string): string[] => {
            const uniqueValues = value ? Array.from(new Set(value.split(','))) : [];
            return uniqueValues;
        },
    }
    })
    allowedDomains: string[];


    @Column({nullable: true, default: null})
    maxPlugins: number | null;

    @Column({nullable: true, default: 0})
    currentPlugins: number;
}