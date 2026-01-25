import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, OneToOne, JoinColumn } from "typeorm"
import { Organization } from "./Organization"
import { FormIntegration } from "./FormIntegration"
import { Submission } from "./Submission"
import { Integration } from "./Integration"

@Entity()
export class Form {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ nullable: true })
    organizationId: number | null

    @Column()
    name: string

    @Column({ unique: true })
    slug: string

    @Column({ nullable: true, default: null })
    description: string | null

    @Column({ unique: true })
    submitHash: string

    @Column({ default: true })
    isActive: boolean

    @Column({ default: true })
    useOrgIntegrations: boolean

    // Form Protection Settings
    @Column({ default: false })
    captchaEnabled: boolean

    @Column({ default: false })
    csrfEnabled: boolean

    // Security Settings
    @Column({ default: true })
    useOrgSecuritySettings: boolean

    // Rate limiting per IP
    @Column({ default: true })
    rateLimitEnabled: boolean

    @Column({ default: 10, nullable: true })
    rateLimitMaxRequests: number | null  // Max requests per window

    @Column({ default: 60, nullable: true })
    rateLimitWindowSeconds: number | null  // Time window in seconds

    @Column({ default: 50, nullable: true })
    rateLimitMaxRequestsPerHour: number | null  // Max requests per hour

    // Minimum time between submissions
    @Column({ default: true })
    minTimeBetweenSubmissionsEnabled: boolean

    @Column({ default: 10, nullable: true })
    minTimeBetweenSubmissionsSeconds: number | null

    // Request size limits
    @Column({ default: 100000, nullable: true })
    maxRequestSizeBytes: number | null  // Default 100KB

    // Referer fallback
    @Column({ default: true })
    refererFallbackEnabled: boolean

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    // Relationships
    @ManyToOne(() => Organization, organization => organization.forms)
    @JoinColumn({ name: 'organizationId' })
    organization: Organization

    @OneToOne(() => FormIntegration, integration => integration.form, { cascade: true })
    integration: FormIntegration

    @OneToMany(() => Submission, submission => submission.form)
    submissions: Submission[]

    @OneToMany(() => Integration, integration => integration.form)
    integrations: Integration[]
}
