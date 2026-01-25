import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { Organization } from "./Organization"
import { Form } from "./Form"
import { IntegrationType } from "@formflow/shared/queue"

export enum IntegrationScope {
    ORGANIZATION = 'organization',
    FORM = 'form',
}

@Entity()
export class Integration {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    organizationId: number

    @Column({ nullable: true })
    formId: number | null

    @Column({
        type: "enum",
        enum: IntegrationScope,
        default: IntegrationScope.ORGANIZATION
    })
    scope: IntegrationScope

    @Column({
        type: "enum",
        enum: IntegrationType,
        default: IntegrationType.WEBHOOK
    })
    type: IntegrationType

    @Column()
    name: string

    @Column({ type: "jsonb", default: {} })
    config: any

    @Column({ default: true })
    isActive: boolean

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    @ManyToOne(() => Organization, organization => organization.integrations)
    @JoinColumn({ name: 'organizationId' })
    organization: Organization

    @ManyToOne(() => Form, form => form.integrations, { nullable: true })
    @JoinColumn({ name: 'formId' })
    form?: Form | null
}
