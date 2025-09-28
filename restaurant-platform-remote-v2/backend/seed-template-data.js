const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedTemplateData() {
  console.log('🌱 Seeding template data...');

  try {
    // Get the first company and admin user
    const company = await prisma.company.findFirst();
    if (!company) {
      console.error('❌ No company found. Please create a company first.');
      return;
    }

    const adminUser = await prisma.user.findFirst({
      where: { role: { in: ['super_admin', 'company_owner'] } }
    });
    if (!adminUser) {
      console.error('❌ No admin user found. Please create an admin user first.');
      return;
    }

    // Get template categories
    const categories = await prisma.templateCategory.findMany();
    const receiptCategory = categories.find(c => c.type === 'receipt');
    const kitchenCategory = categories.find(c => c.type === 'kitchen');
    const confirmationCategory = categories.find(c => c.type === 'confirmation');

    if (!receiptCategory || !kitchenCategory || !confirmationCategory) {
      console.error('❌ Template categories not found. Please run seed-template-categories.js first.');
      return;
    }

    console.log(`✅ Using company: ${company.name}`);
    console.log(`✅ Using admin user: ${adminUser.email}`);

    // Template data with toggle-based configuration
    const templates = [
      {
        name: 'Standard Receipt Template',
        description: 'Professional receipt template for customer orders with Jordan compliance',
        categoryId: receiptCategory.id,
        companyId: company.id,
        createdBy: adminUser.id,
        isDefault: true,
        isActive: true,
        tags: ['receipt', 'customer', 'default'],
        designData: {
          components: [],
          settings: {
            paperSize: '80mm',
            encoding: 'utf8',
            density: 'medium'
          },
          metadata: {
            version: '1.0',
            type: 'thermal_receipt'
          },
          toggleConfig: {
            // Header Section
            isLogo: true,
            isCompanyName: true,
            isCompanyPhone: true,
            isBranchName: true,
            isBranchAddress: true,

            // Order Information
            isOrderNumber: true,
            isOrderDate: true,
            isOrderTime: true,
            isOrderType: true,
            isOrderSource: false,
            isScheduleTime: false,
            isOrderNote: false,

            // Customer Information
            isCustomerName: true,
            isCustomerPhone: true,
            isCustomerAddress: false,
            isDeliveryNote: false,

            // Product Information
            isProductInfo: true,
            isProductName: true,
            isProductQuantity: true,
            isProductPrice: true,
            isProductNote: false,
            isProductAttributes: true,
            isProductSubAttributes: false,

            // Pricing & Totals
            isSubtotal: true,
            isDeliveryFees: true,
            isTaxValue: true,
            isDiscount: true,
            isTotal: true,

            // Footer Section
            isTaxNumber: true,
            isThankYouMessage: true,
            isContactInfo: true,
            isBarcode: false,
            isQRCode: true,

            // Additional Options
            isPaid: true,

            // Editable Content
            content: {
              // Header Content
              companyName: 'مطعم الأردن - Jordan Restaurant',
              companyPhone: '+962 6 123 4567',
              companyAddress: 'عمان، الأردن - Amman, Jordan',
              branchName: 'الفرع الرئيسي - Main Branch',
              branchAddress: 'شارع الملك حسين - King Hussein Street',
              logoText: 'Jordan Restaurant',

              // Order Content
              orderNumberLabel: 'رقم الطلب - Order #',
              orderDateLabel: 'التاريخ - Date',
              orderTimeLabel: 'الوقت - Time',
              orderTypeLabel: 'نوع الطلب - Order Type',
              orderSourceLabel: 'المصدر - Source',
              scheduleTimeLabel: 'وقت التسليم - Delivery Time',
              orderNoteLabel: 'ملاحظات - Notes',
              orderNumberFormat: 'ORD-{number}',
              dateFormat: 'DD/MM/YYYY',
              timeFormat: 'HH:mm',

              // Customer Content
              customerNameLabel: 'العميل - Customer',
              customerPhoneLabel: 'الهاتف - Phone',
              customerAddressLabel: 'العنوان - Address',
              deliveryNoteLabel: 'ملاحظات التوصيل - Delivery Notes',

              // Product Content
              productsHeaderText: 'الأصناف - Items',
              productNameHeader: 'الصنف - Item',
              productQuantityHeader: 'الكمية - Qty',
              productPriceHeader: 'السعر - Price',
              productNoteLabel: 'ملاحظات - Notes',
              productAttributesLabel: 'الإضافات - Additions',

              // Totals Content
              subtotalLabel: 'المجموع الفرعي - Subtotal',
              deliveryFeesLabel: 'رسوم التوصيل - Delivery',
              taxValueLabel: 'ضريبة المبيعات - VAT (16%)',
              discountLabel: 'الخصم - Discount',
              totalLabel: 'المجموع الكلي - TOTAL',

              // Footer Content
              taxNumber: 'الرقم الضريبي: 123456789',
              thankYouMessage: 'شكراً لزيارتكم - Thank you for your visit!',
              contactInfo: 'للشكاوى والاقتراحات: complaints@restaurant.jo',
              barcodeContent: '{orderNumber}',
              qrCodeContent: 'https://restaurant.jo/order/{orderNumber}',
              paymentStatusText: 'مدفوع - PAID',

              // Styling Options
              headerStyle: {
                fontSize: 16,
                fontWeight: 'bold',
                textAlign: 'center',
                textTransform: 'none'
              },
              orderStyle: {
                fontSize: 12,
                fontWeight: 'normal',
                textAlign: 'left',
                textTransform: 'none'
              },
              customerStyle: {
                fontSize: 12,
                fontWeight: 'normal',
                textAlign: 'left',
                textTransform: 'none'
              },
              productsStyle: {
                fontSize: 11,
                fontWeight: 'normal',
                textAlign: 'left',
                textTransform: 'none'
              },
              totalsStyle: {
                fontSize: 12,
                fontWeight: 'bold',
                textAlign: 'right',
                textTransform: 'none'
              },
              footerStyle: {
                fontSize: 10,
                fontWeight: 'normal',
                textAlign: 'center',
                textTransform: 'none'
              }
            }
          }
        },
        canvasSettings: {
          paperSize: '80mm',
          orientation: 'portrait',
          margins: { top: 10, right: 5, bottom: 10, left: 5 },
          backgroundColor: '#ffffff',
          showGrid: false,
          gridSize: 10,
          snapToGrid: true,
          zoom: 1.0
        },
        printSettings: {
          density: 'medium',
          cutType: 'full',
          encoding: 'utf8',
          font: {
            family: 'Courier New',
            size: 12,
            weight: 'normal'
          },
          thermalSettings: {
            speed: 'medium',
            darkness: 'medium'
          },
          lineSpacing: 1.2,
          characterSpacing: 0
        }
      },
      {
        name: 'Kitchen Order Ticket',
        description: 'Kitchen ticket template for order processing',
        categoryId: kitchenCategory.id,
        companyId: company.id,
        createdBy: adminUser.id,
        isDefault: true,
        isActive: true,
        tags: ['kitchen', 'ticket', 'internal'],
        designData: {
          components: [],
          settings: {
            paperSize: '80mm',
            encoding: 'utf8',
            density: 'high'
          },
          metadata: {
            version: '1.0',
            type: 'kitchen_ticket'
          },
          toggleConfig: {
            // Header Section
            isLogo: false,
            isCompanyName: false,
            isCompanyPhone: false,
            isBranchName: true,
            isBranchAddress: false,

            // Order Information
            isOrderNumber: true,
            isOrderDate: true,
            isOrderTime: true,
            isOrderType: true,
            isOrderSource: true,
            isScheduleTime: true,
            isOrderNote: true,

            // Customer Information
            isCustomerName: true,
            isCustomerPhone: true,
            isCustomerAddress: true,
            isDeliveryNote: true,

            // Product Information
            isProductInfo: true,
            isProductName: true,
            isProductQuantity: true,
            isProductPrice: false,
            isProductNote: true,
            isProductAttributes: true,
            isProductSubAttributes: true,

            // Pricing & Totals
            isSubtotal: false,
            isDeliveryFees: false,
            isTaxValue: false,
            isDiscount: false,
            isTotal: false,

            // Footer Section
            isTaxNumber: false,
            isThankYouMessage: false,
            isContactInfo: false,
            isBarcode: true,
            isQRCode: false,

            // Additional Options
            isPaid: false,

            // Kitchen-specific content
            content: {
              companyName: 'Jordan Restaurant Kitchen',
              branchName: 'Kitchen - Main Branch',
              orderNumberLabel: 'Order #',
              orderDateLabel: 'Date',
              orderTimeLabel: 'Time',
              orderTypeLabel: 'Type',
              orderSourceLabel: 'Source',
              scheduleTimeLabel: 'Ready By',
              orderNoteLabel: 'Special Instructions',
              customerNameLabel: 'Customer',
              customerPhoneLabel: 'Phone',
              customerAddressLabel: 'Address',
              deliveryNoteLabel: 'Delivery Notes',
              productsHeaderText: 'ITEMS TO PREPARE',
              productNameHeader: 'Item',
              productQuantityHeader: 'Qty',
              productNoteLabel: 'Notes',
              productAttributesLabel: 'Modifiers',
              barcodeContent: 'KT-{orderNumber}',
              headerStyle: {
                fontSize: 18,
                fontWeight: 'bold',
                textAlign: 'center',
                textTransform: 'uppercase'
              },
              orderStyle: {
                fontSize: 14,
                fontWeight: 'bold',
                textAlign: 'left',
                textTransform: 'none'
              },
              customerStyle: {
                fontSize: 12,
                fontWeight: 'normal',
                textAlign: 'left',
                textTransform: 'none'
              },
              productsStyle: {
                fontSize: 13,
                fontWeight: 'bold',
                textAlign: 'left',
                textTransform: 'uppercase'
              }
            }
          }
        },
        canvasSettings: {
          paperSize: '80mm',
          orientation: 'portrait',
          margins: { top: 5, right: 5, bottom: 5, left: 5 },
          backgroundColor: '#ffffff',
          showGrid: false,
          gridSize: 10,
          snapToGrid: true,
          zoom: 1.0
        },
        printSettings: {
          density: 'high',
          cutType: 'full',
          encoding: 'utf8',
          font: {
            family: 'Courier New',
            size: 14,
            weight: 'bold'
          },
          thermalSettings: {
            speed: 'fast',
            darkness: 'dark'
          },
          lineSpacing: 1.0,
          characterSpacing: 0
        }
      },
      {
        name: 'Order Confirmation Slip',
        description: 'Simple confirmation slip for customers',
        categoryId: confirmationCategory.id,
        companyId: company.id,
        createdBy: adminUser.id,
        isDefault: false,
        isActive: true,
        tags: ['confirmation', 'customer', 'simple'],
        designData: {
          components: [],
          settings: {
            paperSize: '58mm',
            encoding: 'utf8',
            density: 'light'
          },
          metadata: {
            version: '1.0',
            type: 'confirmation_slip'
          },
          toggleConfig: {
            // Header Section
            isLogo: false,
            isCompanyName: true,
            isCompanyPhone: true,
            isBranchName: false,
            isBranchAddress: false,

            // Order Information
            isOrderNumber: true,
            isOrderDate: true,
            isOrderTime: true,
            isOrderType: false,
            isOrderSource: false,
            isScheduleTime: true,
            isOrderNote: false,

            // Customer Information
            isCustomerName: true,
            isCustomerPhone: false,
            isCustomerAddress: false,
            isDeliveryNote: false,

            // Product Information
            isProductInfo: false,
            isProductName: false,
            isProductQuantity: false,
            isProductPrice: false,
            isProductNote: false,
            isProductAttributes: false,
            isProductSubAttributes: false,

            // Pricing & Totals
            isSubtotal: false,
            isDeliveryFees: false,
            isTaxValue: false,
            isDiscount: false,
            isTotal: true,

            // Footer Section
            isTaxNumber: false,
            isThankYouMessage: true,
            isContactInfo: true,
            isBarcode: false,
            isQRCode: true,

            // Additional Options
            isPaid: true,

            content: {
              companyName: 'Jordan Restaurant',
              companyPhone: '+962 6 123 4567',
              orderNumberLabel: 'Order Confirmed #',
              orderDateLabel: 'Date',
              orderTimeLabel: 'Time',
              scheduleTimeLabel: 'Ready in',
              customerNameLabel: 'Customer',
              totalLabel: 'Total',
              thankYouMessage: 'Thank you! Your order is being prepared.',
              contactInfo: 'Track: restaurant.jo',
              qrCodeContent: 'https://restaurant.jo/track/{orderNumber}',
              paymentStatusText: 'CONFIRMED & PAID',
              headerStyle: {
                fontSize: 14,
                fontWeight: 'bold',
                textAlign: 'center',
                textTransform: 'none'
              },
              orderStyle: {
                fontSize: 12,
                fontWeight: 'normal',
                textAlign: 'center',
                textTransform: 'none'
              },
              footerStyle: {
                fontSize: 10,
                fontWeight: 'normal',
                textAlign: 'center',
                textTransform: 'none'
              }
            }
          }
        },
        canvasSettings: {
          paperSize: '58mm',
          orientation: 'portrait',
          margins: { top: 5, right: 3, bottom: 5, left: 3 },
          backgroundColor: '#ffffff',
          showGrid: false,
          gridSize: 8,
          snapToGrid: true,
          zoom: 1.0
        },
        printSettings: {
          density: 'light',
          cutType: 'partial',
          encoding: 'utf8',
          font: {
            family: 'Courier New',
            size: 10,
            weight: 'normal'
          },
          thermalSettings: {
            speed: 'medium',
            darkness: 'light'
          },
          lineSpacing: 1.1,
          characterSpacing: 0
        }
      }
    ];

    // Create templates
    for (const templateData of templates) {
      const existing = await prisma.templateBuilderTemplate.findFirst({
        where: {
          name: templateData.name,
          companyId: company.id
        }
      });

      if (!existing) {
        const template = await prisma.templateBuilderTemplate.create({
          data: templateData
        });
        console.log(`✅ Created template: ${template.name}`);
      } else {
        console.log(`⏭️  Template already exists: ${templateData.name}`);
      }
    }

    console.log('🎉 Template data seeded successfully!');

    // Show summary
    const totalTemplates = await prisma.templateBuilderTemplate.count();
    const totalCategories = await prisma.templateCategory.count();

    console.log('\n📊 Summary:');
    console.log(`Total Categories: ${totalCategories}`);
    console.log(`Total Templates: ${totalTemplates}`);
    console.log('\n✅ Template Builder data is ready!');
    console.log('🔗 Visit: http://localhost:3000/settings/template-builder');

  } catch (error) {
    console.error('❌ Error seeding template data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTemplateData();