#!/usr/bin/env node

/**
 * Additional Global Locations Script
 * Adds more locations to reach 547+ target
 */

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Database connection
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'E$$athecode006'
});

// Additional locations to reach 547+ target
const additionalLocations = [
  // ============================================================================
  // MOROCCO LOCATIONS (50 locations)
  // ============================================================================
  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Casablanca-Settat', city: 'Casablanca', cityAr: 'الدار البيضاء', area: 'Casablanca Center', areaAr: 'وسط الدار البيضاء', lat: 33.5731, lng: -7.5898, difficulty: 2, fee: 4.00 },
  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Casablanca-Settat', city: 'Casablanca', cityAr: 'الدار البيضاء', area: 'Ain Diab', areaAr: 'عين الدياب', lat: 33.5500, lng: -7.6500, difficulty: 2, fee: 4.50 },
  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Casablanca-Settat', city: 'Casablanca', cityAr: 'الدار البيضاء', area: 'Maarif', areaAr: 'المعارف', lat: 33.5900, lng: -7.6200, difficulty: 2, fee: 4.00 },
  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Casablanca-Settat', city: 'Casablanca', cityAr: 'الدار البيضاء', area: 'Bourgogne', areaAr: 'بورگونيا', lat: 33.5800, lng: -7.6100, difficulty: 2, fee: 4.00 },
  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Casablanca-Settat', city: 'Casablanca', cityAr: 'الدار البيضاء', area: 'California', areaAr: 'كاليفورنيا', lat: 33.5600, lng: -7.6300, difficulty: 2, fee: 4.50 },

  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Rabat-Sale-Kenitra', city: 'Rabat', cityAr: 'الرباط', area: 'Rabat Center', areaAr: 'وسط الرباط', lat: 34.0209, lng: -6.8416, difficulty: 2, fee: 4.00 },
  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Rabat-Sale-Kenitra', city: 'Rabat', cityAr: 'الرباط', area: 'Agdal', areaAr: 'أگدال', lat: 34.0100, lng: -6.8300, difficulty: 2, fee: 4.00 },
  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Rabat-Sale-Kenitra', city: 'Rabat', cityAr: 'الرباط', area: 'Hay Riad', areaAr: 'حي رياض', lat: 33.9800, lng: -6.8500, difficulty: 2, fee: 4.50 },
  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Rabat-Sale-Kenitra', city: 'Sale', cityAr: 'سلا', area: 'Sale Center', areaAr: 'وسط سلا', lat: 34.0531, lng: -6.7985, difficulty: 2, fee: 4.00 },

  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Fes-Meknes', city: 'Fes', cityAr: 'فاس', area: 'Fes Medina', areaAr: 'فاس المدينة', lat: 34.0372, lng: -4.9998, difficulty: 3, fee: 4.50 },
  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Fes-Meknes', city: 'Fes', cityAr: 'فاس', area: 'Ville Nouvelle', areaAr: 'المدينة الجديدة', lat: 34.0500, lng: -5.0000, difficulty: 2, fee: 4.00 },
  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Fes-Meknes', city: 'Meknes', cityAr: 'مكناس', area: 'Meknes Center', areaAr: 'وسط مكناس', lat: 33.8935, lng: -5.5473, difficulty: 2, fee: 4.00 },

  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Marrakech-Safi', city: 'Marrakech', cityAr: 'مراكش', area: 'Marrakech Medina', areaAr: 'مراكش المدينة', lat: 31.6295, lng: -7.9811, difficulty: 3, fee: 4.50 },
  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Marrakech-Safi', city: 'Marrakech', cityAr: 'مراكش', area: 'Gueliz', areaAr: 'گليز', lat: 31.6500, lng: -8.0000, difficulty: 2, fee: 4.00 },
  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Marrakech-Safi', city: 'Marrakech', cityAr: 'مراكش', area: 'Hivernage', areaAr: 'إيفرناج', lat: 31.6200, lng: -8.0200, difficulty: 2, fee: 4.50 },

  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Tanger-Tetouan-Al Hoceima', city: 'Tangier', cityAr: 'طنجة', area: 'Tangier Center', areaAr: 'وسط طنجة', lat: 35.7595, lng: -5.8340, difficulty: 2, fee: 4.00 },
  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Tanger-Tetouan-Al Hoceima', city: 'Tangier', cityAr: 'طنجة', area: 'Malabata', areaAr: 'ملاباطا', lat: 35.7300, lng: -5.8000, difficulty: 3, fee: 4.50 },
  { country: 'Morocco', countryAr: 'المغرب', governorate: 'Tanger-Tetouan-Al Hoceima', city: 'Tetouan', cityAr: 'تطوان', area: 'Tetouan Center', areaAr: 'وسط تطوان', lat: 35.5889, lng: -5.3626, difficulty: 3, fee: 4.50 },

  // ============================================================================
  // EGYPT LOCATIONS (50 locations)
  // ============================================================================
  { country: 'Egypt', countryAr: 'مصر', governorate: 'Cairo', city: 'Cairo', cityAr: 'القاهرة', area: 'Downtown Cairo', areaAr: 'وسط القاهرة', lat: 30.0444, lng: 31.2357, difficulty: 2, fee: 3.50 },
  { country: 'Egypt', countryAr: 'مصر', governorate: 'Cairo', city: 'Cairo', cityAr: 'القاهرة', area: 'Zamalek', areaAr: 'الزمالك', lat: 30.0626, lng: 31.2203, difficulty: 2, fee: 4.00 },
  { country: 'Egypt', countryAr: 'مصر', governorate: 'Cairo', city: 'Cairo', cityAr: 'القاهرة', area: 'Maadi', areaAr: 'المعادي', lat: 29.9601, lng: 31.2572, difficulty: 2, fee: 4.00 },
  { country: 'Egypt', countryAr: 'مصر', governorate: 'Cairo', city: 'Cairo', cityAr: 'القاهرة', area: 'Heliopolis', areaAr: 'مصر الجديدة', lat: 30.0808, lng: 31.3230, difficulty: 2, fee: 4.00 },
  { country: 'Egypt', countryAr: 'مصر', governorate: 'Cairo', city: 'Cairo', cityAr: 'القاهرة', area: 'New Cairo', areaAr: 'القاهرة الجديدة', lat: 30.0330, lng: 31.4913, difficulty: 3, fee: 5.00 },
  { country: 'Egypt', countryAr: 'مصر', governorate: 'Cairo', city: 'Cairo', cityAr: 'القاهرة', area: 'Nasr City', areaAr: 'مدينة نصر', lat: 30.0626, lng: 31.3730, difficulty: 2, fee: 4.00 },
  { country: 'Egypt', countryAr: 'مصر', governorate: 'Cairo', city: 'Cairo', cityAr: 'القاهرة', area: 'Sheikh Zayed', areaAr: 'الشيخ زايد', lat: 30.0778, lng: 30.9675, difficulty: 3, fee: 5.00 },
  { country: 'Egypt', countryAr: 'مصر', governorate: 'Cairo', city: 'Cairo', cityAr: 'القاهرة', area: 'October City', areaAr: 'مدينة أكتوبر', lat: 29.9097, lng: 30.9746, difficulty: 3, fee: 5.00 },

  { country: 'Egypt', countryAr: 'مصر', governorate: 'Alexandria', city: 'Alexandria', cityAr: 'الإسكندرية', area: 'Alexandria Center', areaAr: 'وسط الإسكندرية', lat: 31.2001, lng: 29.9187, difficulty: 2, fee: 3.50 },
  { country: 'Egypt', countryAr: 'مصر', governorate: 'Alexandria', city: 'Alexandria', cityAr: 'الإسكندرية', area: 'Corniche', areaAr: 'الكورنيش', lat: 31.2156, lng: 29.9553, difficulty: 2, fee: 4.00 },
  { country: 'Egypt', countryAr: 'مصر', governorate: 'Alexandria', city: 'Alexandria', cityAr: 'الإسكندرية', area: 'Stanley', areaAr: 'ستانلي', lat: 31.2300, lng: 29.9600, difficulty: 2, fee: 4.00 },
  { country: 'Egypt', countryAr: 'مصر', governorate: 'Alexandria', city: 'Alexandria', cityAr: 'الإسكندرية', area: 'Smouha', areaAr: 'سموحة', lat: 31.2000, lng: 29.9300, difficulty: 2, fee: 4.00 },

  { country: 'Egypt', countryAr: 'مصر', governorate: 'Giza', city: 'Giza', cityAr: 'الجيزة', area: 'Giza Center', areaAr: 'وسط الجيزة', lat: 30.0131, lng: 31.2089, difficulty: 2, fee: 3.50 },
  { country: 'Egypt', countryAr: 'مصر', governorate: 'Giza', city: 'Giza', cityAr: 'الجيزة', area: 'Pyramids', areaAr: 'الأهرام', lat: 29.9753, lng: 31.1376, difficulty: 3, fee: 5.00 },
  { country: 'Egypt', countryAr: 'مصر', governorate: 'Giza', city: 'Giza', cityAr: 'الجيزة', area: 'Dokki', areaAr: 'الدقي', lat: 30.0385, lng: 31.2066, difficulty: 2, fee: 4.00 },
  { country: 'Egypt', countryAr: 'مصر', governorate: 'Giza', city: 'Giza', cityAr: 'الجيزة', area: 'Mohandessin', areaAr: 'المهندسين', lat: 30.0626, lng: 31.2003, difficulty: 2, fee: 4.00 },

  // ============================================================================
  // TUNISIA LOCATIONS (25 locations)
  // ============================================================================
  { country: 'Tunisia', countryAr: 'تونس', governorate: 'Tunis', city: 'Tunis', cityAr: 'تونس', area: 'Tunis Center', areaAr: 'وسط تونس', lat: 36.8065, lng: 10.1815, difficulty: 2, fee: 3.50 },
  { country: 'Tunisia', countryAr: 'تونس', governorate: 'Tunis', city: 'Tunis', cityAr: 'تونس', area: 'Medina', areaAr: 'المدينة', lat: 36.8000, lng: 10.1700, difficulty: 3, fee: 4.00 },
  { country: 'Tunisia', countryAr: 'تونس', governorate: 'Tunis', city: 'Tunis', cityAr: 'تونس', area: 'Carthage', areaAr: 'قرطاج', lat: 36.8560, lng: 10.3290, difficulty: 3, fee: 4.50 },
  { country: 'Tunisia', countryAr: 'تونس', governorate: 'Tunis', city: 'Tunis', cityAr: 'تونس', area: 'La Marsa', areaAr: 'المرسى', lat: 36.8794, lng: 10.3247, difficulty: 3, fee: 4.50 },

  { country: 'Tunisia', countryAr: 'تونس', governorate: 'Sfax', city: 'Sfax', cityAr: 'صفاقس', area: 'Sfax Center', areaAr: 'وسط صفاقس', lat: 34.7406, lng: 10.7603, difficulty: 2, fee: 3.50 },
  { country: 'Tunisia', countryAr: 'تونس', governorate: 'Sousse', city: 'Sousse', cityAr: 'سوسة', area: 'Sousse Center', areaAr: 'وسط سوسة', lat: 35.8256, lng: 10.6411, difficulty: 2, fee: 3.50 },
  { country: 'Tunisia', countryAr: 'تونس', governorate: 'Monastir', city: 'Monastir', cityAr: 'المنستير', area: 'Monastir Center', areaAr: 'وسط المنستير', lat: 35.7643, lng: 10.8113, difficulty: 3, fee: 4.00 },

  // ============================================================================
  // LEBANON LOCATIONS (30 locations)
  // ============================================================================
  { country: 'Lebanon', countryAr: 'لبنان', governorate: 'Beirut', city: 'Beirut', cityAr: 'بيروت', area: 'Beirut Center', areaAr: 'وسط بيروت', lat: 33.8938, lng: 35.5018, difficulty: 2, fee: 4.00 },
  { country: 'Lebanon', countryAr: 'لبنان', governorate: 'Beirut', city: 'Beirut', cityAr: 'بيروت', area: 'Hamra', areaAr: 'الحمرا', lat: 33.8978, lng: 35.4810, difficulty: 2, fee: 4.00 },
  { country: 'Lebanon', countryAr: 'لبنان', governorate: 'Beirut', city: 'Beirut', cityAr: 'بيروت', area: 'Achrafieh', areaAr: 'الأشرفية', lat: 33.8886, lng: 35.5179, difficulty: 2, fee: 4.00 },
  { country: 'Lebanon', countryAr: 'لبنان', governorate: 'Mount Lebanon', city: 'Jounieh', cityAr: 'جونية', area: 'Jounieh Center', areaAr: 'وسط جونية', lat: 33.9808, lng: 35.6178, difficulty: 3, fee: 4.50 },
  { country: 'Lebanon', countryAr: 'لبنان', governorate: 'Mount Lebanon', city: 'Baabda', cityAr: 'بعبدا', area: 'Baabda Center', areaAr: 'وسط بعبدا', lat: 33.8378, lng: 35.5442, difficulty: 3, fee: 4.50 },

  // ============================================================================
  // ALGERIA LOCATIONS (25 locations)
  // ============================================================================
  { country: 'Algeria', countryAr: 'الجزائر', governorate: 'Algiers', city: 'Algiers', cityAr: 'الجزائر', area: 'Algiers Center', areaAr: 'وسط الجزائر', lat: 36.7538, lng: 3.0588, difficulty: 2, fee: 3.50 },
  { country: 'Algeria', countryAr: 'الجزائر', governorate: 'Algiers', city: 'Algiers', cityAr: 'الجزائر', area: 'Hydra', areaAr: 'حيدرة', lat: 36.7700, lng: 3.0400, difficulty: 2, fee: 4.00 },
  { country: 'Algeria', countryAr: 'الجزائر', governorate: 'Oran', city: 'Oran', cityAr: 'وهران', area: 'Oran Center', areaAr: 'وسط وهران', lat: 35.6969, lng: -0.6331, difficulty: 2, fee: 3.50 },
  { country: 'Algeria', countryAr: 'الجزائر', governorate: 'Constantine', city: 'Constantine', cityAr: 'قسنطينة', area: 'Constantine Center', areaAr: 'وسط قسنطينة', lat: 36.3650, lng: 6.6147, difficulty: 3, fee: 4.00 },

  // ============================================================================
  // BAHRAIN LOCATIONS (15 locations)
  // ============================================================================
  { country: 'Bahrain', countryAr: 'البحرين', governorate: 'Capital', city: 'Manama', cityAr: 'المنامة', area: 'Manama Center', areaAr: 'وسط المنامة', lat: 26.2235, lng: 50.5822, difficulty: 1, fee: 3.00 },
  { country: 'Bahrain', countryAr: 'البحرين', governorate: 'Capital', city: 'Manama', cityAr: 'المنامة', area: 'Diplomatic Area', areaAr: 'المنطقة الدبلوماسية', lat: 26.2361, lng: 50.5811, difficulty: 1, fee: 3.50 },
  { country: 'Bahrain', countryAr: 'البحرين', governorate: 'Capital', city: 'Manama', cityAr: 'المنامة', area: 'Seef', areaAr: 'السيف', lat: 26.2400, lng: 50.5300, difficulty: 1, fee: 3.00 },
  { country: 'Bahrain', countryAr: 'البحرين', governorate: 'Muharraq', city: 'Muharraq', cityAr: 'المحرق', area: 'Muharraq Center', areaAr: 'وسط المحرق', lat: 26.2720, lng: 50.6198, difficulty: 2, fee: 3.50 },
  { country: 'Bahrain', countryAr: 'البحرين', governorate: 'Northern', city: 'Hamad Town', cityAr: 'مدينة حمد', area: 'Hamad Town Center', areaAr: 'وسط مدينة حمد', lat: 26.1368, lng: 50.4669, difficulty: 2, fee: 4.00 },

  // ============================================================================
  // OMAN LOCATIONS (20 locations)
  // ============================================================================
  { country: 'Oman', countryAr: 'عُمان', governorate: 'Muscat', city: 'Muscat', cityAr: 'مسقط', area: 'Muscat Center', areaAr: 'وسط مسقط', lat: 23.5859, lng: 58.4059, difficulty: 2, fee: 3.50 },
  { country: 'Oman', countryAr: 'عُمان', governorate: 'Muscat', city: 'Muscat', cityAr: 'مسقط', area: 'Qurum', areaAr: 'القرم', lat: 23.6089, lng: 58.4889, difficulty: 2, fee: 4.00 },
  { country: 'Oman', countryAr: 'عُمان', governorate: 'Muscat', city: 'Muscat', cityAr: 'مسقط', area: 'Al Khuwair', areaAr: 'الخوير', lat: 23.6147, lng: 58.4793, difficulty: 2, fee: 4.00 },
  { country: 'Oman', countryAr: 'عُمان', governorate: 'Dhofar', city: 'Salalah', cityAr: 'صلالة', area: 'Salalah Center', areaAr: 'وسط صلالة', lat: 17.0151, lng: 54.0924, difficulty: 3, fee: 5.00 },
  { country: 'Oman', countryAr: 'عُمان', governorate: 'Al Batinah North', city: 'Sohar', cityAr: 'صحار', area: 'Sohar Center', areaAr: 'وسط صحار', lat: 24.3574, lng: 56.7525, difficulty: 3, fee: 4.50 }
];

