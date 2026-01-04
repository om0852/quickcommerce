const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data/categories_with_urls.json', 'utf8'));

let total = 0;
let byPlatform = {
    zepto: 0,
    blinkit: 0,
    jiomart: 0,
    dmart: 0
};

Object.entries(data).forEach(([masterCat, platforms]) => {
    Object.entries(platforms).forEach(([platform, items]) => {
        total += items.length;
        if (byPlatform[platform] !== undefined) {
            byPlatform[platform] += items.length;
        }
    });
});

console.log('📊 Total URL Count Analysis\n');
console.log(`✅ Total URLs: ${total}\n`);

console.log('By Platform:');
Object.entries(byPlatform).forEach(([platform, count]) => {
    console.log(`  ${platform.padEnd(10)}: ${count} URLs`);
});

console.log('\n📋 By Master Category:');
Object.entries(data).forEach(([cat, platforms]) => {
    const count = Object.values(platforms).reduce((sum, items) => sum + items.length, 0);
    if (count > 0) {
        console.log(`  ${cat}: ${count} URLs`);
    }
});
