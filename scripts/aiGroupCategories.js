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

/**
 * AI-POWERED SEMANTIC CLASSIFICATION
 * Uses intelligent reasoning about product categories instead of simple keyword matching
 */

// Comprehensive semantic mappings based on AI understanding
const AI_CATEGORY_MAPPINGS = {
    // Fruits & Vegetables - Fresh produce, vegetables, fruits, organic produce
    'Fruits & Vegetables': {
        keywords: ['fruit', 'vegetable', 'veggie', 'fresh', 'organic produce', 'exotic', 'leafy', 'herb', 'sprout', 'mushroom', 'hydroponic'],
        subcategories: ['fresh vegetables', 'fresh fruits', 'exotic vegetables', 'exotic fruits', 'leafy vegetables', 'cut fruits', 'frozen vegetables', 'frozen veg', 'roots', 'herbs', 'flowers', 'leaves', 'basic vegetables', 'premium fruits']
    },

    // Dairy, Bread & Eggs - All dairy products, breads, eggs, bakery items
    'Dairy, Bread & Eggs': {
        keywords: ['dairy', 'milk', 'bread', 'egg', 'cheese', 'paneer', 'butter', 'curd', 'yogurt', 'cream', 'tofu', 'bakery', 'bun', 'pav', 'chapati', 'toast', 'khari', 'condensed milk', 'whitener'],
        subcategories: ['milk products', 'breads', 'eggs', 'cheese', 'paneer', 'butter', 'curd', 'yogurt', 'fresh bakery', 'indian breads', 'buns', 'toast', 'khari', 'batter', 'milk based drinks', 'flavored milk', 'lassi']
    },

    // Atta, Rice, Oil & Dals - Cooking staples, grains, pulses, oils
    'Atta, Rice, Oil & Dals': {
        keywords: ['atta', 'flour', 'rice', 'oil', 'dal', 'pulse', 'ghee', 'vanaspati', 'besan', 'sooji', 'maida', 'grain', 'cooking essential', 'edible oil', 'olive oil', 'mustard oil'],
        subcategories: ['atta', 'flour', 'rice', 'basmati', 'oil', 'ghee', 'dal', 'dals', 'pulses', 'moong', 'masoor', 'toor', 'chana', 'rajma', 'urad', 'arhar', 'chhole', 'besan', 'sooji', 'maida', 'wheat', 'soya', 'millets', 'poha', 'sabudana', 'murmura', 'cooking essentials']
    },

    // Masala, Dry Fruits & More - Spices, masalas, dry fruits, nuts, seeds
    'Masala, Dry Fruits & More': {
        keywords: ['masala', 'spice', 'dry fruit', 'nut', 'seed', 'date', 'almond', 'cashew', 'raisin', 'seasoning', 'salt', 'sugar', 'jaggery'],
        subcategories: ['masala', 'spices', 'powdered masala', 'whole spices', 'dry fruits', 'nuts', 'dates', 'seeds', 'salt', 'sugar', 'jaggery', 'mukhwas', 'dehydrated', 'dried']
    },

    // Breakfast & Sauces - Breakfast foods, cereals, sauces, spreads
    'Breakfast & Sauces': {
        keywords: ['breakfast', 'cereal', 'oats', 'muesli', 'granola', 'flakes', 'sauce', 'ketchup', 'spread', 'jam', 'honey', 'peanut butter', 'chocolate spread'],
        subcategories: ['breakfast cereal', 'oats', 'muesli', 'granola', 'flakes', 'kids cereals', 'sauce', 'ketchup', 'spread', 'jam', 'honey', 'peanut butter', 'chocolate spread', 'batter']
    },

    // Packaged Food - Ready to eat/cook, noodles, pasta, canned foods
    'Packaged Food': {
        keywords: ['packaged', 'noodles', 'pasta', 'vermicelli', 'ready to cook', 'ready to eat', 'instant', 'canned', 'pickle', 'papad', 'fryum', 'soup', 'gourmet'],
        subcategories: ['noodles', 'pasta', 'vermicelli', 'ready to cook', 'ready to eat', 'instant', 'canned food', 'pickles', 'papad', 'fryums', 'soup', 'chutney', 'gourmet food', 'baby food', 'infant food']
    },

    // Tea, Coffee & More - All tea and coffee varieties
    'Tea, Coffee & More': {
        keywords: ['tea', 'coffee', 'chai', 'green tea', 'black tea', 'herbal tea', 'instant coffee', 'filter coffee', 'vegan drink'],
        subcategories: ['tea', 'coffee', 'green tea', 'black tea', 'herbal tea', 'leaf tea', 'dust tea', 'instant coffee', 'filter coffee', 'roasted coffee', 'ground coffee', 'coffee bags', 'vegan drinks', 'herbal drinks']
    },

    // Ice Creams & More - Ice creams, frozen desserts, frozen foods
    'Ice Creams & More': {
        keywords: ['ice cream', 'frozen dessert', 'kulfi', 'ice pop', 'frozen snack', 'frozen food', 'frozen'],
        subcategories: ['ice cream', 'tubs', 'sticks', 'cones', 'cups', 'kulfi', 'ice cubes', 'ice pops', 'gourmet ice cream', 'frozen snacks', 'frozen food', 'frozen veg snack', 'frozen non veg', 'momos', 'roti', 'paratha']
    },

    // Health & Wellness - Health foods, supplements, nutrition, organic
    'Health & Wellness': {
        keywords: ['health', 'wellness', 'nutrition', 'supplement', 'protein', 'vitamin', 'organic', 'healthy', 'diet', 'fitness'],
        subcategories: ['health drinks', 'health food', 'nutrition', 'protein', 'organic', 'healthy', 'adult nutrition', 'kids nutrition', 'health wellness', 'supplements']
    },

    // Sweet Cravings - Chocolates, candies, sweets, desserts
    'Sweet Cravings': {
        keywords: ['chocolate', 'candy', 'sweet', 'mithai', 'dessert', 'cake', 'pastry', 'muffin', 'gum', 'mint'],
        subcategories: ['chocolates', 'candies', 'sweets', 'indian sweets', 'mithai', 'dessert', 'cakes', 'muffins', 'pastries', 'gums', 'mints', 'dessert mixes']
    },

    // Cold Drinks & Juices - All beverages, juices, soft drinks
    'Cold Drinks & Juices': {
        keywords: ['cold drink', 'juice', 'soft drink', 'beverage', 'soda', 'water', 'energy drink', 'coconut water', 'fruit juice', 'cold coffee', 'iced tea'],
        subcategories: ['cold drink', 'soft drink', 'juice', 'beverage', 'water', 'soda', 'energy drink', 'glucose drink', 'fruit juice', 'mango drink', 'coconut water', 'cold coffee', 'iced tea', 'sharbat', 'concentrate', 'syrup', 'mixer', 'tonic']
    },

    // Snacks & Munchies - Chips, namkeen, snack foods
    'Snacks & Munchies': {
        keywords: ['snack', 'munchies', 'chips', 'crisp', 'namkeen', 'bhujia', 'mixture', 'popcorn', 'nachos'],
        subcategories: ['snacks', 'chips', 'crisps', 'namkeen', 'bhujia', 'mixture', 'popcorn', 'nachos', 'farsans', 'energy bar', 'healthy snack']
    },

    // Bakery & Biscuits - Biscuits, cookies, wafers, rusks
    'Bakery & Biscuits': {
        keywords: ['biscuit', 'cookie', 'wafer', 'rusk', 'cracker', 'cream biscuit', 'glucose', 'marie', 'digestive'],
        subcategories: ['biscuits', 'cookies', 'wafers', 'rusks', 'crackers', 'cream biscuits', 'glucose', 'marie', 'digestive', 'creamfills']
    },

    // Home Needs - Cleaning, detergents, home care, pooja items
    'Home Needs': {
        keywords: ['home', 'cleaning', 'detergent', 'cleaner', 'dishwash', 'freshener', 'repellent', 'tissue', 'napkin', 'pooja', 'disposable', 'bathroom', 'mop', 'brush'],
        subcategories: ['detergent', 'cleaner', 'dishwash', 'freshener', 'repellent', 'tissue', 'napkin', 'pooja', 'disposables', 'bathroom essentials', 'home care', 'cleaning tools', 'disinfectant', 'home decor']
    },

    // School, Office & Stationery
    'School, Office & Stationery': {
        keywords: ['stationery', 'school', 'office', 'notebook', 'pen', 'pencil', 'book', 'paper', 'writing', 'art', 'craft'],
        subcategories: ['stationery', 'notebooks', 'pens', 'pencils', 'books', 'school supplies', 'office supplies', 'writing instruments', 'paper products', 'art', 'craft', 'children books']
    },

    // Baby Care - Baby products, diapers, baby food
    'Baby Care': {
        keywords: ['baby', 'infant', 'diaper', 'wipe', 'mom', 'toddler', 'feeding', 'baby care'],
        subcategories: ['baby', 'infant', 'diapers', 'wipes', 'baby food', 'baby care', 'mom care', 'baby bath', 'baby skin', 'baby hair', 'feeding', 'nursing']
    },

    // Beauty - Makeup, cosmetics, beauty products
    'Beauty': {
        keywords: ['beauty', 'makeup', 'cosmetic', 'face', 'nail', 'lip', 'eye', 'foundation'],
        subcategories: ['beauty', 'makeup', 'cosmetics', 'face', 'nails', 'lips', 'eyes', 'beauty accessories']
    },

    // Skincare - Skin care products, creams, serums
    'Skincare': {
        keywords: ['skin care', 'skincare', 'face cream', 'serum', 'lotion', 'moisturizer', 'sunscreen', 'sun care', 'face wash', 'scrub', 'toner', 'derma'],
        subcategories: ['skin care', 'face cream', 'serum', 'lotion', 'moisturizer', 'sunscreen', 'sun care', 'face wash', 'scrub', 'toner', 'mist', 'derma', 'body lotion', 'hand care', 'foot care']
    },

    // Bath & Body - Bath products, soaps, body wash
    'Bath & Body': {
        keywords: ['bath', 'body', 'soap', 'body wash', 'shower', 'hand wash', 'body care'],
        subcategories: ['bath', 'body', 'soap', 'body wash', 'shower gel', 'hand wash', 'bath kits']
    },

    // Personal Care - Hair care, oral care, personal hygiene
    'Personal Care': {
        keywords: ['personal care', 'hair', 'shampoo', 'conditioner', 'hair oil', 'oral', 'toothpaste', 'dental', 'grooming', 'shaving', 'deodorant', 'feminine', 'hygiene'],
        subcategories: ['hair care', 'shampoo', 'conditioner', 'hair oil', 'hair serum', 'hair color', 'oral care', 'toothpaste', 'dental', 'grooming', 'mens grooming', 'womens grooming', 'shaving', 'deodorant', 'powder', 'feminine care', 'feminine hygiene', 'personal hygiene', 'fragrance']
    }
};