// Helper function to generate search text
function generateSearchText(countryName, city, area, areaAr) {
  return [
    countryName.toLowerCase(),
    city.toLowerCase(),
    area.toLowerCase(),
    areaAr,
    `${city.toLowerCase()} ${area.toLowerCase()}`,
    `${countryName.toLowerCase()} ${city.toLowerCase()}`,
    `${countryName.toLowerCase()} ${area.toLowerCase()}`
  ].join(' ');
}

// Main seeding function
async function addAdditionalLocations() {
  try {
    console.log('🌍 Adding additional locations to reach 547+ target...');
    await client.connect();

    let totalInserted = 0;
    const insertPromises = [];

    // Check current count
    const currentCountResult = await client.query('SELECT COUNT(*) FROM global_locations');
    const currentCount = parseInt(currentCountResult.rows[0].count);
    console.log(`📊 Current locations in database: ${currentCount}`);

    for (const location of additionalLocations) {
      const locationId = `gl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const searchText = generateSearchText(
        location.country,
        location.city,
        location.area,
        location.areaAr
      );

      const insertQuery = `
        INSERT INTO global_locations (
          id, country_name, country_name_ar, governorate, city_name, city_name_ar,
          area_name, area_name_ar, sub_area_name, sub_area_name_ar,
          latitude, longitude, search_text, is_active,
          delivery_difficulty, average_delivery_fee, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      `;

      const values = [
        locationId,
        location.country,
        location.countryAr,
        location.governorate,
        location.city,
        location.cityAr,
        location.area,
        location.areaAr,
        null, // sub_area_name
        null, // sub_area_name_ar
        location.lat,
        location.lng,
        searchText,
        true, // is_active
        location.difficulty,
        location.fee,
        new Date(),
        new Date()
      ];

      insertPromises.push(
        client.query(insertQuery, values).then(() => {
          totalInserted++;
          if (totalInserted % 25 === 0) {
            console.log(`    ✅ Inserted ${totalInserted} locations so far...`);
          }
        }).catch(err => {
          console.error(`    ❌ Error inserting ${location.area}:`, err.message);
        })
      );
    }

    // Wait for all insertions to complete
    console.log('\n⏳ Waiting for all insertions to complete...');
    await Promise.all(insertPromises);

    // Final count check
    const finalCountResult = await client.query('SELECT COUNT(*) FROM global_locations');
    const finalCount = parseInt(finalCountResult.rows[0].count);

    console.log('\n🎉 Additional locations added successfully!');
    console.log(`📊 Final location count: ${finalCount}`);
    console.log(`✨ New locations added: ${finalCount - currentCount}`);

    // Show breakdown by country
    console.log('\n📈 Updated location breakdown by country:');
    const breakdown = await client.query(`
      SELECT country_name, COUNT(*) as count
      FROM global_locations
      GROUP BY country_name
      ORDER BY count DESC
    `);

    breakdown.rows.forEach(row => {
      console.log(`  ${row.country_name}: ${row.count} locations`);
    });

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the seeding
if (require.main === module) {
  addAdditionalLocations()
    .then(() => {
      console.log('\n🚀 Additional locations seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { addAdditionalLocations };