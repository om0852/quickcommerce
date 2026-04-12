import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';
import ProductGrouping from '@/models/ProductGrouping';
import nodemailer from 'nodemailer';
import ExcelJS from 'exceljs';
import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { mergeProductsAcrossPlatforms } from '@/lib/productMatching';
import categoryData from '@/app/utils/categories_with_urls.json';

// Build a quick lookup map for URL -> Official Category info
const urlToCategoryMap = new Map();
// Build a lookup map for Master Category -> Official Category info (Fallback)
const masterCategoryMap = new Map();

try {
    Object.keys(categoryData).forEach(masterCat => {
        const platforms = categoryData[masterCat];
        Object.keys(platforms).forEach(platform => {
            const items = platforms[platform];
            if (Array.isArray(items)) {
                // For master category fallback, we just need the FIRST valid item for this platform+masterCategory
                let firstValidItem = null;

                items.forEach(item => {
                    // Populate URL map (existing logic)
                    if (item.url) {
                        try {
                            let key;
                            // Instamart relies on query params (e.g. ?categoryName=...) so we MUST preserve them.
                            if (platform.toLowerCase() === 'instamart') {
                                key = `${platform}|${item.url.trim().toLowerCase()}`;
                            } else {
                                // For others, normalize to origin+pathname
                                const urlObj = new URL(item.url);
                                const cleanUrl = urlObj.origin + urlObj.pathname;
                                key = `${platform}|${cleanUrl.toLowerCase().trim()}`;
                            }

                            urlToCategoryMap.set(key, {
                                officialCategory: item.officialCategory || item.officialCategory,
                                officialSubCategory: item.officialSubCategory || item.officialSubCategory
                            });
                        } catch (e) {
                            // Fallback for invalid URLs or relative paths if any
                            const key = `${platform}|${item.url.trim().toLowerCase()}`;
                            urlToCategoryMap.set(key, {
                                officialCategory: item.officialCategory || item.officialCategory,
                                officialSubCategory: item.officialSubCategory || item.officialSubCategory
                            });
                        }
                    }

                    if (!firstValidItem && (item.officialCategory || item.officialCategory)) {
                        firstValidItem = item;
                    }
                });

                // Populate Master Category map
                if (firstValidItem) {
                    const masterKey = `${platform}|${masterCat}`;
                    masterCategoryMap.set(masterKey, {
                        officialCategory: firstValidItem.officialCategory || firstValidItem.officialCategory,
                        officialSubCategory: firstValidItem.officialSubCategory || firstValidItem.officialSubCategory
                    });
                }
            }
        });
    });
    console.log(`✅ Loaded ${urlToCategoryMap.size} URLs and ${masterCategoryMap.size} Master Categories into lookup maps`);
} catch (err) {
    console.error('❌ Failed to build category lookup map:', err);
}


function extractPricePerUnit(price, weightStr) {
    if (!price || !weightStr || weightStr === 'N/A' || weightStr === '-') return '-';

    const str = String(weightStr).toLowerCase().replace(/,/g, '').trim();

    // 1. Check for multiplier (e.g. "4 x 100 g")
    const multiMatch = str.match(/(\d+)\s*(?:x|\*|×|-)\s*([\d.]+)\s*([a-z]+)/);
    let value = null;
    let unit = null;

    if (multiMatch) {
        const multiplier = parseInt(multiMatch[1], 10);
        value = parseFloat(multiMatch[2]) * multiplier;
        unit = multiMatch[3];
    } else {
        // 2. Check for standard format (e.g. "500 g", "1.5 kg")
        const standardMatch = str.match(/^([\d.]+)\s*([a-z]+)/);
        if (standardMatch) {
            value = parseFloat(standardMatch[1]);
            unit = standardMatch[2];
        } else {
            // 3. Check for standalone pieces
            if (str.includes('pc') || str.includes('piece')) return `₹${Number(price).toFixed(2)}/pc`;
            return '-';
        }
    }

    if (isNaN(value) || value <= 0) return '-';

    // Normalize units
    if (unit === 'kg' || unit === 'kgs') {
        value = value * 1000;
        unit = 'g';
    } else if (unit === 'l' || unit === 'lit' || unit === 'litre' || unit === 'litres') {
        value = value * 1000;
        unit = 'ml';
    } else if (unit === 'gm' || unit === 'gms') {
        unit = 'g';
    } else if (unit === 'pc' || unit === 'pcs' || unit === 'piece' || unit === 'pieces') {
        unit = 'pc';
    } else if (unit === 'unit' || unit === 'units') {
        unit = 'unit';
    } else if (unit === 'pack' || unit === 'packs') {
        unit = 'pack';
    } else if (unit === 'ml') {
        unit = 'ml';
    } else if (unit === 'g') {
        unit = 'g';
    }

    const pricePerUnit = price / value;

    if (pricePerUnit < 0.01) {
        return `₹${pricePerUnit.toFixed(4)}/${unit}`;
    }
    return `₹${pricePerUnit.toFixed(2)}/${unit}`;
}

