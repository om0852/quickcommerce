import 'dotenv/config'
import dbConnect from './lib/mongodb.js'
import mongoose from 'mongoose'
import ProductGrouping from './models/ProductGrouping.js'
import ProductSnapshot from './models/ProductSnapshot.js'

await dbConnect();
console.log('Connected');

// Step 1: Get all product IDs from the snapshot filter
const data = await ProductSnapshot.find({
    scrapedAt: new Date("2026-03-01T08:00:00.000+00:00"),
    category: "Fruits & Vegetables",
    platform: "instamart",
    pincode: "400706"
}).select('productId').lean();

const productIds = data.map(d => d.productId);
console.log(`Total snapshot products (Fruits & Veg, instamart, 400706): ${productIds.length}`);

// Step 2: Find all groups that contain ANY of these product IDs in a single query
const groups = await ProductGrouping.find({
    'products.productId': { $in: productIds }
}).select('groupingId products').lean();

// Step 3: Build a map from productId -> groupId
const productToGroup = {};
for (const group of groups) {
    for (const p of group.products) {
        if (productIds.includes(p.productId)) {
            productToGroup[p.productId] = group.groupingId;
        }
    }
}

const present = Object.keys(productToGroup).length;
const absent = productIds.length - present;

console.log(`Present in a group: ${present}`);
console.log(`Absent (no group): ${absent}`);

// Step 4: Analyze group IDs collected
const groupIdsArray = Object.values(productToGroup);
const totalGroupIds = groupIdsArray.length;
const uniqueGroupIds = new Set(groupIdsArray);

// Count frequency of each groupId
const groupIdFrequency = {};
for (const gid of groupIdsArray) {
    groupIdFrequency[gid] = (groupIdFrequency[gid] || 0) + 1;
}

const duplicateGroupIds = Object.entries(groupIdFrequency)
    .filter(([id, count]) => count > 1)
    .map(([id, count]) => ({ groupId: id, count }))
    .sort((a, b) => b.count - a.count);

console.log(`\n--- Group ID Summary ---`);
console.log(`Total Group IDs (one per product): ${totalGroupIds}`);
console.log(`Unique Group IDs: ${uniqueGroupIds.size}`);
console.log(`Duplicate Group IDs (same group has multiple target products): ${duplicateGroupIds.length}`);
console.log(`Total products sharing a group with another product: ${totalGroupIds - uniqueGroupIds.size}`);

if (duplicateGroupIds.length > 0) {
    console.log(`\nTop Duplicate Groups:`);
    console.table(duplicateGroupIds.slice(0, 20));
}

process.exit(0);