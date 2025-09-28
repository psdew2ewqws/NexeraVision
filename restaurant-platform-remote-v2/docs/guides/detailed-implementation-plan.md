# Complete Printing Template Platform Implementation Plan

**Project:** Receipt Template Builder for Restaurant Platform
**Timeline:** 1-2 Days Intensive Implementation
**Cost:** $0 (Zero-cost MIT/Apache licensed solutions)
**Location:** `/home/admin/restaurant-platform-remote-v2/`

## Overview

This plan provides step-by-step instructions for building a complete printing template platform that integrates with the existing restaurant management system. Every task includes specific commands, file paths, and verification steps.

## Prerequisites

- Existing platform running: Backend (3001), Frontend (3003), PrinterMaster (8182)
- Database: PostgreSQL with password "E$$athecode006"
- Authentication: Login with `admin@test.com` / `test123`

---

# PHASE 1: PROJECT SETUP (2-4 hours)

## Task 1.1: Install Required Dependencies

### Backend Dependencies
```bash
cd /home/admin/restaurant-platform-remote-v2/backend
npm install receiptline @types/node uuid
npm install --save-dev @types/uuid
```

### Frontend Dependencies
```bash
cd /home/admin/restaurant-platform-remote-v2/frontend
npm install @dnd-kit/core @dnd-kit/utilities @dnd-kit/sortable zustand
npm install react-hotkeys-hook react-use
```

**Verification:**
```bash
cd /home/admin/restaurant-platform-remote-v2/backend && npm ls receiptline
cd /home/admin/restaurant-platform-remote-v2/frontend && npm ls @dnd-kit/core
```

## Task 1.2: Database Schema Enhancement

### Create Template System Migration
File: `/home/admin/restaurant-platform-remote-v2/backend/prisma/schema.prisma`

Add these models to the existing schema (after the existing PrintTemplate model):

