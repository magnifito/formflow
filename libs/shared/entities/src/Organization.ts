import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from "typeorm"
import { User } from "./User"
import { Form } from "./Form"
import { WhitelistedDomain } from "./WhitelistedDomain"
import { OrganizationIntegration } from "./OrganizationIntegration"
import { Integration } from "./Integration"

@Entity()
export class Organization {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column({ unique: true })
    slug: string

    @Column({ default: true })
    isActive: boolean

    @Column({ nullable: true, default: null })
    maxSubmissionsPerMonth: number | null

    // Default Security Settings (used when form.useOrgSecuritySettings = true)
    @Column({ default: true })
    defaultRateLimitEnabled: boolean

    @Column({ default: 10, nullable: true })
    defaultRateLimitMaxRequests: number | null

    @Column({ default: 60, nullable: true })
    defaultRateLimitWindowSeconds: number | null

    @Column({ default: 50, nullable: true })
    defaultRateLimitMaxRequestsPerHour: number | null

    @Column({ default: true })
    defaultMinTimeBetweenSubmissionsEnabled: boolean

    @Column({ default: 10, nullable: true })
    defaultMinTimeBetweenSubmissionsSeconds: number | null

    @Column({ default: 100000, nullable: true })
    defaultMaxRequestSizeBytes: number | null

    @Column({ default: true })
    defaultRefererFallbackEnabled: boolean

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    // Relationships
    @OneToMany(() => User, user => user.organization)
    users: User[]

    @OneToMany(() => Form, form => form.organization)
    forms: Form[]

    @OneToMany(() => WhitelistedDomain, domain => domain.organization)
    whitelistedDomains: WhitelistedDomain[]

    @OneToMany(() => Integration, integration => integration.organization)
    integrations: Integration[]

    // Deprecated: use integrations
    @OneToOne(() => OrganizationIntegration, integration => integration.organization)
    integration: OrganizationIntegration
}
