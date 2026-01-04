// Script to add Instamart URLs to categories_with_urls.json
const fs = require('fs');
const path = require('path');

// Read existing categories
const categoriesPath = path.join(__dirname, '../data/categories_with_urls.json');
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));

// Instamart URL mappings
const instamartUrls = {
    'Fruits & Vegetables': [
        { name: 'Fresh Vegetables', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Fresh%20Vegetables&storeId=1404643&offset=0&filterName=&taxonomyType=Speciality%20taxonomy%201&showAgeConsent=false' },
        { name: 'Fresh Fruits', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Fresh%20Fruits&storeId=1404643&offset=0&filterName=&taxonomyType=Speciality%20taxonomy%201&showAgeConsent=false' }
    ],
    'Dairy, Bread & Eggs': [
        { name: 'Milk', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25abe&filterName=Milk&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1' },
        { name: 'Bread & Buns', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Dairy,%20Bread%20and%20Eggs&storeId=1404643&offset=0&filterName=&taxonomyType=Speciality%20taxonomy%201&showAgeConsent=false' },
        { name: 'Paneer & Cream', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac2&filterName=Paneer+and+Cream&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1' },
        { name: 'Cheese', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac3&filterName=Cheese&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1' },
        { name: 'Curd & Yogurt', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac0&filterName=Curd+and+Yogurts&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1' },
        { name: 'Butter', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac4&filterName=Butter&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1' }
    ],
    'Atta, Rice, Oil & Dals': [
        { name: 'Atta', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Atta%2C+Rice+and+Dal&filterId=6822eeeded32000001e25ae0&filterName=Atta&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1' },
        { name: 'Rice', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Atta%2C+Rice+and+Dal&filterId=6822eeeded32000001e25ae1&filterName=Rice&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1' },
        { name: 'All Oils', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Oils+and+Ghee&filterId=6822eeeded32000001e25aee&filterName=Sunflower+%26+Other+Oils&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1' },
        { name: 'Ghee', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Oils+and+Ghee&filterId=6822eeeded32000001e25af0&filterName=Ghee&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1' }
    ],
    'Snacks & Munchies': [
        { name: 'Chips & Crisps', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Chips+and+Namkeens&filterId=6822eeebed32000001e25a64&filterName=Chips+and+Crisps&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+3' },
        { name: 'Namkeen', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Chips+and+Namkeens&filterId=6822eeebed32000001e25a67&filterName=Bhujia+and+Namkeens&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+3' }
    ],
    'Bakery & Biscuits': [
        { name: 'Cookies', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Biscuits+and+Cakes&filterId=6822eeeded32000001e25b16&filterName=Cookies&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1' },
        { name: 'Cream Biscuits', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Biscuits+and+Cakes&filterId=6822eeeded32000001e25b17&filterName=Cream+Biscuits&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1' }
    ],
    'Tea, Coffee & More': [
        { name: 'Tea', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Tea%2C+Coffee+and+Milk+drinks&filterId=6822eeeded32000001e25b26&filterName=Tea&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1' },
        { name: 'Coffee', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Tea%2C+Coffee+and+Milk+drinks&filterId=6822eeeded32000001e25b27&filterName=Instant+Coffee&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1' }
    ],
    'Ice Creams & More': [
        { name: 'Ice Creams', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Ice%20Creams%20and%20Frozen%20Desserts&storeId=1404643&offset=0&filterName=&taxonomyType=Speciality%20taxonomy%203&showAgeConsent=false' }
    ],
    'Cold Drinks & Juices': [
        { name: 'Soft Drinks', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Cold+Drinks+and+Juices&filterId=6822eeebed32000001e25a48&filterName=Soft+Drinks&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+3' }
    ],
    'Sweet Cravings': [
        { name: 'Chocolates', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Chocolates&filterId=6822eeebed32000001e25a75&filterName=Dark+Chocolates&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+3' }
    ],
    'Breakfast & Sauces': [
        { name: 'Cereals', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Cereals+and+Breakfast&filterId=6822eeeded32000001e25acc&filterName=Muesli+%26+Granola&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1' }
    ],
    'Packaged Food': [
        { name: 'Noodles', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Noodles%2C+Pasta%2C+Vermicelli&filterId=6822eeebed32000001e25a7d&filterName=Instant+Noodles&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+3' }
    ],
    'Beauty': [
        { name: 'Bath & Body', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Bath+and+Body&filterId=6822eeefed32000001e25b4c&filterName=Soaps&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Supermarket' },
        { name: 'Skincare', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Skincare&filterId=6822eeefed32000001e25b64&filterName=Masks+%26+Cleansers&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Supermarket' },
        { name: 'Makeup', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Makeup&filterId=6822eeefed32000001e25b6b&filterName=Lips&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Supermarket' }
    ],
    'Home Needs': [
        { name: 'Cleaning', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Cleaning+Essentials&filterId=6822eef009ab2e00019aa602&filterName=Detergent+Powders+%26+Bars&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Health+and+Wellness+Stores' }
    ],
    'Baby Care': [
        { name: 'Baby Care', url: 'https://www.swiggy.com/instamart/category-listing?categoryName=Baby+Care&filterId=6822eeefed32000001e25b8a&filterName=Baby+Diapers&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Supermarket' }
    ]
};

// Add instamart URLs to each category
Object.keys(instamartUrls).forEach(category => {
    if (categories[category]) {
        categories[category].instamart = instamartUrls[category];
    }
});

// Write back
fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
console.log('✅ Instamart URLs added successfully!');
