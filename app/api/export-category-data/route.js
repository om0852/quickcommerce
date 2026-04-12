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
import { redis, clients } from '@/lib/redis';
import uniqid from 'uniqid';

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

const extractComboFromQuantity = (qty) => {
    if (!qty || typeof qty !== 'string') return 1;
    // Look for patterns like "2 x 500g", "2x500g", "2 Units x 100g"
    const match = qty.match(/(\d+)\s*(?:Units?\s*)?x/i);
    return match ? parseInt(match[1], 10) : 1;
};

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

// Helper to get distinct values
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

// Core logic to generate rows for a single category
async function generateRowsForCategory(params) {
    const { cat, targetPincodes, activePlatforms, exportType } = params;
    const allProcessedRows = [];

    // Fetch Groups ONCE for this category
    const groups = await ProductGrouping.find({ category: cat }).lean();
    if (!groups.length) return [];


    for (const pin of targetPincodes) {
        // Find latest snapshot for this pincode/category
        const latestSnapshot = await ProductSnapshot.findOne({
            pincode: pin,
            $or: [{ category: cat }]
        }).sort({ scrapedAt: -1 }).select('scrapedAt');

        if (!latestSnapshot) continue;
        const targetScrapedAt = latestSnapshot.scrapedAt;

        // Fetch Snapshots for this specific time slice
        const allProductIds = new Set();
        groups.forEach(g => {
            g.products.forEach(p => { if (p.productId) allProductIds.add(p.productId); });
        });

        const snapshots = await ProductSnapshot.find({
            pincode: pin,
            scrapedAt: targetScrapedAt,
            category: cat,
            productId: { $in: Array.from(allProductIds) },
            platform: { $in: activePlatforms },
            $or: [
                { platform: { $ne: 'jiomart' } },
                { platform: 'jiomart', isQuick: { $ne: false } }
            ]
        }).lean();

        const snapshotMap = {};
        snapshots.forEach(snap => {
            const key = `${snap.platform.toLowerCase()}:${snap.productId}`;
            if (!snapshotMap[key] || (snap.ranking && snap.ranking < (snapshotMap[key].ranking || Infinity))) {
                snapshotMap[key] = snap;
            }
        });

        for (const group of groups) {
            const platformMatches = {};
            activePlatforms.forEach(p => { platformMatches[p] = []; });
            let maxVariants = 0;
            let hasData = false;

            group.products.forEach(p => {
                const platformKey = p.platform.toLowerCase();
                const snap = snapshotMap[`${platformKey}:${p.productId}`];
                if (snap) {
                    const matchKey = Object.keys(platformMatches).find(k => k.toLowerCase() === platformKey);
                    if (matchKey) {
                        platformMatches[matchKey].push(snap);
                        hasData = true;
                        if (platformMatches[matchKey].length > maxVariants) maxVariants = platformMatches[matchKey].length;
                    }
                }
            });

            if (hasData) {
                // Sort variants
                Object.keys(platformMatches).forEach(platform => {
                    platformMatches[platform].sort((a, b) => {
                        const rA = a.ranking && !isNaN(a.ranking) ? a.ranking : Infinity;
                        const rB = b.ranking && !isNaN(b.ranking) ? b.ranking : Infinity;
                        if (rA !== rB) return rA - rB;
                        return Number(a.currentPrice || 0) - Number(b.currentPrice || 0);
                    });
                });

                const pushRowToExport = (platformDataMap, groupIdStr) => {
                    const dateObj = new Date(targetScrapedAt);
                    const excelRow = {
                        date: dateObj.toLocaleDateString(),
                        pincode: pin,
                        category: cat,
                        productName: group.primaryName,
                        brand: group.brand || '-',
                        groupId: groupIdStr,
                        productWeight: group.primaryWeight || 'N/A'
                    };

                    const groupCreated = group.createdAt ? new Date(group.createdAt) : null;
                    // NG Logic: Group created at or after the latest scrape time for this category
                    const isNG = groupCreated && groupCreated >= new Date(targetScrapedAt);
                    excelRow.ngStatus = isNG ? 'NG' : '-';

                    activePlatforms.forEach(p => {
                        const pData = platformDataMap[p];
                        if (pData) {
                            excelRow[`${p}_name`] = pData.productName || pData.name || '-';
                            excelRow[`${p}_productId`] = pData.productId ? String(pData.productId).split('__')[0] : '-';
                            excelRow[`${p}_aid`] = pData.productId || '-';
                            excelRow[`${p}_otherSubcategory`] = pData.subCategory || '-';
                            if (p === 'jiomart') excelRow[`${p}_articleCategory`] = extractArticleCategory(pData.productName || pData.name);
                            excelRow[`${p}_available`] = 'Yes';
                            excelRow[`${p}_price`] = pData.currentPrice;
                            excelRow[`${p}_originalPrice`] = pData.originalPrice || '-';
                            excelRow[`${p}_discount`] = pData.discountPercentage ? `${Math.round(pData.discountPercentage)}%` : '-';
                            excelRow[`${p}_stock`] = pData.isOutOfStock ? 'Out of Stock' : 'In Stock';
                            const pUrl = pData.productUrl || pData.url || pData.link || pData.productLink;
                            excelRow[`${p}_link`] = pUrl ? { text: 'Link', hyperlink: pUrl } : '-';
                            excelRow[`${p}_isAd`] = pData.isAd ? 'Yes' : 'No';
                            excelRow[`${p}_rating`] = pData.rating || '-';
                            excelRow[`${p}_rank`] = pData.ranking || '-';
                            
                            const displayQty = (pData.quantity && pData.quantity !== '') ? pData.quantity : (pData.productWeight || '-');
                            excelRow[`${p}_quantity`] = displayQty;
                            
                            const apiComboValue = (pData.combo === null || pData.combo === undefined || pData.combo === 'N/A') ? 1 : pData.combo;
                            
                            if (p === 'zepto') {
                                excelRow[`zepto_combo_api`] = apiComboValue;
                                excelRow[`zepto_combo`] = extractComboFromQuantity(String(displayQty));
                            } else {
                                excelRow[`${p}_combo`] = apiComboValue;
                            }
                            
                            excelRow[`${p}_pricePerUnit`] = extractPricePerUnit(pData.currentPrice, displayQty);
                            excelRow[`${p}_deliveryTime`] = pData.deliveryTime || '-';
                            excelRow[`${p}_isNew`] = pData.new === true ? 'New' : 'Old';

                            const officialCat = pData.officialCategory;
                            if (officialCat && officialCat !== '-') {
                                excelRow[`${p}_officialCategory`] = officialCat;
                                excelRow[`${p}_officialSubCategory`] = pData.officialSubCategory || '-';
                            } else {
                                let lookupKey = `${p}|${(pData.categoryUrl || pData.productUrl || '').trim().toLowerCase()}`;
                                const fallback = urlToCategoryMap.get(lookupKey);
                                if (fallback) {
                                    excelRow[`${p}_officialCategory`] = fallback.officialCategory || '-';
                                    excelRow[`${p}_officialSubCategory`] = fallback.officialSubCategory || '-';
                                } else {
                                    const masterKey = `${p}|${cat}`;
                                    const masterFallback = masterCategoryMap.get(masterKey);
                                    excelRow[`${p}_officialCategory`] = masterFallback?.officialCategory || '-';
                                    excelRow[`${p}_officialSubCategory`] = masterFallback?.officialSubCategory || '-';
                                }
                            }
                        } else {
                            excelRow[`${p}_name`] = '-';
                            excelRow[`${p}_available`] = 'No';
                            excelRow[`${p}_price`] = null;
                            excelRow[`${p}_stock`] = '-';
                            excelRow[`${p}_officialCategory`] = '-';
                            excelRow[`${p}_officialSubCategory`] = '-';
                        }
                    });
                    allProcessedRows.push(excelRow);
                };

                for (let i = 0; i < maxVariants; i++) {
                    const dataMap = {};
                    activePlatforms.forEach(p => {
                        dataMap[p] = platformMatches[p][i] || (i === 0 ? null : null);
                    });
                    // For variants beyond the first, we only want rows where THAT platform has data
                    if (i === 0) {
                        pushRowToExport(dataMap, group.groupingId || group._id.toString());
                    } else {
                        Object.keys(platformMatches).forEach(p => {
                            if (platformMatches[p][i]) {
                                const singleMap = {};
                                activePlatforms.forEach(plat => { singleMap[plat] = plat === p ? platformMatches[p][i] : null; });
                                pushRowToExport(singleMap, `${group.groupingId || group._id.toString()}_dup_${i}`);
                            }
                        });
                    }
                }
            }
        }
    }
    // Set Hide/Present status
    allProcessedRows.forEach(row => {
        row.hideSimilarStatus = String(row.groupId).includes('_dup_') ? 'Hide' : 'Present';
    });
    return allProcessedRows;
}

