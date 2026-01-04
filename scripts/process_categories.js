const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'categories_dataset.json');

// Helper to read file safely
function readFile(filename) {
    try {
        return fs.readFileSync(path.join(DATA_DIR, filename), 'utf8');
    } catch (error) {
        console.error(`Error reading ${filename}:`, error.message);
        return null;
    }
}

// 1. Parser for Blinkit (Markdown Table)
function parseBlinkit(content) {
    if (!content) return [];
    const lines = content.split('\n');
    const results = [];

    for (const line of lines) {
        // Look for lines that start with | and aren't headers/separators
        if (!line.trim().startsWith('|') || line.includes('---')) continue;

        const parts = line.split('|').map(p => p.trim()).filter(p => p);
        if (parts.length < 3) continue;

        // Header check
        if (parts[0].toLowerCase() === 'category') continue;

        const [category, subCategory, linkPart] = parts;
        // Extract URL from <url> format if present
        const linkMatch = linkPart.match(/<([^>]+)>/) || [null, linkPart];

        results.push({
            platform: 'blinkit',
            originalCategory: category,
            originalSubCategory: subCategory,
            url: linkMatch[1]
        });
    }
    return results;
}

// 2. Parser for Jiomart (JSON)
function parseJiomart(content) {
    if (!content) return [];
    try {
        const data = JSON.parse(content);
        return data.map(item => ({
            platform: 'jiomart',
            originalCategory: item.category,
            originalSubCategory: item.subCategory,
            url: item.url
        }));
    } catch (e) {
        console.error('Error parsing Jiomart JSON:', e);
        return [];
    }
}

// 3. Parser for DMart (JSON)
function parseDMart(content) {
    if (!content) return [];
    try {
        const data = JSON.parse(content);
        // DMart structure: { mainCategory, category, url }
        // We treat 'category' as subCategory for consistency
        return data.map(item => ({
            platform: 'dmart',
            originalCategory: item.mainCategory,
            originalSubCategory: item.category,
            url: item.url
        }));
    } catch (e) {
        console.error('Error parsing DMart JSON:', e);
        return [];
    }
}

// 4. Parser for Zepto (JSON)
function parseZepto(content) {
    if (!content) return [];
    try {
        const data = JSON.parse(content);
        // Zepto structure: { mainCategory, category, subCategory, url }
        return data.map(item => ({
            platform: 'zepto',
            originalCategory: item.category, // Using 'category' as main group often better
            originalSubCategory: item.subCategory,
            url: item.url
        }));
    } catch (e) {
        console.error('Error parsing Zepto JSON:', e);
        return [];
    }
}

// Master Categories Definition
const MASTER_CATEGORIES = [
    { id: 'vegetables-fruits', name: 'Vegetables & Fruits', keywords: ['vegetable', 'fruit', 'mango', 'coconut', 'flower'] },
    { id: 'dairy-bread-eggs', name: 'Dairy, Bread & Eggs', keywords: ['dairy', 'milk', 'bread', 'butter', 'cheese', 'curd', 'yogurt', 'paneer', 'cream', 'egg', 'bun', 'pav', 'toast'] },
    { id: 'bakery-biscuits', name: 'Bakery & Biscuits', keywords: ['bakery', 'biscuit', 'cookie', 'rusk', 'cake', 'muffin', 'khari'] },
    { id: 'atta-rice-dal', name: 'Atta, Rice & Dal', keywords: ['atta', 'rice', 'dal', 'pulse', 'flour', 'sooji', 'maida', 'besan', 'grain', 'oil', 'ghee', 'sugar', 'salt', 'jaggery'] },
    { id: 'masala-oil', name: 'Masala, Oil & More', keywords: ['masala', 'spice', 'oil', 'ghee', 'dry fruit', 'nut', 'seed'] },
    { id: 'sweet-cravings', name: 'Sweet Cravings', keywords: ['chocolate', 'candy', 'sweet', 'dessert', 'ice cream', 'frozen'] },
    { id: 'snacks-munchies', name: 'Snacks & Munchies', keywords: ['chip', 'namkeen', 'snack', 'popcorn', 'nacho', 'bhujia', 'papad', 'fryum'] },
    { id: 'cold-drinks-juices', name: 'Cold Drinks & Juices', keywords: ['drink', 'juice', 'soda', 'coke', 'pepsi', 'beverage', 'squash', 'syrup', 'water', 'energy'] },
    { id: 'tea-coffee', name: 'Tea, Coffee & Health Drinks', keywords: ['tea', 'coffee', 'health drink', 'bournvita', 'horlicks'] },
    { id: 'personal-care', name: 'Personal Care', keywords: ['shampoo', 'soap', 'body', 'face', 'skin', 'hair', 'oral', 'care', 'grooming', 'deo', 'perfume', 'hygiene', 'wash'] },
    { id: 'baby-care', name: 'Baby Care', keywords: ['baby', 'diaper', 'wipe', 'kid'] },
    { id: 'home-office', name: 'Home & Office', keywords: ['home', 'office', 'stationery', 'clean', 'detergent', 'dishwash', 'repellent', 'freshener', 'kitchen', 'pet', 'toy', 'game', 'party'] }, // Catch-all often
];

