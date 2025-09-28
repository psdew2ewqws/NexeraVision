import { PrismaService } from '../../shared/database/prisma.service';

export async function seedAdditionalDeliveryProviders(prisma: PrismaService) {
  console.log('🚚 Seeding additional delivery providers...');

  const additionalProviders = [
    {
      name: 'jahez',
      displayName: { en: 'Jahez', ar: 'جاهز' },
      apiBaseUrl: 'https://integration-api-staging.jahez.net',
      isActive: true,
      priority: 4,
      supportedAreas: ['riyadh', 'jeddah', 'dammam', 'mecca', 'medina'], // Saudi cities
      avgDeliveryTime: 35,
      baseFee: 5.00, // 5 SAR base fee
      feePerKm: 1.50, // 1.5 SAR per km
      maxDistance: 25.00,
      companyId: null, // Global provider
      webhookUrl: null,
      configuration: {
        apiVersion: 'v1',
        region: 'saudi_arabia',
        currency: 'SAR',
        supportedPaymentMethods: ['cash', 'card', 'wallet'],
        operatingHours: {
          start: '06:00',
          end: '23:59'
        },
        features: [
          'real_time_tracking',
          'scheduled_delivery',
          'multi_payment_methods',
          'arabic_support'
        ]
      }
    },
    {
      name: 'deliveroo',
      displayName: { en: 'Deliveroo', ar: 'ديليفيرو' },
      apiBaseUrl: 'https://api-sandbox.developers.deliveroo.com',
      isActive: true,
      priority: 5,
      supportedAreas: ['london', 'manchester', 'birmingham', 'dubai', 'abu_dhabi'], // UK & UAE cities
      avgDeliveryTime: 30,
      baseFee: 2.49, // £2.49 base fee (UK) / AED 9 (UAE)
      feePerKm: 0.50, // £0.50 per km
      maxDistance: 15.00,
      companyId: null, // Global provider
      webhookUrl: null,
      configuration: {
        apiVersion: 'v1',
        regions: ['uk', 'uae', 'france', 'belgium', 'netherlands'],
        currency: 'GBP', // Primary currency
        supportedPaymentMethods: ['card', 'paypal', 'apple_pay', 'google_pay'],
        operatingHours: {
          start: '11:00',
          end: '23:00'
        },
        features: [
          'real_time_tracking',
          'scheduled_delivery',
          'premium_service',
          'multi_language_support',
          'oauth_integration'
        ],
        oauth: {
          authUrl: 'https://auth-sandbox.developers.deliveroo.com',
          tokenUrl: 'https://auth-sandbox.developers.deliveroo.com/oauth/token',
          scope: 'read_orders write_orders'
        }
      }
    }
  ];

  for (const provider of additionalProviders) {
    try {
      const existingProvider = await prisma.deliveryProvider.findFirst({
        where: { name: provider.name }
      });

      if (existingProvider) {
        console.log(`   ⚠️  Provider ${provider.name} already exists, updating...`);
        await prisma.deliveryProvider.update({
          where: { id: existingProvider.id },
          data: {
            displayName: provider.displayName,
            apiBaseUrl: provider.apiBaseUrl,
            isActive: provider.isActive,
            priority: provider.priority,
            supportedAreas: provider.supportedAreas,
            avgDeliveryTime: provider.avgDeliveryTime,
            baseFee: provider.baseFee,
            feePerKm: provider.feePerKm,
            maxDistance: provider.maxDistance,
            configuration: provider.configuration,
            webhookUrl: provider.webhookUrl,
            updatedAt: new Date()
          }
        });
      } else {
        await prisma.deliveryProvider.create({
          data: provider
        });
        console.log(`   ✅ Created provider: ${provider.displayName.en} (${provider.name})`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to create provider ${provider.name}:`, error.message);
    }
  }

  // Update existing providers with multi-tenant support
  console.log('🔧 Updating existing providers with multi-tenant configuration...');
  
  const providersToUpdate = [
    {
      name: 'dhub',
      updates: {
        companyId: null, // Global provider
        webhookUrl: null,
        configuration: {
          apiVersion: 'v1',
          region: 'jordan',
          currency: 'JOD',
          supportedPaymentMethods: ['cash', 'card'],
          operatingHours: { start: '08:00', end: '22:00' },
          features: ['real_time_tracking', 'jordan_coverage', 'arabic_support']
        }
      }
    },
    {
      name: 'careem',
      updates: {
        companyId: null, // Global provider
        webhookUrl: null,
        configuration: {
          apiVersion: 'v2',
          region: 'middle_east',
          currency: 'AED',
          supportedPaymentMethods: ['cash', 'card', 'careem_wallet'],
          operatingHours: { start: '24/7', end: '24/7' },
          features: ['real_time_tracking', 'premium_service', 'multi_region']
        }
      }
    },
    {
      name: 'talabat',
      updates: {
        companyId: null, // Global provider
        webhookUrl: null,
        configuration: {
          apiVersion: 'v1',
          region: 'middle_east',
          currency: 'KWD',
          supportedPaymentMethods: ['cash', 'card', 'knet', 'talabat_wallet'],
          operatingHours: { start: '10:00', end: '02:00' },
          features: ['real_time_tracking', 'scheduled_delivery', 'gulf_coverage']
        }
      }
    }
  ];

  for (const { name, updates } of providersToUpdate) {
    try {
      const provider = await prisma.deliveryProvider.findFirst({
        where: { name }
      });

      if (provider) {
        await prisma.deliveryProvider.update({
          where: { id: provider.id },
          data: {
            ...updates,
            updatedAt: new Date()
          }
        });
        console.log(`   ✅ Updated ${name} with multi-tenant configuration`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to update provider ${name}:`, error.message);
    }
  }

  const totalProviders = await prisma.deliveryProvider.count();
  console.log(`🎉 Delivery providers setup complete! Total providers: ${totalProviders}`);
  console.log('   📍 Jahez: Saudi Arabia & Gulf region');
  console.log('   📍 Deliveroo: UK, UAE, Europe');
  console.log('   📍 DHUB: Jordan');
  console.log('   📍 Careem: Middle East & North Africa');
  console.log('   📍 Talabat: Kuwait, UAE, Saudi, Qatar, Bahrain, Oman');
}

export default seedAdditionalDeliveryProviders;