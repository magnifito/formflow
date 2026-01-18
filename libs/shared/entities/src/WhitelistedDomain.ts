import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { Organization } from "./Organization"

@Entity()
export class WhitelistedDomain {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    organizationId: number

    @Column()
    domain: string

    @CreateDateColumn()
    createdAt: Date

    // Relationships
    @ManyToOne(() => Organization, organization => organization.whitelistedDomains)
    @JoinColumn({ name: 'organizationId' })
    organization: Organization
}
