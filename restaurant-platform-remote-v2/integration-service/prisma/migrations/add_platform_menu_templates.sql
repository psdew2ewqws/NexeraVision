-- Add Platform Menu Templates Table
-- Migration for platform-specific menu template storage

CREATE TABLE "platform_menu_templates" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "platforms" TEXT[] NOT NULL, -- Array of platform IDs
  "category" TEXT NOT NULL DEFAULT 'custom', -- fast_food, fine_dining, cafe, delivery_only, custom
  "configs" JSONB NOT NULL DEFAULT '{}', -- Platform-specific configurations
  "metadata" JSONB NOT NULL DEFAULT '{}', -- Template metadata (version, tags, etc.)
  "is_public" BOOLEAN NOT NULL DEFAULT false,
  "preview_image" TEXT,
  "estimated_setup_time" INTEGER, -- Minutes
  "features" TEXT[], -- Array of feature descriptions
  "created_by" TEXT,
  "updated_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3)
);

-- Create indexes for better query performance
CREATE INDEX "idx_platform_menu_templates_category" ON "platform_menu_templates"("category");
CREATE INDEX "idx_platform_menu_templates_is_public" ON "platform_menu_templates"("is_public");
CREATE INDEX "idx_platform_menu_templates_platforms" ON "platform_menu_templates" USING GIN("platforms");
CREATE INDEX "idx_platform_menu_templates_created_at" ON "platform_menu_templates"("created_at");
CREATE INDEX "idx_platform_menu_templates_deleted_at" ON "platform_menu_templates"("deleted_at");

-- Add template usage tracking table
CREATE TABLE "platform_menu_template_usage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "template_id" TEXT NOT NULL,
  "platform_menu_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "customizations" JSONB DEFAULT '{}',
  "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "applied_by" TEXT,
  
  CONSTRAINT "fk_template_usage_template" FOREIGN KEY ("template_id") REFERENCES "platform_menu_templates"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_template_usage_platform_menu" FOREIGN KEY ("platform_menu_id") REFERENCES "platform_menus"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_template_usage_template_id" ON "platform_menu_template_usage"("template_id");
CREATE INDEX "idx_template_usage_company_id" ON "platform_menu_template_usage"("company_id");
CREATE INDEX "idx_template_usage_applied_at" ON "platform_menu_template_usage"("applied_at");