```prisma
model TemplateCategory {
  id          String   @id @default(uuid())
  name        String
  type        String   // 'receipt', 'kitchen', 'bar', 'delivery'
  description String?
  icon        String?
  sortOrder   Int      @default(0) @map("sort_order")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  templates   PrintTemplateAdvanced[]

  @@map("template_categories")
}

model PrintTemplateAdvanced {
  id                String                    @id @default(uuid())
  companyId         String                    @map("company_id")
  branchId          String?                   @map("branch_id")
  categoryId        String                    @map("category_id")
  name              String
  description       String?
  designData        Json                      @default("{}") @map("design_data")
  paperSize         String                    @default("80mm") @map("paper_size")
  orientation       String                    @default("portrait")
  settings          Json                      @default("{}")
  previewImage      String?                   @map("preview_image")
  isDefault         Boolean                   @default(false) @map("is_default")
  isActive          Boolean                   @default(true) @map("is_active")
  version           Int                       @default(1)
  createdBy         String                    @map("created_by")
  updatedBy         String?                   @map("updated_by")
  createdAt         DateTime                  @default(now()) @map("created_at")
  updatedAt         DateTime                  @updatedAt @map("updated_at")

  company           Company                   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  branch            Branch?                   @relation(fields: [branchId], references: [id])
  category          TemplateCategory          @relation(fields: [categoryId], references: [id])
  user              User                      @relation(fields: [createdBy], references: [id])
  components        TemplateComponent[]
  permissions       TemplatePermission[]
  versions          TemplateVersion[]
  usage             TemplateUsageAnalytics[]
  printJobs         TemplatePrintJob[]

  @@index([companyId, isActive])
  @@index([categoryId, isDefault])
  @@map("print_templates_advanced")
}

model TemplateComponent {
  id           String                    @id @default(uuid())
  templateId   String                    @map("template_id")
  parentId     String?                   @map("parent_id")
  type         String                    // 'text', 'image', 'barcode', 'qr', 'table', 'line'
  name         String?
  properties   Json                      @default("{}")
  position     Json                      @default("{}")
  zIndex       Int                       @default(0) @map("z_index")
  dataBinding  String?                   @map("data_binding")
  conditions   Json                      @default("[]")
  styles       Json                      @default("{}")
  isLocked     Boolean                   @default(false) @map("is_locked")
  createdAt    DateTime                  @default(now()) @map("created_at")

  template     PrintTemplateAdvanced     @relation(fields: [templateId], references: [id], onDelete: Cascade)
  parent       TemplateComponent?        @relation("ComponentHierarchy", fields: [parentId], references: [id])
  children     TemplateComponent[]       @relation("ComponentHierarchy")

  @@index([templateId, zIndex])
  @@map("template_components")
}

model TemplatePermission {
  id           String                    @id @default(uuid())
  templateId   String                    @map("template_id")
  role         String                    // User roles
  permissions  Json                      @default("{}")
  createdAt    DateTime                  @default(now()) @map("created_at")

  template     PrintTemplateAdvanced     @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([templateId, role])
  @@map("template_permissions")
}

model TemplateVersion {
  id           String                    @id @default(uuid())
  templateId   String                    @map("template_id")
  version      Int
  designData   Json                      @map("design_data")
  settings     Json
  changes      String?
  createdBy    String                    @map("created_by")
  createdAt    DateTime                  @default(now()) @map("created_at")

  template     PrintTemplateAdvanced     @relation(fields: [templateId], references: [id], onDelete: Cascade)
  user         User                      @relation(fields: [createdBy], references: [id])

  @@unique([templateId, version])
  @@map("template_versions")
}

model TemplateUsageAnalytics {
  id           String                    @id @default(uuid())
  templateId   String                    @map("template_id")
  companyId    String                    @map("company_id")
  branchId     String?                   @map("branch_id")
  userId       String?                   @map("user_id")
  action       String                    // 'create', 'edit', 'print', 'preview'
  metadata     Json                      @default("{}")
  sessionId    String?                   @map("session_id")
  ipAddress    String?                   @map("ip_address")
  userAgent    String?                   @map("user_agent")
  createdAt    DateTime                  @default(now()) @map("created_at")

  template     PrintTemplateAdvanced     @relation(fields: [templateId], references: [id], onDelete: Cascade)
  company      Company                   @relation(fields: [companyId], references: [id])
  branch       Branch?                   @relation(fields: [branchId], references: [id])
  user         User?                     @relation(fields: [userId], references: [id])

  @@index([templateId, createdAt])
  @@map("template_usage_analytics")
}

model TemplatePrintJob {
  id           String                    @id @default(uuid())
  templateId   String                    @map("template_id")
  printerId    String                    @map("printer_id")
  jobData      Json                      @map("job_data")
  escposData   Bytes?                    @map("escpos_data")
  status       String                    @default("pending")
  errorMessage String?                   @map("error_message")
  retryCount   Int                       @default(0) @map("retry_count")
  createdBy    String                    @map("created_by")
  createdAt    DateTime                  @default(now()) @map("created_at")
  processedAt  DateTime?                 @map("processed_at")
  completedAt  DateTime?                 @map("completed_at")

  template     PrintTemplateAdvanced     @relation(fields: [templateId], references: [id])
  user         User                      @relation(fields: [createdBy], references: [id])

  @@index([status, createdAt])
  @@map("template_print_jobs")
}
```

### Update Existing Models
Add these relations to existing models:

```prisma
// Add to Company model
templateCategories     TemplateCategory[]
printTemplatesAdvanced PrintTemplateAdvanced[]
templateUsageAnalytics TemplateUsageAnalytics[]

// Add to Branch model
printTemplatesAdvanced PrintTemplateAdvanced[]
templateUsageAnalytics TemplateUsageAnalytics[]

// Add to User model
createdTemplates       PrintTemplateAdvanced[] @relation("TemplateCreator")
templateVersions       TemplateVersion[]
templateUsageAnalytics TemplateUsageAnalytics[]
templatePrintJobs      TemplatePrintJob[]
```

### Apply Database Migration
```bash
cd /home/admin/restaurant-platform-remote-v2/backend
npx prisma db push
```

