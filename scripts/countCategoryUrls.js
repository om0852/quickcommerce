// Script to count total URLs in categories_with_urls.json
const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, '../data/categories_with_urls.json');
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));

let totalUrls = 0;
const platformCounts = {
    zepto: 0,
    blinkit: 0,
    jiomart: 0,
    dmart: 0,
    instamart: 0
};

const categoryBreakdown = {};

console.log('\n📊 Category URL Analysis\n');
console.log('='.repeat(80));

Object.entries(categories).forEach(([categoryName, platforms]) => {
    let categoryTotal = 0;
    const platformData = {};

    Object.entries(platforms).forEach(([platform, urls]) => {
        const count = urls.length;
        categoryTotal += count;
        totalUrls += count;
        platformCounts[platform] += count;
        platformData[platform] = count;
    });

    categoryBreakdown[categoryName] = {
        total: categoryTotal,
        platforms: platformData
    };

    console.log(`\n📁 ${categoryName}`);
    console.log(`   Total: ${categoryTotal} URLs`);
    Object.entries(platformData).forEach(([platform, count]) => {
        const emoji = count === 0 ? '⚠️' : '✅';
        console.log(`   ${emoji} ${platform.padEnd(10)}: ${count}`);
    });
});

console.log('\n' + '='.repeat(80));
console.log('\n📈 SUMMARY\n');
console.log(`Total Categories: ${Object.keys(categories).length}`);
console.log(`Total URLs: ${totalUrls}\n`);

console.log('Platform Breakdown:');
Object.entries(platformCounts).forEach(([platform, count]) => {
    console.log(`  ${platform.padEnd(10)}: ${count} URLs`);
});

console.log('\n' + '='.repeat(80));

// Export data for potential use
const analysis = {
    totalCategories: Object.keys(categories).length,
    totalUrls,
    platformCounts,
    categoryBreakdown
};

const outputPath = path.join(__dirname, '../data/category_url_analysis.json');
fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
console.log(`\n✅ Analysis saved to: ${outputPath}\n`);
