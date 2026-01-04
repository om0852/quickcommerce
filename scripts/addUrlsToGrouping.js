const fs = require('fs');
const path = require('path');

// User's grouped structure (without URLs)
const userGrouping = {
    "Fruits & Vegetables": {
        "zepto": [
            "Fruit & Vegetables - All",
            "Fruit & Vegetables - Fresh Vegetables",
            "Fruit & Vegetables - New Launches",
            "Fruit & Vegetables - Fresh Fruits",
            "Fruit & Vegetables - Exotics & Premium",
            "Fruit & Vegetables - Organics & Hydroponics",
            "Fruit & Vegetables - Leafy",
            "Fruit & Vegetables - Flowers & Leaves",
            "Fruit & Vegetables - Plants & Gardening",
            "Fruit & Vegetables - Cuts & Sprouts",
            "Fruit & Vegetables - Frozen Veggies"
        ],
        "blinkit": [
            "Vegetables & Fruits - Exotics & Premium",
            "Vegetables & Fruits - Freshly Cut & Sprouts",
            "Vegetables & Fruits - Gourmet Mushroom",
            "Vegetables & Fruits - Organic & Hydroponic",
            "Vegetables & Fruits - Combo Offer",
            "Vegetables & Fruits - Fruits",
            "Vegetables & Fruits - Flowers & Leaves",
            "Vegetables & Fruits - Fresh Juice & Dips",
            "Vegetables & Fruits - Frozen Indian Breads",
            "Vegetables & Fruits - Frozen Veg",
            "Vegetables & Fruits - Fresh Vegetables",
            "Vegetables & Fruits - Frozen Peas & Corn",
            "Vegetables & Fruits - Frozen Potato Snacks",
            "Vegetables & Fruits - Other Frozen Vegetables",
            "Vegetables & Fruits - Hydroponics",
            "Vegetables & Fruits - Leafies & Herbs",
            "Vegetables & Fruits - Other Frozen Snacks",
            "Organic & Gourmet - Veggies and Fruits"
        ],
        "jiomart": [
            "Fruits & Vegetables - Fresh Fruits",
            "Fruits & Vegetables - Basic Vegetables",
            "Fruits & Vegetables - Roots, Herbs & Others",
            "Fruits & Vegetables - Premium Fruits & Vegetables"
        ],
        "dmart": [
            "Fruits & Vegetables - Fruits",
            "Fruits & Vegetables - Vegetables",
            "Fruits & Vegetables - Frozen Vegetables",
            "Fruits & Vegetables - Exotic Vegetables",
            "Fruits & Vegetables - Exotic Fruits",
            "Fruits & Vegetables - Cut Fruits & Veggies",
            "Fruits & Vegetables - Leafy Vegetables",
            "Fruits & Vegetables - Sprouts"
        ]
    }
    // ... (truncated for brevity, but the full structure would be included)
};

// Read raw data files
const zeptoData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/zepto_raw.json'), 'utf8'));
const jiomartData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/jiomart_raw.json'), 'utf8'));
const dmartData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/dmart_raw.json'), 'utf8'));
const blinkitTxt = fs.readFileSync(path.join(__dirname, '../data/blinkit_raw.txt'), 'utf8');

// Create lookup maps for each platform
function createZeptoLookup() {
    const lookup = {};
    zeptoData.forEach(item => {
        const key = `${item.category} - ${item.subCategory}`;
        lookup[key] = item.url;
    });
    return lookup;
}

function createJiomartLookup() {
    const lookup = {};
    jiomartData.forEach(item => {
        const key = `${item.category} - ${item.subCategory}`;
        lookup[key] = item.url;
    });
    return lookup;
}

function createDMartLookup() {
    const lookup = {};
    dmartData.forEach(item => {
        // For DMart, mainCategory is not used in the key since it's redundant
        const key = item.mainCategory ? `${item.mainCategory} - ${item.category}` : item.category;
        lookup[key] = item.url;
    });
    return lookup;
}

function createBlinkitLookup() {
    const lookup = {};
    const lines = blinkitTxt.split('\n');

    for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split('|').map(p => p.trim()).filter(p => p);
        if (parts.length >= 3) {
            const category = parts[0];
            const subCategory = parts[1];
            const url = parts[2].replace(/<|>/g, '');
            const key = `${category} - ${subCategory}`;
            lookup[key] = url;
        }
    }

    return lookup;
}

// Create lookups
console.log('Creating URL lookups...\n');
const zeptoLookup = createZeptoLookup();
const jiomartLookup = createJiomartLookup();
const dmartLookup = createDMartLookup();
const blinkitLookup = createBlinkitLookup();

console.log(`Zepto URLs: ${Object.keys(zeptoLookup).length}`);
console.log(`Jiomart URLs: ${Object.keys(jiomartLookup).length}`);
console.log(`DMart URLs: ${Object.keys(dmartLookup).length}`);
console.log(`Blinkit URLs: ${Object.keys(blinkitLookup).length}\n`);

// Read the user's full grouping from the message (you'll need to paste it)
// For now, I'll create a template generator
const finalOutput = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/user_grouping_template.json'), 'utf8'));

// Add URLs to the structure
const withUrls = {};

Object.entries(finalOutput).forEach(([masterCategory, platforms]) => {
    withUrls[masterCategory] = {};

    Object.entries(platforms).forEach(([platform, categories]) => {
        withUrls[masterCategory][platform] = categories.map(categoryStr => {
            let url = null;

            switch (platform) {
                case 'zepto':
                    url = zeptoLookup[categoryStr];
                    break;
                case 'jiomart':
                    url = jiomartLookup[categoryStr];
                    break;
                case 'dmart':
                    url = dmartLookup[categoryStr];
                    break;
                case 'blinkit':
                    url = blinkitLookup[categoryStr];
                    break;
            }

            return {
                name: categoryStr,
                url: url || "URL_NOT_FOUND"
            };
        });
    });
});

// Write output
const outputPath = path.join(__dirname, '../data/categories_with_urls.json');
fs.writeFileSync(outputPath, JSON.stringify(withUrls, null, 2));

console.log(`✅ Categories with URLs saved to: ${outputPath}`);

// Show sample
console.log('\nSample output (Fruits & Vegetables - Zepto):');
console.log(JSON.stringify(withUrls["Fruits & Vegetables"]["zepto"].slice(0, 3), null, 2));

module.exports = { zeptoLookup, jiomartLookup, dmartLookup, blinkitLookup };
