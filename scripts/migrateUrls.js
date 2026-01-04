// Migration script to add missing Instamart and DMart URLs to categories_with_urls.json
const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, '../data/categories_with_urls.json');
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));

// Track changes
let addedUrls = {
    instamart: 0,
    dmart: 0
};

console.log('\n🔄 Starting URL Migration...\n');

// ========================================
// INSTAMART URL ADDITIONS
// ========================================

// Fruits & Vegetables
if (!categories["Fruits & Vegetables"].instamart) {
    categories["Fruits & Vegetables"].instamart = [];
}
const fruitsVegInstamart = [
    { name: "Fresh Vegetables", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Fresh%20Vegetables&storeId=1404643&offset=0&filterName=&taxonomyType=Speciality%20taxonomy%201&showAgeConsent=false" },
    { name: "Fresh Fruits", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Fresh%20Fruits&storeId=1404643&offset=0&filterName=&taxonomyType=Speciality%20taxonomy%201&showAgeConsent=false" }
];
categories["Fruits & Vegetables"].instamart = fruitsVegInstamart;
addedUrls.instamart += fruitsVegInstamart.length;

// Dairy, Bread & Eggs - Expand existing array
const dairyInstamart = [
    { name: "Dairy, Bread and Eggs", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy,%20Bread%20and%20Eggs&storeId=1404643&offset=0&filterName=&taxonomyType=Speciality%20taxonomy%201&showAgeConsent=false" },
    ...categories["Dairy, Bread & Eggs"].instamart,
    { name: "Batters and Chutneys", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac5&filterName=Batters+and+Chutneys&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1" },
    { name: "Dairy Alternatives", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac7&filterName=Dairy+Alternatives&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1" },
    { name: "Lassi and Buttermilk", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac8&filterName=Lassi+and+Buttermilk&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1" },
    { name: "Milkshakes and More", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac9&filterName=Milkshakes+and+More&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1" },
    { name: "Bakery", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6870b89db6c3fa00019319db&filterName=Bakery&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1" }
];
const originalDairyCount = categories["Dairy, Bread & Eggs"].instamart.length;
categories["Dairy, Bread & Eggs"].instamart = dairyInstamart;
addedUrls.instamart += (dairyInstamart.length - originalDairyCount);

// Continue with remaining categories...
console.log(`✅ Instamart URLs added: ${addedUrls.instamart}`);
console.log(`✅ DMart URLs added: ${addedUrls.dmart}`);

// Save updated file
fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
console.log('\n✅ Migration complete! Updated categories_with_urls.json\n');
