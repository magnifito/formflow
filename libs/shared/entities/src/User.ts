import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm"
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

    @Column({ nullable: true })
    name: string | null

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
}