function normalizeCategory(item) {
    const categoryLower = item.originalCategory.toLowerCase();
    const subCategoryLower = item.originalSubCategory.toLowerCase();

    // First, try to match based on the originalCategory field directly
    // This prevents misclassification when subcategory has misleading keywords

    // Check for exact or strong partial matches in originalCategory
    if (categoryLower.includes('cold drink') || categoryLower.includes('juice') || categoryLower.includes('beverage')) {
        return MASTER_CATEGORIES.find(c => c.id === 'cold-drinks-juices');
    }
    if (categoryLower.includes('tea') || categoryLower.includes('coffee')) {
        return MASTER_CATEGORIES.find(c => c.id === 'tea-coffee');
    }
    if (categoryLower.includes('vegetable') || categoryLower.includes('fruit')) {
        return MASTER_CATEGORIES.find(c => c.id === 'vegetables-fruits');
    }
    if (categoryLower.includes('dairy') || categoryLower.includes('bread')) {
        return MASTER_CATEGORIES.find(c => c.id === 'dairy-bread-eggs');
    }
    if (categoryLower.includes('bakery') || categoryLower.includes('biscuit')) {
        return MASTER_CATEGORIES.find(c => c.id === 'bakery-biscuits');
    }
    if (categoryLower.includes('masala') || (categoryLower.includes('oil') && !categoryLower.includes('toil'))) {
        return MASTER_CATEGORIES.find(c => c.id === 'masala-oil');
    }
    if (categoryLower.includes('atta') || categoryLower.includes('rice') || categoryLower.includes('dal') || categoryLower.includes('flour') || categoryLower.includes('grain')) {
        return MASTER_CATEGORIES.find(c => c.id === 'atta-rice-dal');
    }
    if (categoryLower.includes('munchie') || categoryLower.includes('snack')) {
        return MASTER_CATEGORIES.find(c => c.id === 'snacks-munchies');
    }
    if (categoryLower.includes('chocolate') || categoryLower.includes('candy') || categoryLower.includes('ice cream') || categoryLower.includes('frozen')) {
        return MASTER_CATEGORIES.find(c => c.id === 'sweet-cravings');
    }
    if (categoryLower.includes('personal care') || categoryLower.includes('beauty')) {
        return MASTER_CATEGORIES.find(c => c.id === 'personal-care');
    }
    if (categoryLower.includes('baby') || categoryLower.includes('mom')) {
        return MASTER_CATEGORIES.find(c => c.id === 'baby-care');
    }
    if (categoryLower.includes('home') || categoryLower.includes('office') || categoryLower.includes('stationery')) {
        return MASTER_CATEGORIES.find(c => c.id === 'home-office');
    }

    // Fallback to keyword matching on combined text
    const text = `${categoryLower} ${subCategoryLower}`;

    for (const cat of MASTER_CATEGORIES) {
        if (cat.keywords.some(k => text.includes(k))) {
            return cat;
        }
    }

    return { id: 'other', name: 'Other' };
}

async function main() {
    console.log('Reading files...');

    const blinkitRaw = readFile('blinkit_raw.txt');
    const jiomartRaw = readFile('jiomart_raw.json');
    const dmartRaw = readFile('dmart_raw.json');
    const zeptoRaw = readFile('zepto_raw.json');

    let allItems = [];

    allItems.push(...parseBlinkit(blinkitRaw));
    allItems.push(...parseJiomart(jiomartRaw));
    allItems.push(...parseDMart(dmartRaw));
    allItems.push(...parseZepto(zeptoRaw));

    console.log(`Total items parsed: ${allItems.length}`);

    // Grouping
    const groupedData = {};

    // Initialize groups
    MASTER_CATEGORIES.forEach(c => {
        groupedData[c.id] = {
            id: c.id,
            name: c.name,
            items: []
        };
    });
    groupedData['other'] = { id: 'other', name: 'Other', items: [] };

    allItems.forEach(item => {
        const masterCat = normalizeCategory(item);
        // Determine the standardized subcategory name (using original sub for now, but could be normalized too)
        // We group by "normalized" category, but keep the specific details

        // Standardize "Vegetables & Fruits" to "Fruits & Vegetables" to fix platform inconsistency
        if (item.originalCategory === 'Vegetables & Fruits' || item.originalCategory === 'Fruit & Vegetables') {
            item.originalCategory = 'Fruits & Vegetables';
        }

        groupedData[masterCat.id].items.push({
            platform: item.platform,
            originalCategory: item.originalCategory,
            subCategory: item.originalSubCategory,
            url: item.url
        });
    });

    // Transform to array
    const output = Object.values(groupedData).filter(g => g.items.length > 0);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`Successfully wrote ${output.length} categories to ${OUTPUT_FILE}`);
}

main();