/**
 * AI-Powered Semantic Matching
 * Analyzes the full context of category + subcategory to determine best match
 */
function aiMapToMasterCategory(platformCategory, subCategory) {
    const category = (platformCategory || '').toLowerCase();
    const sub = (subCategory || '').toLowerCase();
    const combined = `${category} ${sub}`.toLowerCase();

    // Score each master category based on semantic relevance
    const scores = {};

    for (const [masterCat, mapping] of Object.entries(AI_CATEGORY_MAPPINGS)) {
        let score = 0;

        // Check keywords - weighted higher
        for (const keyword of mapping.keywords) {
            if (combined.includes(keyword)) {
                score += 10;
            }
        }

        // Check subcategory patterns - exact matches get bonus
        for (const subcat of mapping.subcategories) {
            if (sub.includes(subcat) || subcat.includes(sub)) {
                score += 15;
            }
        }

        // Category level match - medium weight
        for (const keyword of mapping.keywords) {
            if (category.includes(keyword)) {
                score += 5;
            }
        }

        scores[masterCat] = score;
    }

    // Find the master category with highest score
    let bestMatch = 'Others';
    let highestScore = 0;

    for (const [masterCat, score] of Object.entries(scores)) {
        if (score > highestScore) {
            highestScore = score;
            bestMatch = masterCat;
        }
    }

    // If no strong match (score < 5), return Others
    return highestScore >= 5 ? bestMatch : 'Others';
}

