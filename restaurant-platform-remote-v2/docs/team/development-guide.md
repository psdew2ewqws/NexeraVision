# Restaurant Platform Development Guide

## 🎯 Team Development Guidelines

This guide outlines the development standards, practices, and workflows for the Restaurant Platform Enterprise team.

## 🏗️ Project Architecture Overview

### Domain-Driven Design (DDD)
The project follows DDD principles with clear bounded contexts:

```
backend/src/domains/
├── company-management/     # Multi-tenant management
├── user-management/        # Authentication & authorization
├── menu-management/        # Product catalog
├── promotion-system/       # Marketing campaigns
├── delivery-integration/   # Provider integrations
├── order-management/       # Order lifecycle
├── payment-processing/     # Payment handling
├── analytics-reporting/    # Business intelligence
├── print-management/       # Printer integrations
└── availability-management/# Inventory control
```

### Frontend Feature Structure
```
frontend/src/features/
├── auth/                  # Authentication flows
├── dashboard/             # Main dashboard
├── companies/             # Company management
├── menu/                  # Menu management
├── promotions/            # Campaign management
├── orders/                # Order processing
├── delivery/              # Delivery management
├── analytics/             # Reports & analytics
└── settings/              # Configuration
```

## 🔧 Development Environment Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker (optional but recommended)

### Initial Setup
```bash
# Clone the repository
git clone <repository-url> restaurant-platform-v2
cd restaurant-platform-v2

# Install dependencies
npm run install:all

# Setup environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Setup database
npm run db:setup
npm run db:migrate
npm run db:seed

# Start development servers
npm run dev
```

### Environment Configuration

**Backend (.env)**
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/restaurant_platform"

# Authentication
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"

# Redis
REDIS_URL="redis://localhost:6379"

# File Storage
UPLOAD_PATH="./uploads"
MAX_FILE_SIZE=10485760

# External APIs
TALABAT_API_URL="https://api.talabat.com"
CAREEM_API_URL="https://api.careem.com"
DHUB_API_URL="https://api.dhub.com"
```

**Frontend (.env)**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="ws://localhost:3001"
NEXT_PUBLIC_APP_NAME="Restaurant Platform"
```

## 📝 Coding Standards

### TypeScript Configuration
- **Strict mode enabled** - Type safety is mandatory
- **ESLint + Prettier** - Automated code formatting
- **Absolute imports** - Use path mapping for imports

### Backend Standards

#### Entity Design
```typescript
// ✅ Good - Rich domain model
@Entity('menu_products')
export class MenuProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'json' })
  name: Record<string, string>; // Multi-language support

  // Business methods
  isAvailable(): boolean {
    return this.status === ProductStatus.ACTIVE && this.stockLevel > 0;
  }

  calculatePriceForPlatform(platform: string): number {
    return this.pricing[platform] || this.basePrice;
  }
}
```

#### Service Layer
```typescript
// ✅ Good - Focused service with clear responsibilities
@Injectable()
export class MenuProductService {
  constructor(
    @InjectRepository(MenuProduct)
    private readonly productRepository: Repository<MenuProduct>,
    private readonly eventBus: EventBus
  ) {}

  async create(dto: CreateProductDto, userId: string): Promise<MenuProduct> {
    // Validation
    await this.validateProductData(dto);
    
    // Business logic
    const product = this.productRepository.create({
      ...dto,
      createdBy: userId
    });
    
    const savedProduct = await this.productRepository.save(product);
    
    // Domain event
    this.eventBus.publish(new ProductCreatedEvent(savedProduct.id));
    
    return savedProduct;
  }
}
```

#### Error Handling
```typescript
// ✅ Good - Consistent error handling
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    const errorResponse = {
      error: {
        code: exception.code || 'INTERNAL_ERROR',
        message: exception.message,
        timestamp: new Date().toISOString(),
        requestId: ctx.getRequest().id
      }
    };
    
    response.status(exception.status || 500).json(errorResponse);
  }
}
```

### Frontend Standards

#### Component Structure
```typescript
// ✅ Good - Feature-based component organization
// features/menu/components/ProductCard.tsx
interface ProductCardProps {
  product: MenuProduct;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete
}) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  
  // Component logic here
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      {/* Component JSX */}
    </div>
  );
};
```

#### Custom Hooks
```typescript
// ✅ Good - Reusable business logic
export const useMenuProducts = (filters?: ProductFilters) => {
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/menu/products', { params: filters });
      setProducts(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);
  
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  
  return { products, loading, error, refetch: fetchProducts };
};
```

## 🚀 Development Workflow

### Git Workflow
We follow **GitFlow** with feature branches:

```
main (production)
├── develop (integration)
    ├── feature/menu-management-v2
    ├── feature/promotion-analytics
    ├── hotfix/auth-token-refresh
    └── release/v2.1.0
```

### Branch Naming Convention
- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Urgent production fixes
- `release/version` - Release preparation

