const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, 'app/utils/categories_with_urls.json');
const blinkitPath = path.join(__dirname, 'app/utils/original_blinkit_category.json');
const jiomartPath = path.join(__dirname, 'app/utils/original_jiomart_category.json');
// Using data/zepto_raw.json because app/utils/original_zepto_category.json is empty
const zeptoPath = path.join(__dirname, 'data/zepto_raw.json');

try {
    console.log('Reading files...');
    const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
    const blinkitData = JSON.parse(fs.readFileSync(blinkitPath, 'utf8'));
    const jiomartData = JSON.parse(fs.readFileSync(jiomartPath, 'utf8'));
    const zeptoData = JSON.parse(fs.readFileSync(zeptoPath, 'utf8'));

    // Create lookup maps
    const blinkitMap = new Map();
    blinkitData.forEach(item => {
        if (item.url) blinkitMap.set(item.url.trim(), { category: item.category, subcategory: item.subcategory });
    });

    const jiomartMap = new Map();
    jiomartData.forEach(item => {
        if (item.url) jiomartMap.set(item.url.trim(), { category: item.category, subcategory: item.subcategory });
    });

    const zeptoMap = new Map();
    zeptoData.forEach(item => {
        if (item.url) zeptoMap.set(item.url.trim(), { category: item.category, subcategory: item.subCategory });
    });

    console.log(`Loaded mappings: Blinkit (${blinkitMap.size}), Jiomart (${jiomartMap.size}), Zepto (${zeptoMap.size})`);

    let updateCount = 0;

    // Update categories
    for (const masterCategory in categoriesData) {
        const platforms = categoriesData[masterCategory];

        if (platforms.blinkit) {
            platforms.blinkit.forEach(item => {
                const url = item.url ? item.url.trim() : '';
                const match = blinkitMap.get(url);
                if (match) {
                    item.officialCategory = match.category;
                    item.officialSubCategory = match.subcategory;
                    updateCount++;
                } else {
                    if (updateCount < 5) console.log('No match for Blinkit URL:', url);
                }
            });
        }

        if (platforms.jiomart) {
            platforms.jiomart.forEach(item => {
                const url = item.url ? item.url.trim() : '';
                const match = jiomartMap.get(url);
                if (match) {
                    item.officialCategory = match.category;
                    item.officialSubCategory = match.subcategory;
                    updateCount++;
                } else {
                    if (updateCount < 5) console.log('No match for Jiomart URL:', url);
                }
            });
        }

        if (platforms.zepto) {
            platforms.zepto.forEach(item => {
                const url = item.url ? item.url.trim() : '';
                const match = zeptoMap.get(url);
                if (match) {
                    item.officialCategory = match.category;
                    item.officialSubCategory = match.subcategory;
                    updateCount++;
                } else {
                    if (updateCount < 5) console.log('No match for Zepto URL:', url);
                }
            });
        }
    }

    fs.writeFileSync(categoriesPath, JSON.stringify(categoriesData, null, 2));
    console.log(`Successfully updated categories_with_urls.json. Total updates: ${updateCount}`);
    fs.writeFileSync('d:/creatosaurus-intership/quickcommerce/success.txt', `Successfully updated categories_with_urls.json. Total updates: ${updateCount}`);

} catch (error) {
    console.error('Error updating categories:', error);
    fs.writeFileSync('d:/creatosaurus-intership/quickcommerce/error.txt', 'Error updating categories: ' + error.toString());
}
