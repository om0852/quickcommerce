const fs = require('fs');
const path = require('path');

// Master categories provided by user
const MASTER_CATEGORIES = [
    'Fruits & Vegetables',
    'Dairy, Bread & Eggs',
    'Atta, Rice, Oil & Dals',
    'Masala, Dry Fruits & More',
    'Breakfast & Sauces',
    'Packaged Food',
    'Tea, Coffee & More',
    'Ice Creams & More',
    'Health & Wellness',
    'Sweet Cravings',
    'Cold Drinks & Juices',
    'Snacks & Munchies',
    'Bakery & Biscuits',
    'Home Needs',
    'School, Office & Stationery',
    'Baby Care',
    'Beauty',
    'Skincare',
    'Bath & Body',
    'Personal Care'
];

// Category mapping function - maps platform categories to master categories
function mapToMasterCategory(platformCategory, subCategory) {
    const category = platformCategory.toLowerCase();
    const sub = (subCategory || '').toLowerCase();

    // Fruits & Vegetables
    if (category.includes('fruit') || category.includes('vegetable') ||
        category.includes('veggies')) {
        return 'Fruits & Vegetables';
    }

    // Dairy, Bread & Eggs
    if (category.includes('dairy') || category.includes('bread') ||
        category.includes('egg') || category.includes('bakery') ||
        sub.includes('milk') || sub.includes('cheese') || sub.includes('paneer') ||
        sub.includes('butter') || sub.includes('curd') || sub.includes('yogurt')) {
        return 'Dairy, Bread & Eggs';
    }

    // Atta, Rice, Oil & Dals
    if (category.includes('atta') || category.includes('rice') ||
        category.includes('oil') || category.includes('dal') ||
        category.includes('cooking essentials') || category.includes('pulses') ||
        sub.includes('flour') || sub.includes('ghee') || sub.includes('besan')) {
        return 'Atta, Rice, Oil & Dals';
    }

    // Masala, Dry Fruits & More
    if (category.includes('masala') || category.includes('spice') ||
        category.includes('dry fruit') || sub.includes('dry fruit') ||
        sub.includes('dates') || sub.includes('seeds') || sub.includes('nuts')) {
        return 'Masala, Dry Fruits & More';
    }

    // Breakfast & Sauces
    if (category.includes('breakfast') || sub.includes('sauce') ||
        sub.includes('ketchup') || sub.includes('spread') ||
        sub.includes('honey') || sub.includes('cereal') || sub.includes('oats')) {
        return 'Breakfast & Sauces';
    }

    // Packaged Food
    if (category.includes('packaged') || sub.includes('noodles') ||
        sub.includes('pasta') || sub.includes('ready to cook') ||
        sub.includes('ready to eat') || sub.includes('pickle')) {
        return 'Packaged Food';
    }

    // Tea, Coffee & More
    if (category.includes('tea') || category.includes('coffee') ||
        category.includes('health drink') || sub.includes('tea') ||
        sub.includes('coffee')) {
        return 'Tea, Coffee & More';
    }

    // Ice Creams & More
    if (category.includes('ice cream') || sub.includes('ice cream') ||
        sub.includes('frozen') || category.includes('frozen food')) {
        return 'Ice Creams & More';
    }

    // Health & Wellness
    if (category.includes('health') || category.includes('wellness') ||
        sub.includes('organic') || sub.includes('health')) {
        return 'Health & Wellness';
    }

    // Sweet Cravings
    if (sub.includes('chocolate') || sub.includes('candy') ||
        sub.includes('sweet') || sub.includes('mithai') ||
        sub.includes('cake') || sub.includes('pastry')) {
        return 'Sweet Cravings';
    }

    // Cold Drinks & Juices
    if (category.includes('cold drink') || category.includes('juice') ||
        category.includes('beverage') || sub.includes('juice') ||
        sub.includes('soft drink') || sub.includes('water') ||
        sub.includes('energy drink')) {
        return 'Cold Drinks & Juices';
    }

    // Snacks & Munchies
    if (category.includes('munchies') || category.includes('snack') ||
        sub.includes('chips') || sub.includes('namkeen') ||
        sub.includes('popcorn') || sub.includes('nachos')) {
        return 'Snacks & Munchies';
    }

    // Bakery & Biscuits
    if (category.includes('biscuit') || category.includes('cookie') ||
        sub.includes('biscuit') || sub.includes('cookie') ||
        sub.includes('wafer') || sub.includes('rusk')) {
        return 'Bakery & Biscuits';
    }

    // Home Needs
    if (category.includes('home') || sub.includes('cleaner') ||
        sub.includes('detergent') || sub.includes('freshener') ||
        sub.includes('tissue') || sub.includes('pooja')) {
        return 'Home Needs';
    }

    // School, Office & Stationery
    if (category.includes('stationery') || category.includes('school') ||
        category.includes('office') || sub.includes('notebook') ||
        sub.includes('pen') || sub.includes('book')) {
        return 'School, Office & Stationery';
    }

    // Baby Care
    if (category.includes('baby') || category.includes('mom') ||
        sub.includes('diaper') || sub.includes('baby')) {
        return 'Baby Care';
    }

    // Beauty
    if (category.includes('beauty') || sub.includes('makeup') ||
        sub.includes('cosmetic') || sub.includes('nail') || sub.includes('lip')) {
        return 'Beauty';
    }

    // Skincare
    if (category.includes('skin care') || sub.includes('face cream') ||
        sub.includes('serum') || sub.includes('sunscreen') ||
        sub.includes('lotion') || sub.includes('moisturizer')) {
        return 'Skincare';
    }

    // Bath & Body
    if (sub.includes('bath') || sub.includes('body wash') ||
        sub.includes('shower') || sub.includes('soap') ||
        category.includes('bath & body')) {
        return 'Bath & Body';
    }

    // Personal Care
    if (category.includes('personal care') || sub.includes('hair') ||
        sub.includes('shampoo') || sub.includes('oral') ||
        sub.includes('grooming') || sub.includes('feminine')) {
        return 'Personal Care';
    }

    return 'Others'; // Default category for unmatched items
}