export async function POST(req) {
    try {
        await dbConnect();
        const body = await req.json();
        const { stage, jobId, category, email, platforms = [], categories = [], pincodes = [], exportType } = body;

        const AVAILABLE_PLATFORMS = ['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'];

        // --- STAGE: INIT ---
        if (stage === 'init') {
            const newJobId = uniqid('exp_');
            const activePlatforms = ((!platforms.length || platforms.includes('all')) 
                ? AVAILABLE_PLATFORMS 
                : platforms.map(p => p.toLowerCase().trim()).filter(p => AVAILABLE_PLATFORMS.includes(p)))
                .sort((a, b) => AVAILABLE_PLATFORMS.indexOf(a) - AVAILABLE_PLATFORMS.indexOf(b));

            let targetCategories = categories;
            if (!categories.length || categories.includes('all')) {
                targetCategories = await getDistinctValues('category');
            }

            let targetPincodes = pincodes;
            if (!pincodes.length) targetPincodes = await getDistinctValues('pincode');

            const jobMeta = {
                activePlatforms,
                targetPincodes,
                exportType,
                email: email || '',
                categoryList: targetCategories
            };

            await redis.hmset(`job:${newJobId}:meta`, jobMeta);
            await redis.expire(`job:${newJobId}:meta`, 14400); // 4 hours

            return NextResponse.json({ jobId: newJobId, categories: targetCategories });
        }

        // --- STAGE: PROCESS ---
        if (stage === 'process') {
            if (!jobId || !category) return NextResponse.json({ error: 'Missing jobId or category' }, { status: 400 });

            const meta = await redis.hgetall(`job:${jobId}:meta`);
            if (!meta) return NextResponse.json({ error: 'Job not found or expired' }, { status: 404 });

            const rows = await generateRowsForCategory({
                cat: category,
                targetPincodes: meta.targetPincodes,
                activePlatforms: meta.activePlatforms,
                exportType: meta.exportType
            });

            if (rows.length > 0) {
                // Sharding: Choose client based on category index in the original list
                const catList = meta.categoryList || [];
                const catIndex = catList.indexOf(category);
                const client = clients[(catIndex >= 0 ? catIndex : 0) % clients.length];

                // Store in batches
                const chunkSize = 100;
                for (let i = 0; i < rows.length; i += chunkSize) {
                    const chunk = rows.slice(i, i + chunkSize);
                    await client.rpush(`job:${jobId}:rows`, ...chunk);
                }
                await client.expire(`job:${jobId}:rows`, 14400);
            }

            return NextResponse.json({ success: true, rowCount: rows.length });
        }

        // --- STAGE: FINALIZE ---
        if (stage === 'finalize') {
            if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });

            const meta = await redis.hgetall(`job:${jobId}:meta`);
            if (!meta) return NextResponse.json({ error: 'Job not found or expired' }, { status: 404 });

            const activePlatforms = meta.activePlatforms;
            
            // AGGREGATE FROM ALL SHARDS WITH PAGINATION
            const allProcessedRows = [];
            for (const client of clients) {
                let cursor = 0;
                const batchSize = 1000;
                while (true) {
                    const chunk = await client.lrange(`job:${jobId}:rows`, cursor, cursor + batchSize - 1);
                    if (!chunk || chunk.length === 0) break;
                    
                    allProcessedRows.push(...chunk);
                    cursor += batchSize;
                    if (chunk.length < batchSize) break;
                }
            }

            if (allProcessedRows.length === 0) {
                return NextResponse.json({ error: 'No data found' }, { status: 404 });
            }

            // --- SCAN FOR SERVICEABILITY ---
            const platformServiceability = {};
            activePlatforms.forEach(platform => {
                platformServiceability[platform] = allProcessedRows.some(row => row[`${platform}_available`] === 'Yes');
            });

            // Sorting
            allProcessedRows.sort((a, b) => {
                if (a.pincode !== b.pincode) return String(a.pincode).localeCompare(String(b.pincode));
                if (a.category !== b.category) return String(a.category).localeCompare(String(b.category));
                return String(a.productName).localeCompare(String(b.productName));
            });

            const tempFilePath = path.join(os.tmpdir(), `${jobId}.xlsx`);
            const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: tempFilePath, useStyles: true, useSharedStrings: true });
            const worksheet = workbook.addWorksheet('Comparison Data', { views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }] });

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

            const usStatusColumns = [];

            activePlatforms.forEach(platform => {
                const pName = platform.charAt(0).toUpperCase() + platform.slice(1);
                
                if (platformServiceability[platform]) {
                    columns.push(
                        { header: `${pName} Name`, key: `${platform}_name`, width: 30 },
                        { header: `${pName} Product ID`, key: `${platform}_productId`, width: 15 },
                        { header: `${pName} AID`, key: `${platform}_aid`, width: 20 },
                        { header: `${pName} Avail`, key: `${platform}_available`, width: 10 },
                        { header: `${pName} Price`, key: `${platform}_price`, width: 12, style: { numFmt: '₹#,##0.00' } },
                        { header: `${pName} Original Price`, key: `${platform}_originalPrice`, width: 15 },
                        { header: `${pName} Discount`, key: `${platform}_discount`, width: 12 },
                        { header: `${pName} Price/Unit`, key: `${platform}_pricePerUnit`, width: 15 },
                        { header: `${pName} Quantity`, key: `${platform}_quantity`, width: 12 }
                    );

                    if (platform === 'zepto') {
                        columns.push(
                            { header: `${pName} Combo API Response`, key: `zepto_combo_api`, width: 20 },
                            { header: `${pName} Combo`, key: `zepto_combo`, width: 10 }
                        );
                    } else {
                        columns.push({ header: `${pName} Combo`, key: `${platform}_combo`, width: 10 });
                    }

                    columns.push(
                        { header: `${pName} Stock`, key: `${platform}_stock`, width: 12 },
                        { header: `${pName} Link`, key: `${platform}_link`, width: 15, style: { font: { color: { argb: 'FF0000FF' }, underline: true } } },
                        { header: `${pName} Is Ad`, key: `${platform}_isAd`, width: 10 },
                        { header: `${pName} Rating`, key: `${platform}_rating`, width: 10 },
                        { header: `${pName} Rank`, key: `${platform}_rank`, width: 10 },
                        { header: `${pName} Is New Status`, key: `${platform}_isNew`, width: 15 },
                        { header: `${pName} Delivery Time`, key: `${platform}_deliveryTime`, width: 20 }
                    );

                    if (platform === 'jiomart') {
                        columns.push({ header: `${pName} Article Category`, key: `${platform}_articleCategory`, width: 20 });
                    }

                    columns.push(
                        { header: `${pName} Official Category`, key: `${platform}_officialCategory`, width: 20 },
                        { header: `${pName} Official Sub-cat`, key: `${platform}_officialSubCategory`, width: 20 }
                    );
                } else {
                    const usKey = `${platform}_usStatus`;
                    columns.push({ header: pName, key: usKey, width: 15 });
                    usStatusColumns.push(usKey);
                }
            });

            worksheet.columns = columns;
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

            allProcessedRows.forEach(row => {
                activePlatforms.forEach(platform => {
                    if (!platformServiceability[platform]) {
                        row[`${platform}_usStatus`] = 'U/S';
                    }
                });

                const excelRow = worksheet.addRow(row);
                
                // Color NG Status
                const ngCell = excelRow.getCell('ngStatus');
                if (ngCell.value === 'NG') {
                    ngCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBBF7D0' } }; // Light Green
                    ngCell.font = { color: { argb: 'FF166534' }, bold: true };
                }

                const hideCell = excelRow.getCell('hideSimilarStatus');
                if (hideCell.value === 'Hide') {
                    hideCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                    hideCell.font = { color: { argb: 'FF991B1B' }, bold: true };
                }

                activePlatforms.forEach(platform => {
                    if (platformServiceability[platform]) {
                        // Stock Color
                        const stockCell = excelRow.getCell(`${platform}_stock`);
                        if (stockCell.value === 'In Stock') stockCell.font = { color: { argb: 'FF16A34A' } }; // Green
                        else if (stockCell.value === 'Out of Stock') stockCell.font = { color: { argb: 'FFDC2626' } }; // Red

                        // Available Color
                        const availCell = excelRow.getCell(`${platform}_available`);
                        if (availCell.value === 'Yes') availCell.font = { color: { argb: 'FF16A34A' } }; // Green
                        else if (availCell.value === 'No') availCell.font = { color: { argb: 'FFDC2626' } }; // Red
                    }
                });

                usStatusColumns.forEach(key => {
                    const cell = excelRow.getCell(key);
                    cell.font = { color: { argb: 'FFFF0000' }, bold: true };
                    cell.alignment = { horizontal: 'center' };
                });

                excelRow.commit();
            });

            await workbook.commit();

            const fileBuffer = fs.readFileSync(tempFilePath);
            fs.unlinkSync(tempFilePath);

            // Cleanup all Redis shards
            const cleanupKeys = [`job:${jobId}:meta`, `job:${jobId}:rows`];
            for (const client of clients) {
                for (const k of cleanupKeys) {
                    try { await client.del(k); } catch (e) {}
                }
            }

            if (meta.email) {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
                });

                await transporter.sendMail({
                    from: `"Quick Commerce Export" <${process.env.EMAIL_USER}>`,
                    to: meta.email,
                    subject: 'Category Comparison Export',
                    text: 'Please find the attached export file.',
                    attachments: [{ filename: 'comparison_data.xlsx', content: fileBuffer }]
                });

                return NextResponse.json({ success: true, message: 'Email sent' });
            }

            return new NextResponse(fileBuffer, {
                headers: {
                    'Content-Disposition': `attachment; filename="comparison_data_${Date.now()}.xlsx"`,
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
            });
        }

        return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });

    } catch (error) {
        console.error('❌ Export error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
