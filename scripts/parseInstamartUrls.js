// Script to parse and organize Instamart URLs by category
const fs = require('fs');
const path = require('path');

// Raw URLs provided by user (organized by Instamart category name)
const instamartUrls = {
    "Fruits & Vegetables": [
        { name: "Fresh Vegetables", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Fresh%20Vegetables&storeId=1404643&offset=0&filterName=&taxonomyType=Speciality%20taxonomy%201&showAgeConsent=false" },
        { name: "Fresh Fruits", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Fresh%20Fruits&storeId=1404643&offset=0&filterName=&taxonomyType=Speciality%20taxonomy%201&showAgeConsent=false" }
    ],
    "Dairy, Bread & Eggs": [
        { name: "Dairy, Bread and Eggs", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy,%20Bread%20and%20Eggs&storeId=1404643&offset=0&filterName=&taxonomyType=Speciality%20taxonomy%201&showAgeConsent=false" },
        { name: "Milk", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25abe&filterName=Milk&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1" },
        { name: "Paneer and Cream", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac2&filterName=Paneer+and+Cream&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1" },
        { name: "Cheese", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac3&filterName=Cheese&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1" },
        { name: "Batters and Chutneys", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac5&filterName=Batters+and+Chutneys&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1" },
        { name: "Curd and Yogurts", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac0&filterName=Curd+and+Yogurts&offset=0&showAgeConsent=false&storeId=140464 3&taxonomyType=Speciality+taxonomy+1" },
        { name: "Butter", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac4&filterName=Butter&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1" },
        { name: "Indian Breads", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac6&filterName=Indian+Breads&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1" },
        { name: "Dairy Alternatives", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac7&filterName=Dairy+Alternatives&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1" },
        { name: "Lassi and Buttermilk", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac8&filterName=Lassi+and+Buttermilk&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1" },
        { name: "Milkshakes and More", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6822eeeded32000001e25ac9&filterName=Milkshakes+and+More&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1" },
        { name: "Bakery", url: "https://www.swiggy.com/instamart/category-listing?categoryName=Dairy%2C+Bread+and+Eggs&filterId=6870b89db6c3fa00019319db&filterName=Bakery&offset=0&showAgeConsent=false&storeId=1404643&taxonomyType=Speciality+taxonomy+1" }
    ],
    // ... more categories would be added here
};

console.log('Instamart URL Categories:');
Object.keys(instamartUrls).forEach(category => {
    console.log(`\n${category}: ${instamartUrls[category].length} URLs`);
});
