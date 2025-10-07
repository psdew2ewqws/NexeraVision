import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { Company } from '../../company-management/entities/company.entity';
import { PromotionCode } from './promotion-code.entity';
import { PromotionUsage } from './promotion-usage.entity';
import { PromotionTarget } from './promotion-target.entity';

export enum PromotionCampaignType {
  PERCENTAGE_DISCOUNT = 'percentage_discount',
  FIXED_DISCOUNT = 'fixed_discount',
  BUY_X_GET_Y = 'buy_x_get_y',
  FREE_SHIPPING = 'free_shipping',
  MINIMUM_ORDER = 'minimum_order',
  HAPPY_HOUR = 'happy_hour',
  PLATFORM_EXCLUSIVE = 'platform_exclusive'
}

export enum PromotionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SCHEDULED = 'scheduled',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  ARCHIVED = 'archived'
}

@Entity('promotion_campaigns')
@Index(['companyId', 'status', 'priority'])
@Index(['companyId', 'startsAt', 'endsAt'])
@Index(['status', 'startsAt', 'endsAt'])
export class PromotionCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ type: 'json', default: '{}' })
  name: Record<string, string>; // Multi-language names

  @Column({ type: 'json', default: '{}' })
  description: Record<string, string>; // Multi-language descriptions

  @Column({ unique: true })
  slug: string;

  @Column({
    type: 'enum',
    enum: PromotionCampaignType
  })
  type: PromotionCampaignType;

  @Column({
    type: 'enum',
    enum: PromotionStatus,
    default: PromotionStatus.DRAFT
  })
  status: PromotionStatus;

  @Column({ default: 999 })
  priority: number; // Lower number = higher priority

  @Column({ name: 'is_public', default: true })
  isPublic: boolean;

  @Column({ name: 'is_stackable', default: false })
  isStackable: boolean;

  // Time restrictions
  @Column({ name: 'starts_at', nullable: true })
  startsAt?: Date;

  @Column({ name: 'ends_at', nullable: true })
  endsAt?: Date;

  @Column({ name: 'days_of_week', type: 'int', array: true, default: '{}' })
  daysOfWeek: number[]; // [1,2,3,4,5] for Mon-Fri

  @Column({ name: 'time_ranges', type: 'json', default: '[]' })
  timeRanges: Array<{ start: string; end: string }>; // [{"start": "09:00", "end": "17:00"}]

  // Usage limits
  @Column({ name: 'total_usage_limit', nullable: true })
  totalUsageLimit?: number;

  @Column({ name: 'per_customer_limit', default: 1 })
  perCustomerLimit: number;

  @Column({ name: 'current_usage_count', default: 0 })
  currentUsageCount: number;

  // Discount configuration
  @Column({ name: 'discount_value', type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountValue?: number;

  @Column({ name: 'max_discount_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscountAmount?: number;

  @Column({ name: 'minimum_order_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimumOrderAmount?: number;

  @Column({ name: 'minimum_items_count', default: 1 })
  minimumItemsCount: number;

  // Buy X Get Y configuration
  @Column({ name: 'buy_quantity', nullable: true })
  buyQuantity?: number;

  @Column({ name: 'get_quantity', nullable: true })
  getQuantity?: number;

  @Column({ name: 'get_discount_percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  getDiscountPercentage?: number;

  // Platform and customer targeting
  @Column({ name: 'target_platforms', type: 'varchar', array: true, default: '{}' })
  targetPlatforms: string[]; // ['talabat', 'careem', 'website']

  @Column({ name: 'target_customer_segments', type: 'varchar', array: true, default: '{}' })
  targetCustomerSegments: string[]; // ['new', 'vip', 'regular']

  // Analytics
  @Column({ name: 'total_revenue_impact', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRevenueImpact: number;

  @Column({ name: 'total_orders_count', default: 0 })
  totalOrdersCount: number;

  @Column({ name: 'total_customers_reached', default: 0 })
  totalCustomersReached: number;

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
  @ManyToOne(() => Company, company => company.promotionCampaigns)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => PromotionCode, code => code.campaign)
  codes: PromotionCode[];

  @OneToMany(() => PromotionTarget, target => target.campaign)
  targets: PromotionTarget[];

  @OneToMany(() => PromotionUsage, usage => usage.campaign)
  usage: PromotionUsage[];

  // Business Methods
  isActive(): boolean {
    if (this.status !== PromotionStatus.ACTIVE) return false;
    
    const now = new Date();
    
    // Check date range
    if (this.startsAt && now < this.startsAt) return false;
    if (this.endsAt && now > this.endsAt) return false;
    
    return true;
  }

  isUsageLimitReached(): boolean {
    return this.totalUsageLimit !== null && 
           this.currentUsageCount >= this.totalUsageLimit;
  }

  canBeUsedByCustomer(customerUsageCount: number): boolean {
    return customerUsageCount < this.perCustomerLimit;
  }

  isValidForPlatform(platform: string): boolean {
    return this.targetPlatforms.length === 0 || 
           this.targetPlatforms.includes(platform);
  }

  isValidForTime(date: Date = new Date()): boolean {
    // Check day of week
    if (this.daysOfWeek.length > 0) {
      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Convert Sunday=0 to Sunday=7
      if (!this.daysOfWeek.includes(dayOfWeek)) {
        return false;
      }
    }

    // Check time ranges
    if (this.timeRanges.length > 0) {
      const currentTime = date.toTimeString().slice(0, 5); // HH:MM format
      const isInRange = this.timeRanges.some(range => 
        currentTime >= range.start && currentTime <= range.end
      );
      if (!isInRange) {
        return false;
      }
    }

    return true;
  }

  calculateDiscount(orderTotal: number, itemsCount: number = 1): {
    amount: number;
    percentage: number;
    type: string;
  } {
    let discountAmount = 0;
    let discountPercentage = 0;

    switch (this.type) {
      case PromotionCampaignType.PERCENTAGE_DISCOUNT:
        discountPercentage = this.discountValue || 0;
        discountAmount = (orderTotal * discountPercentage) / 100;
        if (this.maxDiscountAmount && discountAmount > this.maxDiscountAmount) {
          discountAmount = this.maxDiscountAmount;
        }
        break;

      case PromotionCampaignType.FIXED_DISCOUNT:
        discountAmount = Math.min(this.discountValue || 0, orderTotal);
        discountPercentage = (discountAmount / orderTotal) * 100;
        break;

      case PromotionCampaignType.BUY_X_GET_Y:
        const buyQty = this.buyQuantity || 1;
        const getQty = this.getQuantity || 1;
        const getDiscountPerc = this.getDiscountPercentage || 100;
        
        const eligibleSets = Math.floor(itemsCount / buyQty);
        const freeItems = eligibleSets * getQty;
        const avgItemPrice = orderTotal / itemsCount;
        
        discountAmount = freeItems * avgItemPrice * (getDiscountPerc / 100);
        discountPercentage = (discountAmount / orderTotal) * 100;
        break;

      case PromotionCampaignType.FREE_SHIPPING:
        // This would be calculated based on delivery fees
        discountAmount = 0; // Placeholder
        break;

      default:
        discountAmount = 0;
    }

    return {
      amount: Math.round(discountAmount * 100) / 100,
      percentage: Math.round(discountPercentage * 100) / 100,
      type: this.type
    };
  }

  incrementUsage(): void {
    this.currentUsageCount += 1;
  }

  updateAnalytics(orderTotal: number): void {
    this.totalOrdersCount += 1;
    this.totalRevenueImpact += orderTotal;
  }

  activate(activatedBy: string): void {
    this.status = PromotionStatus.ACTIVE;
    this.updatedBy = activatedBy;
  }

  pause(pausedBy: string): void {
    this.status = PromotionStatus.PAUSED;
    this.updatedBy = pausedBy;
  }

  expire(): void {
    this.status = PromotionStatus.EXPIRED;
  }
}