/**
 * Extracts a multiplier from a weight/quantity string.
 * Examples: 
 * "2 x 400g" -> 2
 * "500ml x 3" -> 3
 * "4 * 10pk" -> 4
 */
function extractComboMultiplier(weightStr) {
    if (!weightStr || weightStr === 'N/A' || weightStr === '-') return 1;
    const str = String(weightStr).toLowerCase().replace(/,/g, '').trim();

    // Pattern 1: Multiplier first (e.g. "2 x 500g", "2 * 500g", "2x 500g")
    const prefixMatch = str.match(/^(\d+)\s*(?:x|\*|×|-)\s*/);
    if (prefixMatch) return parseInt(prefixMatch[1], 10);

    // Pattern 2: Multiplier last (e.g. "500g x 3", "500g*3")
    const suffixMatch = str.match(/\s*(?:x|\*|×|-)\s*(\d+)$/);
    if (suffixMatch) return parseInt(suffixMatch[1], 10);

    return 1;
}


const JIO_ARTICLE_CATEGORIES = [
    "APPLE FUJI", "APPLE RED DELICIOUS", "APPLE GRANNY SMITH", "APPLE GOLDEN IMPORTE",
    "APPLE ROYAL GALA", "APPLE INORED EPLI", "APPLE QUEEN", "APPLE KINNAUR", "APPLE SHIMLA",
    "MOSAMBI", "ORANGE INDIAN", "KINNOW", "CITRUS OTHERS", "IMPORTED OTHERS", "STRAWBERRY",
    "AVOCADO INDIAN", "LITCHI", "PLUM INDIAN", "MINOR FRUIT OTHERS", "EXOTIC FRUITS INDIAN",
    "CITRUS ORANGE IMPORT", "KIWI IMPORTED OTHERS", "PEARS IMPORTED", "PLUM IMPORTED",
    "GRAPES IMPORTED", "GRAPES INDIAN OTHERS", "GRAPES BLACK", "GRAPES SONAKA SEEDLE",
    "GRAPES THOMPSON SEED", "MANGO ALPHONSO", "MANGO TOTAPURI", "MANGO NEELAM", "MANGO CHAUSA",
    "MANGO BANGANAPALLI", "MUSKMELON", "WATERMELON", "MELON OTHERS", "BANANA NENDRAN",
    "BANANA OTHERS", "BANANA ROBUSTA", "BANANA YELLAKI", "PEARS INDIAN", "GUAVA", "PAPAYA",
    "PINEAPPLE", "CUSTARD APPLE", "POMEGRANATE", "SAPOTA", "TENDER COCONUT GREEN", "CUT FRUITS",
    "SWEET TAMARIND IMPOR", "APPLE IMPORTED INDIA", "APPLE KASHMIR", "APPLE INDIAN OTHERS",
    "MANGO SINDHURA", "CHERRY RED INDIAN", "BERRY INDIAN", "MANGO OTHERS", "MANGO LANGDA",
    "MANGO DASHERI", "MANGO KESAR", "PEACH INDIAN", "APPLE PINK LADY", "APPLE IMPORTED OTHER",
    "BERRIES IMPORTED", "DRAGON FRUIT INDIAN", "KIWI IMPORTED ZESPRI", "DATES IMPORTED FRESH",
    "CITRUS MANDARIN IMPO", "TENDER COCONUT GOLDE", "JUMBO GUAVA INDIAN", "AVOCADO IMPORTED",
    "DRAGON FRUIT IMPORTE", "CITRUS IMPORTED OTHE", "DATES IMPORTED", "GRAPES", "MANGO",
    "SEASONAL MINOR", "MELONS", "SEASONAL MAJOR", "APPLE", "PERENNIALS", "STONE FRUITS",
    "CHERRIES & BERRIES", "PEAR", "EXOTIC FRUITS", "CITRUS", "BANANA", "WET DATES",
    "VALUE ADDED", "GIFT PACKS", "DRIED DATES", "ONION RED", "GARLIC", "MUSHROOM", "COCONUT",
    "POTATO OTHERS", "POTATO REGULAR", "TOMATO COUNTRY", "TOMATO HYBRID", "TOMATO OTHERS",
    "POTATO BABY", "ONION SAMBAR", "ONION WHITE", "EXOTIC VEGETABLE OTH", "BABY CORN", "BROCCOLI",
    "SPROUTS", "TOMATO CHERRY", "CABBAGE CHINESE", "LETTUCE ICEBERG", "AMARANTHUS", "CORIANDER",
    "LEAFY OTHERS", "CURRY LEAVES", "METHI", "MINT LEAVES", "Spinach", "SPRING ONION",
    "VEG OTHERS", "DRUMSTICK", "BEET ROOT", "GINGER", "RADISH WHITE", "ROOTY OTHERS",
    "SWEET POTATO", "CABBAGE", "CAPSICUM GREEN", "CAPSICUM COLOURED", "CAULIFLOWER",
    "GREEN PEAS", "TEMPERATE VEG OTHERS", "BEANS OTHERS", "BEANS CLUSTER", "BEANS COWPEA",
    "BEANS FRENCH", "BRINJAL BLACK BIG", "BRINJAL OTHERS", "BRINJAL NAGPUR", "CUCUMBER WHITE",
    "CUCUMBER MADRAS", "GOURD OTHERS", "BITTER GOURD", "BOTTLE GOURD", "COCCINIA",
    "RIDGE GOURD", "TROPICAL VEG OTHERS", "BANANA RAW", "CARROT ORANGE", "CHILLI GREEN",
    "LEMON", "Okra", "Pumpkin", "SUGARCANE", "GROUNDNUT", "SWEET CORN", "CUCUMBER GREEN",
    "CUCUMBER FRENCH", "CARROT RED", "FLOWERS", "PAPAYA RAW", "SPONGE GOURD", "ONION OTHERS",
    "POTTED HERBS", "MICROGREENS", "POTATO LOW SUGAR"
];

