
import { mergeProductsAcrossPlatforms } from './temp_productMatching.mjs';

const productsA = [
    {
        productId: '101',
        productName: 'Fresh Onion',
        productWeight: '1 kg',
        platform: 'blinkit'
    },
    {
        productId: '102',
        productName: 'Nutroactive Keto Atta',
        productWeight: '1 kg',
        platform: 'blinkit'
    }
];

const productsB = [
    {
        productId: '201',
        productName: 'Fresh Onion',
        productWeight: '500 g',
        platform: 'zepto'
    },
    {
        productId: '202',
        productName: 'Nutroactive Keto Atta',
        productWeight: '800 g',
        platform: 'zepto'
    },
    {
        productId: '203',
        productName: 'Nutroactive Keto Atta',
        productWeight: '1 kg',
        platform: 'zepto'
    }
];

console.log('--- Running Grouping Test ---');
const merged = mergeProductsAcrossPlatforms(productsB, productsA, [], [], [], []);

console.log(JSON.stringify(merged, null, 2));

// Check assertions
const onionGroup = merged.find(g => g.name === 'Fresh Onion' || g.name === 'Fresh Onion');
if (onionGroup && onionGroup.blinkit && onionGroup.zepto) {
    if (onionGroup.blinkit.productWeight === '1 kg' && onionGroup.zepto.productWeight === '500 g') {
        console.log('FAIL: "Fresh Onion 1kg" grouped with "Fresh Onion 500g"');
    } else {
        console.log('PASS: Onions kept separate or grouped correctly? (Wait, they should stay separate)');
    }
} else {
    // If they are separate, we expect 2 groups for Onions?
    // Actually mergeProductsAcrossPlatforms returns a list of groups.
    // If they didn't merge, we'd see separate entries.
    const onions = merged.filter(g => g.name === 'Fresh Onion');
    if (onions.length === 2) {
        console.log('PASS: "Fresh Onion 1kg" and "500g" are in separate groups.');
    } else {
        console.log('Check output manually for Onion.');
    }
}

const attaGroup = merged.find(g => g.name.includes('Keto Atta') && g.blinkit && g.zepto);
if (attaGroup) {
    console.log(`Atta Group: Blinkit Weight: ${attaGroup.blinkit.productWeight}, Zepto Weight: ${attaGroup.zepto.productWeight}`);
}
