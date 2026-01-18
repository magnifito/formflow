import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { Form } from "./Form"

@Entity()
export class Submission {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    formId: number

    @Column('jsonb')
    data: Record<string, any>

    @Column({ nullable: true, default: null })
    originDomain: string | null

    @Column({ nullable: true, default: null })
    ipAddress: string | null

    @CreateDateColumn()
    createdAt: Date

    // Relationships
    @ManyToOne(() => Form, form => form.submissions)
    @JoinColumn({ name: 'formId' })
    form: Form
}