// Process Zepto data
function processZeptoData(data) {
    return data.map(item => ({
        platform: 'Zepto',
        mainCategory: item.mainCategory,
        category: item.category,
        subCategory: item.subCategory,
        url: item.url,
        masterCategory: mapToMasterCategory(item.category, item.subCategory)
    }));
}

// Process Jiomart data
function processJiomartData(data) {
    return data.map(item => ({
        platform: 'Jiomart',
        mainCategory: null,
        category: item.category,
        subCategory: item.subCategory,
        url: item.url,
        masterCategory: mapToMasterCategory(item.category, item.subCategory)
    }));
}

// Process DMart data
function processDMartData(data) {
    return data.map(item => ({
        platform: 'DMart',
        mainCategory: item.mainCategory,
        category: item.category,
        subCategory: null,
        url: item.url,
        masterCategory: mapToMasterCategory(item.category, item.category)
    }));
}

// Process Blinkit data (from TXT file)
function processBlinkitData(txtContent) {
    const lines = txtContent.split('\n');
    const results = [];

    // Skip header rows
    for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse markdown table format
        const parts = line.split('|').map(p => p.trim()).filter(p => p);
        if (parts.length >= 3) {
            const category = parts[0];
            const subCategory = parts[1];
            const url = parts[2].replace(/<|>/g, '');

            results.push({
                platform: 'Blinkit',
                mainCategory: null,
                category: category,
                subCategory: subCategory,
                url: url,
                masterCategory: mapToMasterCategory(category, subCategory)
            });
        }
    }

    return results;
}

// Main execution
async function main() {
    try {
        console.log('🚀 Starting category grouping process...\n');

        // Read all data files
        const zeptoData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/zepto_raw.json'), 'utf8'));
        const jiomartData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/jiomart_raw.json'), 'utf8'));
        const dmartData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/dmart_raw.json'), 'utf8'));
        const blinkitTxt = fs.readFileSync(path.join(__dirname, '../data/blinkit_raw.txt'), 'utf8');

        console.log('✅ All data files loaded successfully\n');

        // Process each platform's data
        const zeptoProcessed = processZeptoData(zeptoData);
        const jiomartProcessed = processJiomartData(jiomartData);
        const dmartProcessed = processDMartData(dmartData);
        const blinkitProcessed = processBlinkitData(blinkitTxt);

        console.log(`📊 Processed data:`);
        console.log(`   - Zepto: ${zeptoProcessed.length} items`);
        console.log(`   - Jiomart: ${jiomartProcessed.length} items`);
        console.log(`   - DMart: ${dmartProcessed.length} items`);
        console.log(`   - Blinkit: ${blinkitProcessed.length} items\n`);

        // Combine all data
        const allData = [
            ...zeptoProcessed,
            ...jiomartProcessed,
            ...dmartProcessed,
            ...blinkitProcessed
        ];

        // Group by master category
        const groupedData = {};
        MASTER_CATEGORIES.forEach(cat => {
            groupedData[cat] = {
                masterCategory: cat,
                platforms: {}
            };
        });

        // Add 'Others' category
        groupedData['Others'] = {
            masterCategory: 'Others',
            platforms: {}
        };

        // Organize data by master category and platform
        allData.forEach(item => {
            const masterCat = item.masterCategory;
            if (!groupedData[masterCat].platforms[item.platform]) {
                groupedData[masterCat].platforms[item.platform] = [];
            }
            groupedData[masterCat].platforms[item.platform].push({
                category: item.category,
                subCategory: item.subCategory,
                url: item.url
            });
        });

        // Write output
        const outputPath = path.join(__dirname, '../data/categories_grouped.json');
        fs.writeFileSync(outputPath, JSON.stringify(groupedData, null, 2));

        console.log(`✅ Grouped categories saved to: ${outputPath}\n`);

        // Print summary
        console.log('📋 Summary by Master Category:');
        Object.keys(groupedData).forEach(masterCat => {
            const platforms = Object.keys(groupedData[masterCat].platforms);
            const totalItems = platforms.reduce((sum, platform) => {
                return sum + groupedData[masterCat].platforms[platform].length;
            }, 0);

            if (totalItems > 0) {
                console.log(`   ${masterCat}: ${totalItems} items across ${platforms.length} platforms`);
            }
        });

        console.log('\n✨ Process completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { mapToMasterCategory };
