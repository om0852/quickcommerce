// Script to parse and organize DMart URLs
const fs = require('fs');
const path = require('path');

const dmartUrlsRaw = `
https://www.dmart.in/category/dals-aesc-dals
https://www.dmart.in/category/pulses-aesc-pulses3
https://www.dmart.in/category/dry-fruits-aesc-dryfruits2
https://www.dmart.in/category/dmart-grocery-aesc-grocerycore2
https://www.dmart.in/category/cooking-oil-aesc-cookingoil
https://www.dmart.in/category/ghee---vanaspati-aesc-gheeandvanaspati
https://www.dmart.in/category/flours---grains-aesc-floursandgrains4
https://www.dmart.in/category/rice---rice-products-aesc-riceandriceproducts4
https://www.dmart.in/category/masala---spices-aesc-masalaandspices4
https://www.dmart.in/category/beverages-aesc-beverages
https://www.dmart.in/category/dairy-aesc-dairy
https://www.dmart.in/category/fresh-fruits-aesc-freshfruits
https://www.dmart.in/category/vegetables-aesc-vegetables
https://www.dmart.in/category/frozen-vegetable
https://www.dmart.in/category/exotic-vegetables-aesc-exoticvegetables
https://www.dmart.in/category/exotic-fruits-aesc-exoticfruits
https://www.dmart.in/category/cut-fruits-veggies
https://www.dmart.in/category/leafy-vegetables-215008--1
https://www.dmart.in/category/sprouts-215009--1
https://www.dmart.in/category/biscuits---cookies-aesc-biscuitsandcookies
https://www.dmart.in/category/snacks---farsans-aesc-snacksandfarsans
https://www.dmart.in/category/breakfast-cereals-aesc-breakfastcereals
https://www.dmart.in/category/chocolates---candies
https://www.dmart.in/category/ketchup---sauce-aesc-ketchupandsauces
https://www.dmart.in/category/jams---spreads-aesc-jamsandspreads
https://www.dmart.in/category/pasta---noodles-aesc-pastaandnoodles
https://www.dmart.in/category/ready-to-cook-aesc-readytocook
https://www.dmart.in/category/gourmet-food
https://www.dmart.in/category/sweets-aesc-sweets
https://www.dmart.in/category/pickles-aesc-pickles
https://www.dmart.in/category/health-food-aesc-healthfood
https://www.dmart.in/category/mukhwas-aesc-mukhwas
https://www.dmart.in/category/bakery-aesc-bakery
https://www.dmart.in/category/canned-food-aesc-cannedfood
https://www.dmart.in/category/frozen-foods-aesc-frozenfoods
https://www.dmart.in/category/school-supplies
https://www.dmart.in/category/pens-pencils-more
https://www.dmart.in/category/notebooks-diaries-more
https://www.dmart.in/category/art-craft
https://www.dmart.in/category/general-stationery-216020--1
https://www.dmart.in/category/gift-bag-boxes
https://www.dmart.in/category/childrens-books-204006--1
https://www.dmart.in/category/skin-care-208510--1
https://www.dmart.in/category/make-up
https://www.dmart.in/category/bath-body
https://www.dmart.in/category/hair-care-208506--1
https://www.dmart.in/category/personal-hygiene-208509--1
https://www.dmart.in/category/oral-care-aesc-oralcare
https://www.dmart.in/category/mens-grooming-208508--1
https://www.dmart.in/category/fragrances
https://www.dmart.in/category/health---wellness-aesc-healthandwellness
https://www.dmart.in/category/appliances-208503--1
https://www.dmart.in/category/diapers---wipes-aesc-diapersandwipes
https://www.dmart.in/category/baby-care-aesc-babycare
https://www.dmart.in/category/baby-food-aesc-babyfood
https://www.dmart.in/category/baby-gear---furniture
https://www.dmart.in/category/activities---games
https://www.dmart.in/category/detergent---fabric-care-aesc-detergentsandfabriccare
https://www.dmart.in/category/cleaners-aesc-cleaners
https://www.dmart.in/category/utensil-cleaners-aesc-utensilcleaners
https://www.dmart.in/category/mops-wipers-brushes
https://www.dmart.in/category/brooms-dustbins-garbage-bags
https://www.dmart.in/category/bathroom-essentials
https://www.dmart.in/category/disinfectants
https://www.dmart.in/category/bedsheets-more
https://www.dmart.in/category/bath-range
https://www.dmart.in/category/curtains-216012--1
https://www.dmart.in/category/home-decor-216014--1
https://www.dmart.in/category/door-mats-carpets
https://www.dmart.in/category/table-covers-more
https://www.dmart.in/category/home-furniture
https://www.dmart.in/category/freshener---repellents-aesc-freshenersandrepellents
https://www.dmart.in/category/tissue-paper---napkins-aesc-tissuepapernapkins
https://www.dmart.in/category/pooja-needs-aesc-poojaneeds
https://www.dmart.in/category/cleaning-tools-kits
https://www.dmart.in/category/artificial-plants-pots
https://www.dmart.in/category/bulbs-lights
https://www.dmart.in/category/batteries-206012--1
https://www.dmart.in/category/pet-supplies-aesc-petsupplies
https://www.dmart.in/category/racks-organisers
https://www.dmart.in/category/motorbike-helmets
https://www.dmart.in/category/yoga-mats
https://www.dmart.in/category/ladder-aesc-ladder
https://www.dmart.in/category/party-supplies
`;

const urls = dmartUrlsRaw.trim().split('\n')
    .filter(url => url.trim() && url.startsWith('https'))
    .map(url => url.replace(/"/g, '').trim());

console.log(`\n📊 Total DMart URLs: ${urls.length}\n`);

// Categorize by master category
const categorized = {
    "Fruits & Vegetables": [],
    "Dairy, Bread & Eggs": [],
    "Atta, Rice, Oil & Dals": [],
    "Masala, Dry Fruits & More": [],
    "Breakfast & Sauces": [],
    "Packaged Food": [],
    "Tea, Coffee & More": [],
    "Sweet Cravings": [],
    "Snacks & Munchies": [],
    "Bakery & Biscuits": [],
    "Home Needs": [],
    "School, Office & Stationery": [],
    "Baby Care": [],
    "Beauty": [],
    "Skincare": [],
    "Bath & Body": [],
    "Personal Care": [],
    "Health & Wellness": []
};

urls.forEach(url => {
    const path = url.split('/category/')[1];
    console.log(`- ${path}`);
});

console.log(`\n✅ Total: ${urls.length} URLs`);