**Verification:**
```bash
cd /home/admin/restaurant-platform-remote-v2/backend
npx prisma studio
# Check that new tables exist: template_categories, print_templates_advanced, etc.
```

## Task 1.3: Seed Initial Data

### Create Seed Script
File: `/home/admin/restaurant-platform-remote-v2/backend/src/scripts/seed-templates.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTemplateCategories() {
  const categories = [
    {
      name: 'Receipt Templates',
      type: 'receipt',
      description: 'Customer receipt templates',
      icon: 'receipt',
      sortOrder: 1,
    },
    {
      name: 'Kitchen Orders',
      type: 'kitchen',
      description: 'Kitchen order tickets',
      icon: 'kitchen',
      sortOrder: 2,
    },
    {
      name: 'Bar Orders',
      type: 'bar',
      description: 'Bar and beverage orders',
      icon: 'bar',
      sortOrder: 3,
    },
    {
      name: 'Delivery Labels',
      type: 'delivery',
      description: 'Delivery and pickup labels',
      icon: 'delivery',
      sortOrder: 4,
    },
  ];

  for (const category of categories) {
    await prisma.templateCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.log('Template categories seeded successfully');
}

async function main() {
  try {
    await seedTemplateCategories();
    console.log('Database seeding completed');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

### Run Seed Script
```bash
cd /home/admin/restaurant-platform-remote-v2/backend
npx tsx src/scripts/seed-templates.ts
```

**Verification:**
```bash
cd /home/admin/restaurant-platform-remote-v2/backend
npx prisma studio
# Check template_categories table has 4 records
```

---

# PHASE 2: BACKEND DEVELOPMENT (8-12 hours)

## Task 2.1: Create NestJS Template Builder Module

### Module Structure
File: `/home/admin/restaurant-platform-remote-v2/backend/src/modules/template-builder/template-builder.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateBuilderController } from './template-builder.controller';
import { TemplateBuilderService } from './template-builder.service';
import { ESCPOSService } from './services/escpos.service';
import { PreviewService } from './services/preview.service';
import { TemplatePermissionGuard } from './guards/template-permission.guard';

