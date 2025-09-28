import { PrismaService } from '../../database/prisma.service';

export async function seedCompleteDeliveryProviders(prisma: PrismaService) {
  console.log('🚚 Seeding complete delivery providers ecosystem...');

  const allDeliveryProviders = [
    // --- EXISTING ENHANCED ---
    {
      name: 'dhub',
      displayName: { en: 'DHUB', ar: 'دهوب' },
      apiBaseUrl: 'https://jordon.dhub.pro/',
      isActive: true,
      priority: 1, // Highest priority for Jordan
      supportedAreas: ['amman', 'zarqa', 'irbid', 'aqaba', 'salt', 'madaba'],
      avgDeliveryTime: 25,
      baseFee: 2.50,
      feePerKm: 0.75,
      maxDistance: 20.00,
      companyId: null,
      webhookUrl: null,
      configuration: {
        apiVersion: 'v1',
        region: 'jordan',
        currency: 'JOD',
        supportedPaymentMethods: ['cash', 'card'],
        operatingHours: { start: '08:00', end: '22:00' },
        endpoints: {
          createOffice: 'external/api/Offices/CreateOffice',
          createBranch: 'external/api/Branches/CreateBranch',
          validateDeliveryJob: 'external/api/Order/Validate',
          createDeliveryJob: 'external/api/Order/Create'
        },
        features: ['real_time_tracking', 'jordan_coverage', 'arabic_support', 'office_management']
      }
    },

    // --- TALABAT ECOSYSTEM (Multiple Configurations) ---
    {
      name: 'talabat',
      displayName: { en: 'Talabat', ar: 'طلبات' },
      apiBaseUrl: 'https://htalabatdelivery.ishbek.com/Delivery/',
      isActive: true,
      priority: 2,
      supportedAreas: ['kuwait', 'uae', 'saudi', 'qatar', 'bahrain', 'oman'],
      avgDeliveryTime: 30,
      baseFee: 1.00, // 1 KWD base
      feePerKm: 0.250, // 250 fils per km
      maxDistance: 25.00,
      companyId: null,
      webhookUrl: null,
      configuration: {
        apiVersion: 'v1',
        region: 'gulf_states',
        currency: 'KWD', // Kuwait Dinar (can be overridden per market)
        currencyByMarket: {
          'kuwait': 'KWD',
          'uae': 'AED', 
          'saudi': 'SAR',
          'qatar': 'QAR',
          'bahrain': 'BHD',
          'oman': 'OMR'
        },
        supportedPaymentMethods: ['cash', 'card', 'knet', 'talabat_wallet'],
        deliveryTypes: [
          'talabat_delivery', // Standard Talabat delivery
          'talabat_pay_at_vendor', // Pay at restaurant
          'talabat_pay_at_pickup' // Pay on pickup
        ],
        operatingHours: { start: '10:00', end: '02:00' },
        endpoints: {
          createOrder: 'CreateOrder',
          getFees: 'GetEstimatedFees',
          createCredentials: 'branch/Createtalabatcredentials',
          getCredentials: 'branch/GetTalabatBranchids',
          getRequestLog: 'Logs/GetTalabatMenuRequestLogByCompanyId',
          markOrderPrepared: 'AcceptOrder'
        },
        features: ['real_time_tracking', 'scheduled_delivery', 'gulf_coverage', 'multi_currency', 'credentials_management'],
        orderTypeMapping: {
          "66770d92-8516-4e85-af94-3153c7b834eb": "talabat", // Standard Talabat
        }
      }
    },

    // --- CAREEM ECOSYSTEM ---
    {
      name: 'careem',
      displayName: { en: 'Careem', ar: 'كريم' },
      apiBaseUrl: 'http://65.108.60.120:708/api/',
      isActive: true,
      priority: 3,
      supportedAreas: ['uae', 'saudi', 'egypt', 'pakistan', 'jordan', 'lebanon'],
      avgDeliveryTime: 28,
      baseFee: 5.00, // 5 AED
      feePerKm: 1.00,
      maxDistance: 30.00,
      companyId: null,
      webhookUrl: null,
      configuration: {
        apiVersion: 'v2',
        region: 'middle_east_africa',
        currency: 'AED',
        supportedPaymentMethods: ['cash', 'card', 'careem_wallet'],
        deliveryTypes: [
          'careem', // Standard Careem
          'careemnow' // Careem Now (express)
        ],
        operatingHours: { start: '24/7', end: '24/7' },
        endpoints: {
          getMenu: 'Menu/GetBranchMenuCareemmMap',
          createOrder: 'orders/create',
          trackOrder: 'orders/track'
        },
        features: ['real_time_tracking', 'premium_service', 'multi_region', '24_7_service'],
        orderTypeMapping: {
          "b8fe602c-9bf4-4c13-bcf1-4a84325992e2": "careemnow", // Careem Now
          "0c698066-ce70-483f-8da6-968465fd697a": "careem" // Regular Careem
        }
      }
    },

    {
      name: 'careemexpress',
      displayName: { en: 'Careem Express', ar: 'كريم إكسبريس' },
      apiBaseUrl: 'https://integration.ishbek.com/CareemNow/Api/',
      isActive: true,
      priority: 4,
      supportedAreas: ['dubai', 'abu_dhabi', 'riyadh', 'jeddah'],
      avgDeliveryTime: 15, // Express delivery
      baseFee: 8.00,
      feePerKm: 1.50,
      maxDistance: 15.00,
      companyId: null,
      webhookUrl: null,
      configuration: {
        apiVersion: 'v1',
        region: 'uae_saudi',
        currency: 'AED',
        supportedPaymentMethods: ['card', 'careem_wallet'],
        deliveryTypes: ['careemexpress'],
        operatingHours: { start: '08:00', end: '23:00' },
        endpoints: {
          createOrder: 'createOrder/branch/'
        },
        features: ['express_delivery', 'premium_service', 'card_only']
      }
    },

    // --- JAHEZ (Enhanced) ---
    {
      name: 'jahez',
      displayName: { en: 'Jahez', ar: 'جاهز' },
      apiBaseUrl: 'https://integration-api-staging.jahez.net',
      isActive: true,
      priority: 5,
      supportedAreas: ['riyadh', 'jeddah', 'dammam', 'mecca', 'medina'],
      avgDeliveryTime: 35,
      baseFee: 5.00,
      feePerKm: 1.50,
      maxDistance: 25.00,
      companyId: null,
      webhookUrl: 'food_aggregator/jahez/create-order',
      configuration: {
        apiVersion: 'v1',
        region: 'saudi_arabia',
        currency: 'SAR',
        supportedPaymentMethods: ['cash', 'card', 'wallet'],
        operatingHours: { start: '06:00', end: '23:59' },
        endpoints: {
          createOrder: 'api/orders/create',
          updateEvent: 'food_aggregator/jahez/update_event'
        },
        features: ['real_time_tracking', 'scheduled_delivery', 'arabic_support']
      }
    },

    // --- DELIVEROO (Enhanced) ---
    {
      name: 'deliveroo',
      displayName: { en: 'Deliveroo', ar: 'ديليفيرو' },
      apiBaseUrl: 'https://api-sandbox.developers.deliveroo.com',
      isActive: true,
      priority: 6,
      supportedAreas: ['london', 'manchester', 'birmingham', 'dubai', 'abu_dhabi'],
      avgDeliveryTime: 30,
      baseFee: 2.49,
      feePerKm: 0.50,
      maxDistance: 15.00,
      companyId: null,
      webhookUrl: 'food_aggregator/delivaroo/set-order',
      configuration: {
        apiVersion: 'v1',
        region: 'international',
        currency: 'GBP',
        currencyByMarket: {
          'uk': 'GBP',
          'uae': 'AED',
          'france': 'EUR',
          'belgium': 'EUR'
        },
        supportedPaymentMethods: ['card', 'paypal', 'apple_pay', 'google_pay'],
        operatingHours: { start: '11:00', end: '23:00' },
        credentials: {
          username: '2d9evch7l3cnjjthi9515inp4u',
          clientSecret: '1dll310ddt9is56880km4g59cvhbmq3flg1plt726cs8keq2amp7',
          clientEncoding: 'MmQ5ZXZjaDdsM2Nuamp0aGk5NTE1aW5wNHU6MWRsbDMxMGRkdDlpczU2ODgwa200ZzU5Y3ZoYm1xM2ZsZzFwbHQ3MjZjczhrZXEyYW1wNw=='
        },
        oauth: {
          authUrl: 'https://auth-sandbox.developers.deliveroo.com',
          tokenUrl: 'https://auth-sandbox.developers.deliveroo.com/oauth/token',
          scope: 'read_orders write_orders'
        },
        features: ['oauth_integration', 'multi_currency', 'premium_service']
      }
    },

    // --- NEW LOCAL PROVIDERS ---
    {
      name: 'yallow',
      displayName: { en: 'Yallow', ar: 'يالو' },
      apiBaseUrl: 'https://integration.ishbek.com/Yallow/Api/',
      isActive: true,
      priority: 7,
      supportedAreas: ['amman', 'zarqa'], // Jordan local
      avgDeliveryTime: 40,
      baseFee: 3.00,
      feePerKm: 1.00,
      maxDistance: 18.00,
      companyId: null,
      webhookUrl: null,
      configuration: {
        apiVersion: 'v1',
        region: 'jordan_local',
        currency: 'JOD',
        supportedPaymentMethods: ['cash', 'card'],
        operatingHours: { start: '09:00', end: '21:00' },
        endpoints: {
          createOrder: 'createOrder/branch/'
        },
        features: ['local_delivery', 'jordan_focused']
      }
    },

    {
      name: 'jooddelivery',
      displayName: { en: 'Jood Delivery', ar: 'جود للتوصيل' },
      apiBaseUrl: 'https://integration.ishbek.com/JoodDelivery/Api',
      isActive: true,
      priority: 8,
      supportedAreas: ['riyadh', 'jeddah'],
      avgDeliveryTime: 45,
      baseFee: 6.00,
      feePerKm: 1.25,
      maxDistance: 20.00,
      companyId: null,
      webhookUrl: null,
      configuration: {
        apiVersion: 'v1',
        region: 'saudi_local',
        currency: 'SAR',
        supportedPaymentMethods: ['cash', 'card'],
        operatingHours: { start: '10:00', end: '22:00' },
        endpoints: {
          checkOrderEstimations: 'checkOrderEstimations/branch/',
          createOrder: 'createOrder/branch/',
          checkOrderStatus: 'checkOrderStatus/orderId/'
        },
        features: ['local_delivery', 'saudi_focused', 'order_estimation']
      }
    },

    {
      name: 'topdeliver',
      displayName: { en: 'Top Deliver', ar: 'توب ديليفر' },
      apiBaseUrl: 'https://integration.ishbek.com/TopDelivery/Api/',
      isActive: true,
      priority: 9,
      supportedAreas: ['kuwait', 'hawalli'],
      avgDeliveryTime: 50,
      baseFee: 1.50, // 1.5 KWD
      feePerKm: 0.500,
      maxDistance: 22.00,
      companyId: null,
      webhookUrl: null,
      configuration: {
        apiVersion: 'v1',
        region: 'kuwait_local',
        currency: 'KWD',
        supportedPaymentMethods: ['cash', 'card', 'knet'],
        operatingHours: { start: '09:00', end: '23:00' },
        endpoints: {
          checkOrderEstimations: 'checkOrderEstimations/branch/',
          createOrder: 'createOrder/branch/',
          checkOrderStatus: 'checkOrderStatus/orderId/'
        },
        features: ['local_delivery', 'kuwait_focused', 'knet_support']
      }
    },

    {
      name: 'nashmi',
      displayName: { en: 'Nashmi', ar: 'ناشمي' },
      apiBaseUrl: 'https://integration.ishbek.com/Nashmi/Nashmi',
      isActive: true,
      priority: 10,
      supportedAreas: ['doha', 'al_rayyan'],
      avgDeliveryTime: 55,
      baseFee: 5.00, // 5 QAR
      feePerKm: 2.00,
      maxDistance: 15.00,
      companyId: null,
      webhookUrl: null,
      configuration: {
        apiVersion: 'v1',
        region: 'qatar_local',
        currency: 'QAR',
        supportedPaymentMethods: ['cash', 'card'],
        operatingHours: { start: '10:00', end: '22:00' },
        endpoints: {
          getFees: 'checkPreorderEstimationsTime/branch/',
          createTask: 'createOrder/branch/'
        },
        features: ['local_delivery', 'qatar_focused', 'preorder_estimation']
      }
    },

    {
      name: 'tawasi',
      displayName: { en: 'Tawasi Delivery', ar: 'تواصي للتوصيل' },
      apiBaseUrl: 'https://integration.ishbek.com/Tawasi/Api/',
      isActive: true,
      priority: 11,
      supportedAreas: ['beirut', 'tripoli'],
      avgDeliveryTime: 60,
      baseFee: 4.00, // 4 USD equivalent
      feePerKm: 1.50,
      maxDistance: 12.00,
      companyId: null,
      webhookUrl: null,
      configuration: {
        apiVersion: 'v1',
        region: 'lebanon_local',
        currency: 'LBP',
        supportedPaymentMethods: ['cash', 'card'],
        operatingHours: { start: '11:00', end: '21:00' },
        endpoints: {
          createOrder: 'createOrder/branch/'
        },
        features: ['local_delivery', 'lebanon_focused']
      }
    },

    // --- SPECIAL DELIVERY TYPES ---
    {
      name: 'delivergy',
      displayName: { en: 'Delivergy', ar: 'ديليفرجي' },
      apiBaseUrl: 'https://integration.ishbek.com/Delivergy/Api/',
      isActive: true,
      priority: 12,
      supportedAreas: ['multi_region'],
      avgDeliveryTime: 35,
      baseFee: 3.50,
      feePerKm: 1.00,
      maxDistance: 25.00,
      companyId: null,
      webhookUrl: null,
      configuration: {
        apiVersion: 'v1',
        region: 'multi_regional',
        currency: 'USD', // Multi-currency support
        supportedPaymentMethods: ['cash', 'card'],
        deliveryTypes: ['standard_delivery', 'express_delivery'],
        operatingHours: { start: '08:00', end: '23:00' },
        features: ['combined_service', 'multi_region_support'],
        orderTypeMapping: {
          "ffda8ae8-9d11-4f48-8095-64876c21e5d6": "delivergy"
        }
      }
    },

    {
      name: 'utrac',
      displayName: { en: 'U-Trac Logistics', ar: 'يو تراك' },
      apiBaseUrl: 'https://integration.ishbek.com/UTrac/Api/',
      isActive: true,
      priority: 13,
      supportedAreas: ['logistics_tracking'],
      avgDeliveryTime: 45,
      baseFee: 2.00,
      feePerKm: 0.75,
      maxDistance: 50.00,
      companyId: null,
      webhookUrl: null,
      configuration: {
        apiVersion: 'v1',
        region: 'logistics',
        currency: 'USD',
        supportedPaymentMethods: ['cash', 'card'],
        operatingHours: { start: '24/7', end: '24/7' },
        features: ['logistics_tracking', 'bulk_delivery', 'tracking_service'],
        orderTypeMapping: {
          "5d6b3235-eb0f-456f-82df-e981703f601e": "utrac"
        }
      }
    },

    {
      name: 'local_delivery',
      displayName: { en: 'Local Delivery', ar: 'التوصيل المحلي' },
      apiBaseUrl: null, // No external API
      isActive: true,
      priority: 14,
      supportedAreas: ['restaurant_managed'],
      avgDeliveryTime: 30,
      baseFee: 1.50,
      feePerKm: 0.50,
      maxDistance: 10.00,
      companyId: null,
      webhookUrl: null,
      configuration: {
        apiVersion: 'internal',
        region: 'restaurant_managed',
        currency: 'variable', // Depends on restaurant location
        supportedPaymentMethods: ['cash', 'card', 'pay_at_vendor', 'pay_at_pickup'],
        deliveryTypes: [
          'local_delivery',
          'pay_at_vendor',
          'pay_at_pickup'
        ],
        operatingHours: { start: 'restaurant_hours', end: 'restaurant_hours' },
        features: ['restaurant_managed', 'flexible_payment', 'local_coverage']
      }
    }
  ];

  console.log(`📦 Creating ${allDeliveryProviders.length} delivery providers...`);

  for (const provider of allDeliveryProviders) {
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
            companyId: provider.companyId,
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

  const totalProviders = await prisma.deliveryProvider.count();
  console.log(`\n🎉 Complete delivery ecosystem setup! Total providers: ${totalProviders}`);
  
  console.log('\n🌍 REGIONAL COVERAGE:');
  console.log('   🇯🇴 Jordan: DHUB, Yallow, Local Delivery');
  console.log('   🇸🇦 Saudi Arabia: Jahez, Jood Delivery, Talabat, Careem');
  console.log('   🇰🇼 Kuwait: Talabat, Top Deliver');
  console.log('   🇦🇪 UAE: Talabat, Careem, Careem Express, Deliveroo');
  console.log('   🇶🇦 Qatar: Talabat, Nashmi');
  console.log('   🇧🇭 Bahrain: Talabat');
  console.log('   🇴🇲 Oman: Talabat');
  console.log('   🇱🇧 Lebanon: Tawasi, Careem');
  console.log('   🇬🇧 UK: Deliveroo');
  console.log('   🌐 Multi-Regional: Delivergy, U-Trac');
  
  console.log('\n💳 PAYMENT METHODS SUPPORTED:');
  console.log('   💰 Cash: All providers');
  console.log('   💳 Card: All providers'); 
  console.log('   🏪 Pay at Vendor: Talabat, Local Delivery');
  console.log('   📦 Pay at Pickup: Talabat, Local Delivery');
  console.log('   🔄 Digital Wallets: Careem, Talabat, Jahez');
  console.log('   🇰🇼 KNET: Talabat (Kuwait), Top Deliver');
}

export default seedCompleteDeliveryProviders;