function extractArticleCategory(productName) {
    if (!productName) return '-';
    const normalizedName = productName.toUpperCase();

    // Sort categories by length descending to match longest specific string first
    const sortedCategories = [...JIO_ARTICLE_CATEGORIES].sort((a, b) => b.length - a.length);

    for (const cat of sortedCategories) {
        if (normalizedName.includes(cat.toUpperCase())) {
            return cat;
        }
    }
    return '-';
}

// Background processing function
async function processExportInBackground(body) {
    console.log('🚀 Starting background export process...');
    try {
        await dbConnect();

        const {
            startDate,
            endDate,
            email,
            platforms = [],
            products = [],
            categories = [],
            pincodes = []
        } = body;

        console.log('Export request details:', { startDate, endDate, email, platforms, categories, pincodes });

        // Define available platforms for consistency (Mandatory Order)
        const AVAILABLE_PLATFORMS = ['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'];

        // Determine active platforms based on selection
        let activePlatforms = [];
        if (!platforms.length || platforms.includes('all')) {
            activePlatforms = AVAILABLE_PLATFORMS;
        } else {
            // Ensure we strictly only use valid platforms from our list and normalize to lowercase
            const selectedSet = new Set(platforms.map(p => p.toLowerCase().trim()));
            activePlatforms = AVAILABLE_PLATFORMS.filter(p => selectedSet.has(p.toLowerCase()));
            
            // If filtering resulted in no valid platforms (shouldn't happen with GUI), fallback to all
            if (activePlatforms.length === 0) activePlatforms = AVAILABLE_PLATFORMS;
        }



        // Helper to get distinct values if 'all' is selected
        const getDistinctValues = async (field, filters = {}) => {
            const combinedFilters = {
                ...filters,
                $or: [
                    { platform: { $ne: 'jiomart' } },
                    { platform: 'jiomart', isQuick: { $ne: false } }
                ]
            };
            return await ProductSnapshot.distinct(field, combinedFilters);
        };

        let targetCategories = categories;
        if (!categories.length || categories.includes('all')) {
            targetCategories = await getDistinctValues('category');
        }

        let targetPincodes = pincodes;
        if (!pincodes.length) { // Assuming empty means all valid pincodes need to be fetched, or handled by loop
            targetPincodes = await getDistinctValues('pincode');
        }



        const allProcessedRows = [];
        const uniquePlatforms = new Set();

        // Loop by Category -> Pincode -> Groups (Strict Hierarchy like UI)
        for (const cat of targetCategories) {

            // Fetch Groups ONCE for this category (Shared across pincodes usually)
            // But UI fetches inside the loop? No, usually groups are category specific.
            const groups = await ProductGrouping.find({ category: cat }).lean();
            // Sort groups if they have a specific order? UI doesn't seem to sort explicitly, implies DB order / Insertion order.
            // We'll trust the array order from DB matches UI default.

            for (const pin of targetPincodes) {

                // 1. Determine Timestamp (LIVE MODE logic mainly, as per UI)
                // We default to 'live' (latest) unless specific time is requested, but Export usually implies 'latest' or 'unique' history.
                // The User wants "Same sequence which is shown on category page". Category Page shows LATEST.

                let targetScrapedAt = null;

                if (body.exportType === 'unique') {
                    // Unique logic is tricky with Groups because Groups are "Live". 
                    // If we want historical unique items, we can't easily use Groups which are static definitions of NOW.
                    // However, user complaint is about "Ginger" which is likely a current product.
                    // Let's assume for now ExportType 'latest' is the primary usage for this match.
                    // If 'unique' is requested, we might have to fallback to the old logic OR iterate history.
                    // BUT: The user asked for "Same sequence as UI". UI is LIVE. 
                    // So we focus on fixing the Live/Latest export first.
                }

                // Find latest snapshot for this pincode/category to establish "Now"
                const latestSnapshot = await ProductSnapshot.findOne({
                    pincode: pin,
                    $or: [
                        { category: cat },
                    ]
                }).sort({ scrapedAt: -1 }).select('scrapedAt');

                if (!latestSnapshot) continue; // No data for this pincode/cat
                targetScrapedAt = latestSnapshot.scrapedAt;

                // --- Calculate NG Interval (Same as UI page.jsx) ---
                // For latest export, start = targetScrapedAt, end = now
                const ngInterval = { start: new Date(targetScrapedAt), end: new Date() };

                // 2. Fetch Snapshots for this specific time slice
                // Optimization: Filter by the Product IDs in our groups to ensure we match even if snapshot category differs
                const allProductIds = new Set();
                groups.forEach(g => {
                    g.products.forEach(p => {
                        if (p.productId) allProductIds.add(p.productId);
                    });
                });

                const snapshots = await ProductSnapshot.find({
                    pincode: pin,
                    scrapedAt: targetScrapedAt,
                    category: cat,
                    productId: { $in: Array.from(allProductIds) },
                    platform: { $in: activePlatforms }, // 🚀 Fix: Only fetch snapshots for selected platforms
                    $or: [
                        { platform: { $ne: 'jiomart' } },
                        { platform: 'jiomart', isQuick: { $ne: false } }
                    ]
                }).lean();


                const snapshotMap = {};
                snapshots.forEach(snap => {
                    // IMPORTANT: key must be lowercased to match group.products[].platform lookup
                    const key = `${snap.platform.toLowerCase()}:${snap.productId}`;
                    // Keep best-ranked snapshot if multiple exist for same platform:productId
                    if (!snapshotMap[key] || (snap.ranking && snap.ranking < (snapshotMap[key].ranking || Infinity))) {
                        snapshotMap[key] = snap;
                    }
                });

                // 3. Iterate GROUPS to build rows (Strict Sequence)
                for (const group of groups) {
                    const platformMatches = {};
                    activePlatforms.forEach(p => { platformMatches[p] = []; });
                    
                    let maxVariants = 0;
                    let hasData = false;


                    // Group snapshots by platform
                    group.products.forEach(p => {
                        const platformKey = p.platform.toLowerCase();
                        const snap = snapshotMap[`${platformKey}:${p.productId}`];
                        if (snap) {
                            const matchKey = Object.keys(platformMatches).find(k => k.toLowerCase() === platformKey);
                            if (matchKey) {
                                platformMatches[matchKey].push(snap);
                                hasData = true;
                                if (platformMatches[matchKey].length > maxVariants) {
                                    maxVariants = platformMatches[matchKey].length;
                                }
                            }
                        }
                    });

                    // --- Danger (Skull) Logic: Global group definition ---
                    const globalPlatformConflicts = {};
                    const groupDefinedProducts = {};

                    group.products.forEach(p => {
                        const plat = p.platform.toLowerCase();
                        if (!groupDefinedProducts[plat]) groupDefinedProducts[plat] = new Set();
                        const pid = p.productId || '';
                        const baseId = pid.includes('__') ? pid.split('__')[0] : pid;
                        groupDefinedProducts[plat].add(baseId);
                    });

                    Object.keys(groupDefinedProducts).forEach(platform => {
                        if (groupDefinedProducts[platform].size > 1) {
                            globalPlatformConflicts[platform] = true;
                        }
                    });

                    const hasGroupConflict = Object.values(globalPlatformConflicts).some(c => c === true);

                    if (hasData) {
                        // Sort variants to match UI deteministic sequence
                        Object.keys(platformMatches).forEach(platform => {
                            platformMatches[platform].sort((a, b) => {
                                const rA = a.ranking && !isNaN(a.ranking) ? a.ranking : Infinity;
                                const rB = b.ranking && !isNaN(b.ranking) ? b.ranking : Infinity;
                                if (rA !== rB) return rA - rB;
                                return Number(a.currentPrice || 0) - Number(b.currentPrice || 0);
                            });
                        });

                        const pushRowToExport = (platformDataMap, groupIdStr, isDuplicate) => {
                            const dateObj = new Date(targetScrapedAt);
                            const excelRow = {
                                date: dateObj.toLocaleDateString(),
                                pincode: pin,
                                category: cat,
                                productName: group.primaryName,
                                brand: group.brand || '-',
                                groupId: groupIdStr,
                                productWeight: group.primaryWeight || 'N/A',
                                _productRowRef: platformDataMap
                            };

                            // --- NG Logic ---
                            const groupCreated = group.createdAt ? new Date(group.createdAt) : null;
                            const isNG = groupCreated && groupCreated > ngInterval.start && groupCreated <= ngInterval.end;
                            excelRow.ngStatus = isNG ? 'NG' : '-';

                            // Update brand from snapshots if needed
                            Object.values(platformDataMap).forEach(snap => {
                                if (snap && excelRow.brand === '-' && snap.brand) {
                                    excelRow.brand = snap.brand;
                                }
                            });

                            activePlatforms.forEach(p => {

                                const pData = platformDataMap[p];
                                if (pData) {
                                    uniquePlatforms.add(p);

                                    excelRow[`${p}_name`] = pData.productName || pData.name || '-';
                                    excelRow[`${p}_productId`] = pData.productId ? String(pData.productId).split('__')[0] : '-';
                                    excelRow[`${p}_aid`] = pData.productId || '-';
                                    excelRow[`${p}_otherSubcategory`] = pData.subCategory || '-';
                                    if (p === 'jiomart') {
                                        excelRow[`${p}_articleCategory`] = extractArticleCategory(pData.productName || pData.name);
                                    }
                                    excelRow[`${p}_available`] = 'Yes';
                                    excelRow[`${p}_price`] = pData.currentPrice;
                                    excelRow[`${p}_originalPrice`] = pData.originalPrice || '-';
                                    excelRow[`${p}_discount`] = pData.discountPercentage ? `${Math.round(pData.discountPercentage)}%` : '-';
                                    excelRow[`${p}_stock`] = pData.isOutOfStock ? 'Out of Stock' : 'In Stock';
                                    excelRow[`${p}_link`] = pData.productUrl || pData.url || pData.link || pData.productLink || '';
                                    excelRow[`${p}_isAd`] = pData.isAd ? 'Yes' : 'No';
                                    excelRow[`${p}_rating`] = pData.rating || '-';
                                    excelRow[`${p}_rank`] = pData.ranking || '-';
                                    const displayQuantity = (pData.quantity && pData.quantity !== '')
                                        ? pData.quantity
                                        : (pData.productWeight && pData.productWeight !== '' && pData.productWeight !== 'N/A')
                                            ? pData.productWeight
                                            : '-';

                                    const rawCombo = pData.combo;
                                    if (p === 'zepto') {
                                        // Zepto specific logic: Calculate combo from quantity/weight string
                                        excelRow[`${p}_combo`] = extractComboMultiplier(displayQuantity);
                                        // Store raw value for the dedicated API column
                                        excelRow[`${p}_combo_api`] = (rawCombo === null || rawCombo === undefined || rawCombo === 'N/A' || rawCombo === '') ? 1 : rawCombo;
                                    } else {
                                        // Other platforms: Use raw value with default 1
                                        excelRow[`${p}_combo`] = (rawCombo === null || rawCombo === undefined || rawCombo === 'N/A' || rawCombo === '') ? 1 : rawCombo;
                                    }

                                    excelRow[`${p}_quantity`] = displayQuantity;

                                    excelRow[`${p}_pricePerUnit`] = extractPricePerUnit(pData.currentPrice, displayQuantity);

                                    excelRow[`${p}_deliveryTime`] = pData.deliveryTime
                                        ? (pData.deliveryTime.match(/^\d+\s*mins?/i)?.[0] || pData.deliveryTime)
                                        : '-';
                                    excelRow[`${p}_isNew`] = pData.new === true ? 'New' : 'Old';

                                    excelRow[`${p}_priceChange`] = pData.priceChange || 0;
                                    excelRow[`${p}_discountChange`] = pData.discountChange || 0;
                                    excelRow[`${p}_rankingChange`] = pData.rankingChange || 0;

                                    const officialCategory = pData.officialCategory;
                                    const officialSubCategory = pData.officialSubCategory;

                                    if (officialCategory && officialCategory !== '-') {
                                        excelRow[`${p}_officialCategory`] = officialCategory;
                                        excelRow[`${p}_officialSubCategory`] = officialSubCategory || '-';
                                    } else {
                                        const pUrl = pData.productUrl || pData.url || pData.link || pData.productLink || '';
                                        let lookupKey = `${p}|${(pData.categoryUrl || pUrl || '').trim().toLowerCase()}`;
                                        const fallback = urlToCategoryMap.get(lookupKey);
                                        if (fallback) {
                                            excelRow[`${p}_officialCategory`] = fallback.officialCategory || '-';
                                            excelRow[`${p}_officialSubCategory`] = fallback.officialSubCategory || '-';
                                        } else {
                                            const masterKey = `${p}|${cat}`;
                                            const masterFallback = masterCategoryMap.get(masterKey);
                                            if (masterFallback) {
                                                excelRow[`${p}_officialCategory`] = masterFallback.officialCategory || '-';
                                                excelRow[`${p}_officialSubCategory`] = masterFallback.officialSubCategory || '-';
                                            } else {
                                                excelRow[`${p}_officialCategory`] = '-';
                                                excelRow[`${p}_officialSubCategory`] = '-';
                                            }
                                        }
                                    }
                                } else {
                                    excelRow[`${p}_name`] = '-';
                                    excelRow[`${p}_productId`] = '-';
                                    excelRow[`${p}_aid`] = '-';
                                    excelRow[`${p}_otherSubcategory`] = '-';
                                    excelRow[`${p}_available`] = 'U/S';

                                    excelRow[`${p}_price`] = null;
                                    excelRow[`${p}_pricePerUnit`] = '-';
                                    excelRow[`${p}_originalPrice`] = '-';
                                    excelRow[`${p}_discount`] = '-';
                                    excelRow[`${p}_stock`] = '-';
                                    excelRow[`${p}_link`] = '';
                                    excelRow[`${p}_isAd`] = '-';
                                    excelRow[`${p}_rating`] = '-';
                                    excelRow[`${p}_rank`] = null;
                                    excelRow[`${p}_combo`] = '-';
                                    excelRow[`${p}_quantity`] = '-';
                                    excelRow[`${p}_deliveryTime`] = '-';
                                    excelRow[`${p}_priceChange`] = '-';
                                    excelRow[`${p}_discountChange`] = '-';
                                    excelRow[`${p}_rankingChange`] = '-';
                                    excelRow[`${p}_officialCategory`] = '-';
                                    excelRow[`${p}_officialSubCategory`] = '-';
                                    excelRow[`${p}_isNew`] = '-';
                                }
                            });

                            allProcessedRows.push(excelRow);
                        };

                        let dupCounter = 1;
                        for (let i = 0; i < maxVariants; i++) {
                            if (i === 0) {
                                const masterDataMap = {};
                                activePlatforms.forEach(p => { masterDataMap[p] = null; });

                                Object.keys(platformMatches).forEach(platform => {

                                    if (platformMatches[platform][0]) {
                                        masterDataMap[platform] = platformMatches[platform][0];
                                    }
                                });
                                pushRowToExport(masterDataMap, group.groupingId || (group._id ? group._id.toString() : '-'));
                            } else {
                                Object.keys(platformMatches).forEach(platform => {
                                    const snap = platformMatches[platform][i];
                                    if (snap) {
                                        const dupDataMap = {};
                                        activePlatforms.forEach(p => { dupDataMap[p] = null; });

                                        dupDataMap[platform] = snap;

                                        const dupGroupId = `${group.groupingId || (group._id ? group._id.toString() : '-')}_dup_${dupCounter++}`;
                                        pushRowToExport(dupDataMap, dupGroupId);
                                    }
                                });
                            }
                        }
                    }
                } // End Group Loop

                // --- Compute Hide Similar Status for this pincode+category block ---
                const blockRows = allProcessedRows.filter(r => r.pincode === pin && r.category === cat);

                // User requested: "Present" for Master Group row, "Hide" for Duplicate groups
                blockRows.forEach(row => {
                    row.hideSimilarStatus = String(row.groupId).includes('_dup_') ? 'Hide' : 'Present';
                });

            } // End Pincode Loop
        } // End Category Loop

        // Remove temporary _productRowRef before writing to Excel
        allProcessedRows.forEach(row => { delete row._productRowRef; });

        if (allProcessedRows.length === 0) {
            console.warn('⚠️ Background Export: No data found for the selected filters');
            return;
        }

        // Sorting Logic: 
        // With Group-based iteration, the order is ALREADY defined by the user intent (Category > Pincode > Group Order).
        // The user specifically asked for "Same sequence". 
        // So we SHOULD NOT re-sort by name or availability, because that destroys the group order.
        // However, we might need to handle the case where multiple pincodes are selected.
        // Our loop order is Category -> Pincode -> Group.
        // This effectively groups by Pincode blocks, then Group order within that.
        // This matches the UI (which iterates pincodes and shows blocks).

        // NO EXTRA SORTING NEEDED to match UI Sequence.


        // Sorting Logic: Sort by Group Name (A-Z)
        allProcessedRows.sort((a, b) => {
            // 1. Primary Sort: Pincode (Ascending) - Group by Location
            if (a.pincode !== b.pincode) {
                return (a.pincode || '').toString().localeCompare((b.pincode || '').toString());
            }

            // 2. Secondary Sort: Category (Ascending) - Group by Category within Pincode
            if (a.category !== b.category) {
                return (a.category || '').localeCompare(b.category || '');
            }

            // 3. Tertiary Sort: Product Name / Group Name (Ascending A-Z)
            return (a.productName || '').localeCompare(b.productName || '');
        });

        // Use collected unique platforms for columns BUT enforce specific order
        // User Request: "even they are no have nay product still show there columns"
        // So we strictly use ONE fixed list of all platforms, regardless of what data was found.
        // Use active platforms for columns to respect the user selection
        const allPlatforms = activePlatforms;


        // Optional Debug Dump: Only in development or if explicitly enabled
        if (process.env.NODE_ENV === 'development') {
            try {
                const debugPath = path.join(os.tmpdir(), 'debug_export_data.json');
                fs.writeFileSync(debugPath, JSON.stringify(allProcessedRows, null, 2));
                console.log(`✅ Debug data dumped to ${debugPath}`);
            } catch (err) {
                console.error('❌ Failed to dump debug data:', err);
            }
        }


        // Generate Excel using Streaming to avoid Out of Memory (OOM) on 100k+ rows
        const tempFilePath = path.join(os.tmpdir(), `export_${Date.now()}_${Math.random().toString(36).substring(7)}.xlsx`);
        console.log(`🚀 Streaming Excel to temporary file: ${tempFilePath}`);

        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
            filename: tempFilePath,
            useStyles: true,
            useSharedStrings: true
        });

        const worksheet = workbook.addWorksheet('Comparison Data', {
            views: [
                { state: 'frozen', xSplit: 0, ySplit: 1 }
            ]
        });

        // Define Base Columns
        const columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Pincode', key: 'pincode', width: 10 },
            { header: 'Group ID', key: 'groupId', width: 25 },
            { header: 'Category', key: 'category', width: 15 },
            { header: 'Product Name', key: 'productName', width: 30 },
            { header: 'Brand', key: 'brand', width: 20 },
            { header: 'Weight', key: 'productWeight', width: 10 },
            { header: 'NG', key: 'ngStatus', width: 8 },
            { header: 'Hide Similar Status', key: 'hideSimilarStatus', width: 20 },
        ];


        
        // --- Global Platform Check ---
        // Identify which platforms actually have products in this export
        const platformsWithData = new Set();
        allProcessedRows.forEach(row => {
            allPlatforms.forEach(p => {
                if (row[`${p}_available`] === 'Yes') {
                    platformsWithData.add(p);
                }
            });
        });

        // Add Dynamic Columns for each Platform
        allPlatforms.forEach(platform => {
            const pName = platform.charAt(0).toUpperCase() + platform.slice(1);
            
            if (!platformsWithData.has(platform)) {
                // If platform has ZERO data, only show one single column
                columns.push({ header: `${pName} Avail (No Data)`, key: `${platform}_available`, width: 20 });
            } else {
                // Platform has data, show full suite of columns
                const pCols = [
                    { header: `${pName} Name`, key: `${platform}_name`, width: 30 },
                    { header: `${pName} Product ID`, key: `${platform}_productId`, width: 20 },
                    { header: `${pName} AID`, key: `${platform}_aid`, width: 20 },
                    { header: `${pName} Avail`, key: `${platform}_available`, width: 10 },
                    { header: `${pName} Price`, key: `${platform}_price`, width: 12, style: { numFmt: '₹#,##0.00' } },
                    { header: `${pName} Price/Unit`, key: `${platform}_pricePerUnit`, width: 15 },
                    { header: `${pName} Org Price`, key: `${platform}_originalPrice`, width: 12, style: { numFmt: '₹#,##0.00' } },
                    { header: `${pName} Disc %`, key: `${platform}_discount`, width: 10 },
                    { header: `${pName} Stock`, key: `${platform}_stock`, width: 12 },
                    { header: `${pName} Rank`, key: `${platform}_rank`, width: 8 },
                    { header: `${pName} Ad`, key: `${platform}_isAd`, width: 8 },
                    { header: `${pName} Rating`, key: `${platform}_rating`, width: 8 },
                    { header: `${pName} Delivery`, key: `${platform}_deliveryTime`, width: 15 },
                    { header: `${pName} Quantity`, key: `${platform}_quantity`, width: 12 },
                    { header: `${pName} Combo`, key: `${platform}_combo`, width: 12 },
                    { header: `${pName} Is New`, key: `${platform}_isNew`, width: 10 },
                    { header: `${pName} Link`, key: `${platform}_link`, width: 15 },
                    { header: `${pName} Official Cat`, key: `${platform}_officialCategory`, width: 20 },
                    { header: `${pName} Official Sub-cat`, key: `${platform}_officialSubCategory`, width: 20 },
                    { header: `${pName} Other Subcategory`, key: `${platform}_otherSubcategory`, width: 20 }
                ];

                if (platform === 'jiomart') {
                    pCols.push({ header: `${pName} Article Category`, key: `${platform}_articleCategory`, width: 25 });
                }

                if (platform === 'zepto') {
                    // Add extra raw API combo column for Zepto
                    const comboIdx = pCols.findIndex(c => c.key === 'zepto_combo');
                    pCols.splice(comboIdx + 1, 0, { header: `${pName} Combo (API)`, key: `${platform}_combo_api`, width: 15 });
                }

                columns.push(...pCols);

            }
        });


        worksheet.columns = columns;

        // Header Styling
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F46E5' }
        };

        // Populate Rows
        allProcessedRows.forEach(row => {
            const excelRow = worksheet.addRow(row);

            // Hide Similar Status column styling
            const hideCell = excelRow.getCell('hideSimilarStatus');
            if (hideCell.value === 'Hide') {
                hideCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Light Red
                hideCell.font = { color: { argb: 'FF991B1B' }, bold: true }; // Dark Red
            } else if (hideCell.value === 'Present') {
                hideCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Light Green
                hideCell.font = { color: { argb: 'FF166534' }, bold: true }; // Dark Green
            }

            // NG Status column styling
            const ngCell = excelRow.getCell('ngStatus');
            if (ngCell.value === 'NG') {
                ngCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } }; // Light Orange (Orange 100)
                ngCell.font = { color: { argb: 'FF9A3412' }, bold: true }; // Dark Orange (Orange 900)
            }

            // Conditional Formatting
            allPlatforms.forEach(platform => {
                const availKey = `${platform}_available`;
                const availCell = excelRow.getCell(availKey);
                
                if (availCell.value === 'Yes') {
                    availCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
                    availCell.font = { color: { argb: 'FF166534' } };
                } else {
                    availCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                    availCell.font = { color: { argb: 'FF991B1B' } };
                }

                // Only styling other columns if the platform has data (and thus columns exist)
                if (platformsWithData.has(platform)) {
                    const stockCell = excelRow.getCell(`${platform}_stock`);
                    if (stockCell.value === 'In Stock') {
                        stockCell.font = { color: { argb: 'FF166534' } };
                    } else if (stockCell.value === 'Out of Stock') {
                        stockCell.font = { color: { argb: 'FFDC2626' } };
                    }

                    const isNewCell = excelRow.getCell(`${platform}_isNew`);
                    if (isNewCell && isNewCell.value === 'New') {
                        isNewCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
                        isNewCell.font = { color: { argb: 'FF1E40AF' }, bold: true };
                    }

                    const linkCell = excelRow.getCell(`${platform}_link`);
                    if (linkCell.value && linkCell.value !== '') {
                        linkCell.value = { text: 'View', hyperlink: linkCell.value };
                        linkCell.font = { color: { argb: 'FF0000FF' }, underline: true };
                    }
                }
            });

            // Commit row to free memory immediately
            excelRow.commit();
        });

        // Using the latest date found across all rows for the filename/email subject
        const latestDate = new Date(); // Current export time

        // Commit worksheet and workbook to finish writing the file
        worksheet.commit();
        await workbook.commit();

        console.log(`✅ Excel writing completed. Reading back into buffer for response/email...`);

        // Read the temp Excel file into a buffer
        const buffer = await fs.promises.readFile(tempFilePath);

        // Clean up temp file
        try {
            await fs.promises.unlink(tempFilePath);
            console.log(`✅ Cleaned up temporary file: ${tempFilePath}`);
        } catch (cleanupErr) {
            console.error(`⚠️ Failed to clean up temporary file: ${tempFilePath}`, cleanupErr);
        }

        // Send Email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        if (email && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
            console.warn('⚠️ EMAIL_USER or EMAIL_PASS not set. Cannot send email.');
            // Even if email fails/is skipped, we return buffer
            return buffer;
        }

        // Skip email if not provided
        if (!email) {
            return buffer;
        }

        const dateRangeStr = latestDate.toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Latest Scrape Data - ${dateRangeStr}`,
            text: `Please find attached the requested category export.\n\nFilters:\nData Timestamp: ${dateRangeStr}\nPlatforms: ${platforms.length ? platforms.join(', ') : 'All'}\nCategories: ${categories.length ? categories.join(', ') : 'All'}\nPincodes: ${pincodes.length ? pincodes.join(', ') : 'All'}`,
            attachments: [
                {
                    filename: `product_status_${Date.now()}.xlsx`,
                    content: buffer
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${email}`);

        return buffer;

    } catch (error) {
        console.error('❌ Background Export Status: FAILED', error);
        throw error;
    }
}

export async function POST(req) {
    try {
        await dbConnect();

        const body = await req.json();
        const { email } = body;

        // Validation
        // Email is optional now (for direct download only)
        // if (!email) {
        //    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        // }

        console.log('🚀 Starting export process...');

        // Execute the export synchronously to ensure it completes
        const buffer = await processExportInBackground(body);

        if (!buffer) {
            return NextResponse.json({ error: 'No data found to export' }, { status: 404 });
        }

        console.log('✅ Export completed, email sent, returning file.');

        // Return file response
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="category_export_${Date.now()}.xlsx"`
            }
        });

    } catch (error) {
        console.error('❌ Export request error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
