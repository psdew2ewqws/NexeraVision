const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Read the Picolinate location data
    const picolinateData = JSON.parse(
      fs.readFileSync('/home/admin/Downloads/Picolinate/services/app/wwwroot/arupdated17_5_2022.json', 'utf8')
    );

    console.log(`Found ${picolinateData.Sheet1.length} locations in Picolinate data`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const location of picolinateData.Sheet1) {
      try {
        // Check if this location already exists
        const existing = await prisma.globalLocation.findFirst({
          where: {
            AND: [
              { areaNameAr: location.areaname },
              { city: location.cityname },
              { subAreaNameAr: location.subareaname }
            ]
          }
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Create new location
        await prisma.globalLocation.create({
          data: {
            countryName: 'Jordan',
            countryNameAr: 'الأردن',
            governorate: 'Amman', // Most locations in the data are in Amman
            city: location.cityname,
            cityNameAr: location.cityname,
            area: location.areaname, // English transliteration
            areaNameAr: location.areaname,
            subArea: location.subareaname,
            subAreaNameAr: location.subareaname,
            latitude: null,
            longitude: null,
            searchText: `${location.subareaname} ${location.areaname} ${location.cityname}`,
            isActive: true,
            deliveryDifficulty: 2,
            averageDeliveryFee: '2.5'
          }
        });

        imported++;

        if (imported % 50 === 0) {
          console.log(`Imported ${imported} locations so far...`);
        }

      } catch (error) {
        console.error(`Error importing location ${location.subareaname}:`, error.message);
        errors++;
      }
    }

    console.log(`\nImport completed:`);
    console.log(`- Imported: ${imported} new locations`);
    console.log(`- Skipped: ${skipped} existing locations`);
    console.log(`- Errors: ${errors} failed imports`);

    // Get updated count
    const totalCount = await prisma.globalLocation.count();
    console.log(`\nTotal locations in database: ${totalCount}`);

  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();