### Commit Messages
Follow **Conventional Commits**:
```bash
feat(menu): add multi-language product support
fix(auth): resolve token refresh loop issue
docs(api): update promotion endpoints documentation
refactor(delivery): extract provider factory pattern
```

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/new-promotion-system
   ```

2. **Development & Testing**
   ```bash
   # Make changes
   npm run test
   npm run lint
   npm run type-check
   ```

3. **Create Pull Request**
   - Clear title and description
   - Link related issues
   - Add screenshots for UI changes
   - Ensure CI passes

4. **Code Review Requirements**
   - At least 2 approvals for main features
   - 1 approval for bug fixes
   - Domain expert approval for complex business logic

### Code Review Checklist

#### Backend Reviews
- [ ] Business logic is in domain services, not controllers
- [ ] Proper error handling and validation
- [ ] Database queries are optimized
- [ ] Multi-tenant security is enforced
- [ ] Tests cover business logic
- [ ] API documentation is updated

#### Frontend Reviews
- [ ] Components are properly typed
- [ ] State management follows patterns
- [ ] UI is responsive and accessible
- [ ] Error states are handled
- [ ] Loading states are shown
- [ ] Multi-language support is implemented

## 🧪 Testing Strategy

### Backend Testing

#### Unit Tests
```typescript
describe('PromotionCampaignService', () => {
  let service: PromotionCampaignService;
  let repository: Repository<PromotionCampaign>;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PromotionCampaignService,
        {
          provide: getRepositoryToken(PromotionCampaign),
          useValue: mockRepository
        }
      ]
    }).compile();
    
    service = module.get<PromotionCampaignService>(PromotionCampaignService);
  });
  
  it('should calculate percentage discount correctly', () => {
    const campaign = new PromotionCampaign();
    campaign.type = PromotionCampaignType.PERCENTAGE_DISCOUNT;
    campaign.discountValue = 30;
    campaign.maxDiscountAmount = 10;
    
    const discount = campaign.calculateDiscount(50, 1);
    
    expect(discount.amount).toBe(10); // Capped at maxDiscountAmount
    expect(discount.percentage).toBe(20);
  });
});
```

#### Integration Tests
```typescript
describe('Menu API Integration', () => {
  let app: INestApplication;
  
  beforeAll(async () => {
    app = await createTestApp();
  });
  
  it('should create product with multi-language names', async () => {
    const productData = {
      name: { en: 'Pizza', ar: 'بيتزا' },
      categoryId: 'category-uuid',
      basePrice: 15.00
    };
    
    const response = await request(app.getHttpServer())
      .post('/menu/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send(productData)
      .expect(201);
    
    expect(response.body.name.en).toBe('Pizza');
    expect(response.body.name.ar).toBe('بيتزا');
  });
});
```

### Frontend Testing

#### Component Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: { en: 'Pizza', ar: 'بيتزا' },
    basePrice: 15.00,
    status: 1
  };
  
  it('should display product name in current language', () => {
    render(
      <LanguageProvider value={{ language: 'en', t: (key) => key }}>
        <ProductCard product={mockProduct} onEdit={jest.fn()} onDelete={jest.fn()} />
      </LanguageProvider>
    );
    
    expect(screen.getByText('Pizza')).toBeInTheDocument();
  });
  
  it('should call onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    render(<ProductCard product={mockProduct} onEdit={onEdit} onDelete={jest.fn()} />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    
    expect(onEdit).toHaveBeenCalledWith('1');
  });
});
```

### Test Commands
```bash
# Backend tests
npm run test:backend          # Unit tests
npm run test:backend:e2e     # End-to-end tests
npm run test:backend:watch   # Watch mode

# Frontend tests
npm run test:frontend        # Component tests
npm run test:frontend:watch  # Watch mode

# Coverage
npm run test:coverage        # Generate coverage report
```

## 📦 Deployment Process

### Environment Stages
1. **Development** - Local development environment
2. **Staging** - Integration testing environment
3. **Production** - Live production environment

### CI/CD Pipeline

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm run test:all
      - name: Run linting
        run: npm run lint
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: npm run deploy:production
```

### Database Migration Strategy
```bash
# Create migration
npm run migration:create -- --name AddPromotionAnalytics

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

## 🔍 Monitoring & Debugging

### Logging Standards
```typescript
// ✅ Good - Structured logging
this.logger.log('Product created', {
  productId: product.id,
  companyId: product.companyId,
  userId: userId,
  action: 'product_created',
  timestamp: new Date().toISOString()
});
```

### Performance Monitoring
- **Backend**: New Relic, DataDog, or similar APM
- **Frontend**: Sentry for error tracking
- **Database**: PgHero for PostgreSQL monitoring

### Error Handling
- All errors should be logged with context
- User-facing errors should be translated
- Sensitive information should never be exposed

## 👥 Team Communication

### Daily Standup Format
- **Yesterday**: What did you complete?
- **Today**: What are you working on?
- **Blockers**: Any impediments or questions?

### Code Review Guidelines
- Be constructive and respectful
- Focus on code quality and architecture
- Suggest improvements, don't just point out problems
- Approve when code meets standards

### Documentation Requirements
- All new features require documentation updates
- API changes must update the API documentation
- Complex business logic needs inline comments
- README files should be kept current

## 🔐 Security Guidelines

### Authentication & Authorization
- Always validate JWT tokens
- Implement proper role-based access control
- Use HTTPS for all communications
- Store sensitive data encrypted

### Input Validation
- Validate all input on both client and server
- Sanitize user inputs to prevent XSS
- Use parameterized queries to prevent SQL injection
- Implement rate limiting on sensitive endpoints

### Data Protection
- Encrypt sensitive data at rest
- Use secure session management
- Implement proper audit logging
- Follow GDPR compliance for customer data

---

**Development Guide Version:** 2.0.0  
**Last Updated:** $(date +%Y-%m-%d)  
**Team Lead:** [Your Name]  
**Next Review:** Monthly