-- Insert default templates
INSERT INTO "platform_menu_templates" (
  "id", 
  "name", 
  "description", 
  "platforms", 
  "category", 
  "configs", 
  "metadata", 
  "is_public",
  "features",
  "estimated_setup_time"
) VALUES (
  'template-multi-platform-fast-food',
  'Fast Food Multi-Platform',
  'Optimized template for fast food restaurants across Talabat, Careem, and Call Center platforms',
  '{"talabat", "careem", "call_center"}',
  'fast_food',
  '{
    "talabat": {
      "currency": "JOD",
      "taxRate": 0.16,
      "deliveryZones": ["amman", "zarqa"],
      "operatingHours": {
        "monday": {"open": "10:00", "close": "23:00", "available": true},
        "tuesday": {"open": "10:00", "close": "23:00", "available": true},
        "wednesday": {"open": "10:00", "close": "23:00", "available": true},
        "thursday": {"open": "10:00", "close": "23:00", "available": true},
        "friday": {"open": "10:00", "close": "24:00", "available": true},
        "saturday": {"open": "10:00", "close": "24:00", "available": true},
        "sunday": {"open": "12:00", "close": "23:00", "available": true}
      },
      "specialOffers": {
        "enabled": true,
        "types": ["discount", "free_delivery"]
      },
      "menuDisplay": {
        "showNutrition": false,
        "showCalories": true,
        "showAllergens": true,
        "groupByCategory": true
      }
    },
    "careem": {
      "currency": "JOD",
      "serviceArea": {
        "city": "Amman",
        "zones": ["Downtown", "Abdoun", "Sweifieh"],
        "maxDeliveryRadius": 10
      },
      "deliverySettings": {
        "estimatedDeliveryTime": 25,
        "minOrderValue": 5.0,
        "deliveryFee": 1.5,
        "freeDeliveryThreshold": 15.0
      },
      "promotions": {
        "enabled": true,
        "types": ["percentage", "fixed_amount"],
        "autoApply": true
      },
      "display": {
        "showPreparationTime": true,
        "showIngredients": false,
        "showNutritionalFacts": false,
        "enableItemCustomization": true
      }
    },
    "call_center": {
      "operatorSettings": {
        "maxSimultaneousOrders": 3,
        "averageCallDuration": 5,
        "preferredLanguage": "both"
      },
      "quickOrderCodes": {
        "enabled": true,
        "codeLength": 3,
        "includeCategory": false
      },
      "promotions": {
        "phoneExclusive": true,
        "timeBasedOffers": false,
        "repeatCustomerDiscounts": true
      },
      "orderProcessing": {
        "confirmationRequired": true,
        "readBackOrder": true,
        "estimatedDeliveryTime": 30,
        "acceptCashOnDelivery": true,
        "acceptCardPayments": false
      }
    }
  }',
  '{
    "version": "1.0",
    "tags": ["fast-food", "multi-platform", "quick-service"],
    "author": "Restaurant Platform v2",
    "compatibility": ["v2.0+"]
  }',
  true,
  '{"Quick setup for fast food restaurants", "Optimized for high-volume orders", "Multi-platform synchronization", "Phone order integration", "Delivery optimization"}',
  15
),
(
  'template-talabat-premium',
  'Talabat Premium Restaurant',
  'High-end restaurant template optimized specifically for Talabat platform with premium features',
  '{"talabat"}',
  'fine_dining',
  '{
    "talabat": {
      "currency": "JOD",
      "taxRate": 0.16,
      "deliveryZones": ["amman"],
      "operatingHours": {
        "monday": {"open": "17:00", "close": "23:00", "available": true},
        "tuesday": {"open": "17:00", "close": "23:00", "available": true},
        "wednesday": {"open": "17:00", "close": "23:00", "available": true},
        "thursday": {"open": "17:00", "close": "23:00", "available": true},
        "friday": {"open": "17:00", "close": "24:00", "available": true},
        "saturday": {"open": "17:00", "close": "24:00", "available": true},
        "sunday": {"open": "17:00", "close": "22:00", "available": true}
      },
      "specialOffers": {
        "enabled": false,
        "types": []
      },
      "menuDisplay": {
        "showNutrition": true,
        "showCalories": true,
        "showAllergens": true,
        "groupByCategory": true
      }
    }
  }',
  '{
    "version": "1.0",
    "tags": ["fine-dining", "premium", "talabat-specific"],
    "author": "Restaurant Platform v2",
    "compatibility": ["v2.0+"]
  }',
  true,
  '{"Premium menu presentation", "Detailed nutritional information", "Fine dining hours", "Upscale branding", "Quality focus"}',
  10
),
(
  'template-careem-quick-service',
  'Careem Quick Service',
  'Fast and efficient template for quick service restaurants on Careem platform',
  '{"careem"}',
  'fast_food',
  '{
    "careem": {
      "currency": "JOD",
      "serviceArea": {
        "city": "Amman",
        "zones": ["Downtown", "Abdoun", "Sweifieh", "University"],
        "maxDeliveryRadius": 12
      },
      "deliverySettings": {
        "estimatedDeliveryTime": 20,
        "minOrderValue": 3.0,
        "deliveryFee": 1.0,
        "freeDeliveryThreshold": 12.0
      },
      "promotions": {
        "enabled": true,
        "types": ["percentage", "fixed_amount", "buy_x_get_y"],
        "autoApply": true
      },
      "display": {
        "showPreparationTime": true,
        "showIngredients": false,
        "showNutritionalFacts": false,
        "enableItemCustomization": true
      }
    }
  }',
  '{
    "version": "1.0",
    "tags": ["quick-service", "careem-optimized", "fast-delivery"],
    "author": "Restaurant Platform v2",
    "compatibility": ["v2.0+"]
  }',
  true,
  '{"Fast delivery optimization", "Wide service area", "Promotional features", "Quick service focus", "Careem integration"}',
  8
),
(
  'template-call-center-advanced',
  'Advanced Call Center System',
  'Comprehensive call center template with advanced features for phone order management',
  '{"call_center"}',
  'custom',
  '{
    "call_center": {
      "operatorSettings": {
        "maxSimultaneousOrders": 5,
        "averageCallDuration": 7,
        "preferredLanguage": "both"
      },
      "quickOrderCodes": {
        "enabled": true,
        "codeLength": 4,
        "includeCategory": true
      },
      "promotions": {
        "phoneExclusive": true,
        "timeBasedOffers": true,
        "repeatCustomerDiscounts": true
      },
      "customerManagement": {
        "enableCustomerDatabase": true,
        "saveOrderHistory": true,
        "suggestPreviousOrders": true
      },
      "orderProcessing": {
        "confirmationRequired": true,
        "readBackOrder": true,
        "estimatedDeliveryTime": 25,
        "acceptCashOnDelivery": true,
        "acceptCardPayments": true
      }
    }
  }',
  '{
    "version": "1.0",
    "tags": ["call-center", "advanced-features", "customer-management"],
    "author": "Restaurant Platform v2",
    "compatibility": ["v2.0+"]
  }',
  true,
  '{"Advanced operator features", "Customer database integration", "Quick order codes", "Payment flexibility", "Order history tracking"}',
  12
);