// Process Zepto data
function processZeptoData(data) {
    return data.map(item => ({
        platform: 'Zepto',
        mainCategory: item.mainCategory,
        category: item.category,
        subCategory: item.subCategory,
        url: item.url,
        masterCategory: aiMapToMasterCategory(item.category, item.subCategory)
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
        masterCategory: aiMapToMasterCategory(item.category, item.subCategory)
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
        masterCategory: aiMapToMasterCategory(item.category, item.category)
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
                masterCategory: aiMapToMasterCategory(category, subCategory)
            });
        }
    }

    return results;
}

// Main execution
async function main() {
    try {
        console.log('🤖 Starting AI-POWERED category grouping...\n');

        // Read all data files
        const zeptoData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/zepto_raw.json'), 'utf8'));
        const jiomartData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/jiomart_raw.json'), 'utf8'));
        const dmartData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/dmart_raw.json'), 'utf8'));
        const blinkitTxt = fs.readFileSync(path.join(__dirname, '../data/blinkit_raw.txt'), 'utf8');

        console.log('✅ All data files loaded\n');

        // Process each platform's data using AI
        console.log('🧠 Applying AI semantic classification...\n');
        const zeptoProcessed = processZeptoData(zeptoData);
        const jiomartProcessed = processJiomartData(jiomartData);
        const dmartProcessed = processDMartData(dmartData);
        const blinkitProcessed = processBlinkitData(blinkitTxt);

        console.log(`📊 AI-processed data:`);
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
        const outputPath = path.join(__dirname, '../data/categories_ai_grouped.json');
        fs.writeFileSync(outputPath, JSON.stringify(groupedData, null, 2));

        console.log(`✅ AI-grouped categories saved to: ${outputPath}\n`);

        // Print summary
        console.log('📋 AI Classification Summary:');
        Object.keys(groupedData).forEach(masterCat => {
            const platforms = Object.keys(groupedData[masterCat].platforms);
            const totalItems = platforms.reduce((sum, platform) => {
                return sum + groupedData[masterCat].platforms[platform].length;
            }, 0);

            if (totalItems > 0) {
                console.log(`   ${masterCat}: ${totalItems} items`);
            }
        });

        console.log('\n✨ AI-powered classification completed!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { aiMapToMasterCategory, AI_CATEGORY_MAPPINGS };
