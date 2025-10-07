import { PrismaService } from '../../shared/database/prisma.service';

export async function seedDeliveryZones(prisma: PrismaService) {
  console.log('🚛 Seeding delivery zones...');

  // First, let's get some sample branches to assign zones to
  const branches = await prisma.branch.findMany({
    take: 3,
    include: { company: true }
  });

  if (branches.length === 0) {
    console.log('⚠️  No branches found. Skipping delivery zones seeding.');
    return;
  }

  // Comprehensive Jordan delivery zones based on research
  const deliveryZones = [
    // Amman Central Areas - High Priority Zones
    {
      branchId: branches[0].id,
      zoneName: { 
        en: 'Downtown Amman', 
        ar: 'وسط عمان' 
      },
      deliveryFee: 2.50,
      minOrderAmount: 15.00,
      maxDeliveryTimeMins: 25,
      priorityLevel: 1,
      isActive: true,
      centerLat: 31.9539,
      centerLng: 35.9106,
      radius: 3.0
    },
    {
      branchId: branches[0].id,
      zoneName: { 
        en: 'Abdali Business District', 
        ar: 'منطقة العبدلي التجارية' 
      },
      deliveryFee: 3.00,
      minOrderAmount: 20.00,
      maxDeliveryTimeMins: 20,
      priorityLevel: 1,
      isActive: true,
      centerLat: 31.9628,
      centerLng: 35.9094,
      radius: 2.5
    },
    {
      branchId: branches[0].id,
      zoneName: { 
        en: 'Sweifieh Commercial', 
        ar: 'الصويفية التجاري' 
      },
      deliveryFee: 3.50,
      minOrderAmount: 18.00,
      maxDeliveryTimeMins: 30,
      priorityLevel: 2,
      isActive: true,
      centerLat: 31.9342,
      centerLng: 35.8756,
      radius: 4.0
    },
    
    // West Amman - Premium Residential
    {
      branchId: branches[0].id,
      zoneName: { 
        en: 'Jabal Amman Residential', 
        ar: 'جبل عمان السكني' 
      },
      deliveryFee: 4.00,
      minOrderAmount: 25.00,
      maxDeliveryTimeMins: 35,
      priorityLevel: 2,
      isActive: true,
      centerLat: 31.9515,
      centerLng: 35.9239,
      radius: 3.5
    },
    {
      branchId: branches[0].id,
      zoneName: { 
        en: 'Shmeisani Business', 
        ar: 'الشميساني التجاري' 
      },
      deliveryFee: 3.00,
      minOrderAmount: 20.00,
      maxDeliveryTimeMins: 25,
      priorityLevel: 1,
      isActive: true,
      centerLat: 31.9606,
      centerLng: 35.9035,
      radius: 2.0
    },

    // East Amman - Traditional Areas  
    {
      branchId: branches.length > 1 ? branches[1].id : branches[0].id,
      zoneName: { 
        en: 'Zarqa Industrial', 
        ar: 'الزرقاء الصناعي' 
      },
      deliveryFee: 5.00,
      minOrderAmount: 15.00,
      maxDeliveryTimeMins: 45,
      priorityLevel: 3,
      isActive: true,
      centerLat: 32.0728,
      centerLng: 36.0880,
      radius: 6.0
    },
    {
      branchId: branches.length > 1 ? branches[1].id : branches[0].id,
      zoneName: { 
        en: 'Marka Airport Area', 
        ar: 'منطقة مطار ماركا' 
      },
      deliveryFee: 4.50,
      minOrderAmount: 20.00,
      maxDeliveryTimeMins: 40,
      priorityLevel: 3,
      isActive: true,
      centerLat: 31.9722,
      centerLng: 35.9928,
      radius: 4.5
    },

    // Northern Areas
    {
      branchId: branches.length > 2 ? branches[2].id : branches[0].id,
      zoneName: { 
        en: 'Jubeiha University Area', 
        ar: 'منطقة الجبيهة الجامعية' 
      },
      deliveryFee: 3.50,
      minOrderAmount: 12.00,
      maxDeliveryTimeMins: 35,
      priorityLevel: 2,
      isActive: true,
      centerLat: 32.0135,
      centerLng: 35.8715,
      radius: 3.0
    },

    // Southern Areas
    {
      branchId: branches.length > 2 ? branches[2].id : branches[0].id,
      zoneName: { 
        en: 'Airport Road Commercial', 
        ar: 'طريق المطار التجاري' 
      },
      deliveryFee: 4.00,
      minOrderAmount: 18.00,
      maxDeliveryTimeMins: 40,
      priorityLevel: 2,
      isActive: true,
      centerLat: 31.8975,
      centerLng: 35.9442,
      radius: 5.0
    },

    // Extended Coverage Areas
    {
      branchId: branches[0].id,
      zoneName: { 
        en: 'Salt Historic City', 
        ar: 'السلط المدينة التاريخية' 
      },
      deliveryFee: 6.00,
      minOrderAmount: 30.00,
      maxDeliveryTimeMins: 60,
      priorityLevel: 4,
      isActive: false, // Initially disabled for extended coverage
      centerLat: 32.0389,
      centerLng: 35.7278,
      radius: 3.0
    },

    // Additional Premium Areas
    {
      branchId: branches[0].id,
      zoneName: { 
        en: 'Wadi Saqra Residential', 
        ar: 'وادي صقرة السكني' 
      },
      deliveryFee: 4.50,
      minOrderAmount: 22.00,
      maxDeliveryTimeMins: 35,
      priorityLevel: 2,
      isActive: true,
      centerLat: 31.9700,
      centerLng: 35.8900,
      radius: 2.8
    },

    // University Areas
    {
      branchId: branches.length > 1 ? branches[1].id : branches[0].id,
      zoneName: { 
        en: 'Jordan University Area', 
        ar: 'منطقة الجامعة الأردنية' 
      },
      deliveryFee: 3.25,
      minOrderAmount: 14.00,
      maxDeliveryTimeMins: 30,
      priorityLevel: 2,
      isActive: true,
      centerLat: 32.0103,
      centerLng: 35.8729,
      radius: 2.5
    }
  ];

  try {
    console.log('Creating delivery zones...');
    
    for (const zone of deliveryZones) {
      const existing = await prisma.deliveryZone.findFirst({
        where: { 
          branchId: zone.branchId,
          zoneName: {
            equals: zone.zoneName
          }
        }
      });
      
      if (!existing) {
        await prisma.deliveryZone.create({
          data: {
            ...zone,
            zoneNameSlug: `${zone.zoneName.en.toLowerCase().replace(/\s+/g, '-')}-${zone.branchId.slice(-6)}`
          }
        });
        console.log(`✓ Created zone: ${zone.zoneName.en} (${zone.zoneName.ar}) - ${zone.deliveryFee} JOD`);
      }
    }

    console.log('✅ Delivery zones seed data created successfully!');
  } catch (error) {
    console.error('❌ Error seeding delivery zones:', error);
    throw error;
  }
}