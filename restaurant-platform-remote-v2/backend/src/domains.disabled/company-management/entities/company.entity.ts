import { 
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index
} from 'typeorm';
import { Branch } from '../../branch-management/entities/branch.entity';
import { User } from '../../user-management/entities/user.entity';
import { License } from './license.entity';

export enum CompanyStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive'
}

@Entity('companies')
@Index(['status'])
@Index(['businessType', 'status'])
@Index(['subscriptionExpiresAt'])
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  logo?: string;

  @Column({ name: 'business_type', default: 'restaurant' })
  businessType: string;

  @Column({ default: 'Asia/Amman' })
  timezone: string;

  @Column({ name: 'default_currency', default: 'JOD' })
  defaultCurrency: string;

  @Column({
    type: 'enum',
    enum: CompanyStatus,
    default: CompanyStatus.TRIAL
  })
  status: CompanyStatus;

  @Column({ name: 'subscription_plan', default: 'basic' })
  subscriptionPlan: string;

  @Column({ name: 'subscription_expires_at', nullable: true })
  subscriptionExpiresAt?: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  // Relations
  @OneToMany(() => Branch, branch => branch.company)
  branches: Branch[];

  @OneToMany(() => User, user => user.company)
  users: User[];

  @OneToMany(() => License, license => license.company)
  licenses: License[];

  // Business Methods
  isActive(): boolean {
    return this.status === CompanyStatus.ACTIVE;
  }

  isTrialExpired(): boolean {
    if (!this.subscriptionExpiresAt) return false;
    return new Date() > this.subscriptionExpiresAt;
  }

  canCreateBranch(): boolean {
    return this.isActive() && !this.isTrialExpired();
  }

  getDaysUntilExpiry(): number {
    if (!this.subscriptionExpiresAt) return Infinity;
    const diffTime = this.subscriptionExpiresAt.getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  updateStatus(newStatus: CompanyStatus, updatedBy: string): void {
    this.status = newStatus;
    this.updatedBy = updatedBy;
    this.updatedAt = new Date();
  }

  extendSubscription(days: number): void {
    const currentExpiry = this.subscriptionExpiresAt || new Date();
    this.subscriptionExpiresAt = new Date(currentExpiry.getTime() + (days * 24 * 60 * 60 * 1000));
  }
}