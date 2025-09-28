#!/usr/bin/env node

/**
 * Cleanup Duplicate Global Locations Script
 * Removes duplicate locations while preserving the newest entries
 */

const { Client } = require('pg');

// Database connection
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'E$$athecode006'
});

async function cleanupDuplicates() {
  try {
    console.log('🧹 Starting duplicate cleanup process...');
    await client.connect();

    // Find and remove duplicates, keeping the most recent entry for each unique combination
    const deleteQuery = `
      DELETE FROM global_locations
      WHERE id NOT IN (
        SELECT DISTINCT ON (country_name, city_name, area_name, area_name_ar) id
        FROM global_locations
        ORDER BY country_name, city_name, area_name, area_name_ar, created_at DESC
      )
    `;

    const result = await client.query(deleteQuery);
    console.log(`✅ Removed ${result.rowCount} duplicate locations`);

    // Get final counts
    const totalResult = await client.query('SELECT COUNT(*) as total FROM global_locations');
    const totalCount = parseInt(totalResult.rows[0].total);

    const countryBreakdown = await client.query(`
      SELECT country_name, COUNT(*) as count
      FROM global_locations
      GROUP BY country_name
      ORDER BY count DESC
    `);

    console.log(`\n📊 Final Results After Cleanup:`);
    console.log(`Total locations: ${totalCount}`);
    console.log(`\nBreakdown by country:`);
    countryBreakdown.rows.forEach(row => {
      console.log(`  ${row.country_name}: ${row.count} locations`);
    });

    // Verify no more duplicates exist
    const duplicateCheck = await client.query(`
      SELECT country_name, city_name, area_name, area_name_ar, COUNT(*) as duplicates
      FROM global_locations
      GROUP BY country_name, city_name, area_name, area_name_ar
      HAVING COUNT(*) > 1
    `);

    if (duplicateCheck.rows.length === 0) {
      console.log(`\n✅ All duplicates successfully removed!`);
    } else {
      console.log(`\n⚠️ Warning: ${duplicateCheck.rows.length} duplicate sets still remain`);
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupDuplicates()
    .then(() => {
      console.log('\n🎉 Duplicate cleanup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupDuplicates };