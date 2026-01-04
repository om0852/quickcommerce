
import { getUrlsGroupedByCategory } from './local-scraper-service/utils/categoryLoader.js';

console.log('Verifying category configuration for "Bath & Body"...');

try {
    const categoriesGrouped = getUrlsGroupedByCategory();

    // Filter logic mirroring server.js
    for (const key of Object.keys(categoriesGrouped)) {
        if (!key.toLowerCase().includes('bath & body')) {
            delete categoriesGrouped[key];
        }
    }

    const categoryNames = Object.keys(categoriesGrouped);
    console.log(`Found ${categoryNames.length} categories matching filter.`);

    if (categoryNames.length === 0) {
        console.error('❌ Error: No "Bath & Body" category found!');
        process.exit(1);
    }

    const bathAndBodyUrls = categoriesGrouped['Bath & Body'];
    if (!bathAndBodyUrls) {
        // It might be named slightly differently, let's check
        console.log('Categories found:', categoryNames);
        if (!categoryNames.some(c => c.includes('Bath & Body'))) {
            console.error('❌ Error: "Bath & Body" key not found in filtered results.');
            process.exit(1);
        }
    } else {
        console.log(`✅ "Bath & Body" category found with ${bathAndBodyUrls.length} URLs.`);

        let validCount = 0;
        let missingFields = 0;

        bathAndBodyUrls.forEach((item, index) => {
            if (item.officialCategory && item.officialSubCategory) {
                validCount++;
            } else {
                missingFields++;
                console.warn(`⚠️ Item ${index} (${item.subCategory}) missing official fields.`);
            }
        });

        console.log(`\nVerification Results:`);
        console.log(`- Total Items: ${bathAndBodyUrls.length}`);
        console.log(`- Valid Items (with official fields): ${validCount}`);
        console.log(`- Items Missing Fields: ${missingFields}`);

        if (missingFields === 0 && validCount > 0) {
            console.log('\n✅ SUCCESS: All "Bath & Body" items have official category fields.');
        } else {
            console.error('\n❌ FAILURE: Some items are missing official category fields.');
            process.exit(1);
        }
    }

} catch (error) {
    console.error('An error occurred during verification:', error);
    process.exit(1);
}