@Module({
  imports: [
    // Add entities when created
  ],
  controllers: [TemplateBuilderController],
  providers: [
    TemplateBuilderService,
    ESCPOSService,
    PreviewService,
    TemplatePermissionGuard,
  ],
  exports: [TemplateBuilderService, ESCPOSService],
})
export class TemplateBuilderModule {}
```

### DTOs for Template Operations
File: `/home/admin/restaurant-platform-remote-v2/backend/src/modules/template-builder/dto/create-template.dto.ts`

```typescript
import { IsString, IsOptional, IsUUID, IsObject, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsObject()
  designData?: any;

  @IsOptional()
  @IsEnum(['58mm', '80mm', '112mm', 'A4'])
  paperSize?: string;

  @IsOptional()
  @IsEnum(['portrait', 'landscape'])
  orientation?: string;

  @IsOptional()
  @IsObject()
  settings?: any;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isDefault?: boolean;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  designData?: any;

  @IsOptional()
  @IsEnum(['58mm', '80mm', '112mm', 'A4'])
  paperSize?: string;

  @IsOptional()
  @IsEnum(['portrait', 'landscape'])
  orientation?: string;

  @IsOptional()
  @IsObject()
  settings?: any;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateComponentDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsObject()
  properties: any;

  @IsObject()
  position: any;

  @IsOptional()
  @IsString()
  dataBinding?: string;

  @IsOptional()
  @IsObject()
  styles?: any;
}
```

## Task 2.2: Implement Template Service

File: `/home/admin/restaurant-platform-remote-v2/backend/src/modules/template-builder/template-builder.service.ts`

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class TemplateBuilderService {
  constructor(private prisma: PrismaService) {}

  async getCategories() {
    return this.prisma.templateCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getTemplates(companyId: string, branchId?: string) {
    return this.prisma.printTemplateAdvanced.findMany({
      where: {
        companyId,
        ...(branchId ? { branchId } : {}),
        isActive: true,
      },
      include: {
        category: true,
        components: {
          orderBy: { zIndex: 'asc' },
        },
        _count: {
          select: {
            usage: true,
            printJobs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplate(id: string, companyId: string) {
    const template = await this.prisma.printTemplateAdvanced.findFirst({
      where: { id, companyId },
      include: {
        category: true,
        components: {
          orderBy: { zIndex: 'asc' },
        },
        versions: {
          take: 5,
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async createTemplate(dto: CreateTemplateDto, userId: string, companyId: string) {
    // Check if setting as default
    if (dto.isDefault) {
      await this.prisma.printTemplateAdvanced.updateMany({
        where: {
          companyId,
          categoryId: dto.categoryId,
          branchId: dto.branchId || null,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const template = await this.prisma.printTemplateAdvanced.create({
      data: {
        ...dto,
        companyId,
        createdBy: userId,
        designData: dto.designData || {
          components: [],
          settings: {
            width: dto.paperSize === '58mm' ? 384 : 576,
            height: 800,
            margins: { top: 10, bottom: 10, left: 5, right: 5 },
          },
        },
      },
      include: {
        category: true,
        components: true,
      },
    });

    // Create initial version
    await this.prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        designData: template.designData,
        settings: template.settings,
        changes: 'Initial template creation',
        createdBy: userId,
      },
    });

    return template;
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto, userId: string, companyId: string) {
    const template = await this.getTemplate(id, companyId);

    // Handle default template logic
    if (dto.isDefault && !template.isDefault) {
      await this.prisma.printTemplateAdvanced.updateMany({
        where: {
          companyId,
          categoryId: template.categoryId,
          branchId: template.branchId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const updatedTemplate = await this.prisma.printTemplateAdvanced.update({
      where: { id },
      data: {
        ...dto,
        updatedBy: userId,
        version: { increment: 1 },
      },
      include: {
        category: true,
        components: true,
      },
    });

    // Create version history if design changed
    if (dto.designData) {
      await this.prisma.templateVersion.create({
        data: {
          templateId: id,
          version: updatedTemplate.version,
          designData: dto.designData,
          settings: dto.settings || template.settings,
          changes: 'Template updated',
          createdBy: userId,
        },
      });
    }

    return updatedTemplate;
  }

  async deleteTemplate(id: string, companyId: string) {
    const template = await this.getTemplate(id, companyId);

    return this.prisma.printTemplateAdvanced.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  async duplicateTemplate(id: string, userId: string, companyId: string) {
    const originalTemplate = await this.getTemplate(id, companyId);

    const newTemplate = await this.prisma.printTemplateAdvanced.create({
      data: {
        name: `${originalTemplate.name} (Copy)`,
        description: originalTemplate.description,
        companyId,
        branchId: originalTemplate.branchId,
        categoryId: originalTemplate.categoryId,
        designData: originalTemplate.designData,
        paperSize: originalTemplate.paperSize,
        orientation: originalTemplate.orientation,
        settings: originalTemplate.settings,
        isDefault: false, // Copies are never default
        createdBy: userId,
      },
      include: {
        category: true,
      },
    });

    // Duplicate components
    for (const component of originalTemplate.components) {
      await this.prisma.templateComponent.create({
        data: {
          templateId: newTemplate.id,
          type: component.type,
          name: component.name,
          properties: component.properties,
          position: component.position,
          zIndex: component.zIndex,
          dataBinding: component.dataBinding,
          conditions: component.conditions,
          styles: component.styles,
          isLocked: component.isLocked,
        },
      });
    }

    return newTemplate;
  }

  async trackUsage(
    templateId: string,
    action: string,
    userId: string,
    companyId: string,
    metadata: any = {},
  ) {
    return this.prisma.templateUsageAnalytics.create({
      data: {
        templateId,
        companyId,
        userId,
        action,
        metadata,
        sessionId: `session-${Date.now()}`,
      },
    });
  }
}
```

Continue to Phase 3 in next section due to length...