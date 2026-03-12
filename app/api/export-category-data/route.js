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

        // Helper to get distinct values if 'all' is selected
        const getDistinctValues = async (field, filters = {}) => {
            return await ProductSnapshot.distinct(field, filters);
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
                        { officialCategory: cat }
                    ]
                }).sort({ scrapedAt: -1 }).select('scrapedAt');

                if (!latestSnapshot) continue; // No data for this pincode/cat
                targetScrapedAt = latestSnapshot.scrapedAt;

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
                    productId: { $in: Array.from(allProductIds) }
                }).lean();

                const snapshotMap = {};
                snapshots.forEach(snap => {
                    snapshotMap[`${snap.platform}:${snap.productId}`] = snap;
                });

                // 3. Iterate GROUPS to build rows (Strict Sequence)
                for (const group of groups) {
                    let hasData = false;

                    // Build the Product Object (Merged)
                    // We match the group's product definitions to the fetched snapshots

                    const productRow = {
                        name: group.primaryName, // Use Group Name as primary
                        image: group.primaryImage,
                        weight: group.primaryWeight,
                        zepto: null, blinkit: null, jiomart: null, dmart: null, flipkartMinutes: null, instamart: null
                    };

                    // Check platforms in this group
                    group.products.forEach(p => {
                        const snap = snapshotMap[`${p.platform}:${p.productId}`];
                        if (snap) {
                            uniquePlatforms.add(p.platform);
                            hasData = true;

                            // Map snapshot to platform key
                            // We construct the "platform object" equal to what we had before for the row generation
                            productRow[p.platform] = {
                                ...snap,
                                currentPrice: snap.currentPrice,
                                originalPrice: snap.originalPrice,
                                discountPercentage: snap.discountPercentage,
                                isOutOfStock: snap.isOutOfStock,
                                productUrl: snap.productUrl,
                                isAd: snap.isAd,
                                rating: snap.rating,
                                ranking: snap.ranking,
                                deliveryTime: snap.deliveryTime,
                                quantity: snap.quantity,
                                combo: snap.combo,
                                priceChange: snap.priceChange || 0,
                                discountChange: snap.discountChange || 0,
                                rankingChange: snap.rankingChange || 0,
                                productWeight: snap.productWeight,
                                categoryUrl: snap.categoryUrl,
                                officialCategory: snap.officialCategory,
                                officialSubCategory: snap.officialSubCategory
                            };
                        }
                    });

                    if (hasData) {
                        // Create Export Row
                        const dateObj = new Date(targetScrapedAt);

                        const excelRow = {
                            date: dateObj.toLocaleDateString(),
                            time: dateObj.toLocaleTimeString(),
                            pincode: pin,
                            category: cat,
                            productName: productRow.name,
                            productWeight: productRow.weight || 'N/A',
                            // Store productRow reference for hide-similar computation (removed before Excel write)
                            _productRowRef: productRow
                        };

                        // Fill Platform Columns
                        ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].forEach(p => {
                            const pData = productRow[p];
                            if (pData) {
                                excelRow[`${p}_available`] = 'Yes';
                                excelRow[`${p}_price`] = pData.currentPrice;
                                excelRow[`${p}_originalPrice`] = pData.originalPrice || '-';
                                excelRow[`${p}_discount`] = pData.discountPercentage ? `${Math.round(pData.discountPercentage)}%` : '-';
                                excelRow[`${p}_stock`] = pData.isOutOfStock ? 'Out of Stock' : 'In Stock';
                                excelRow[`${p}_link`] = pData.productUrl || '';
                                excelRow[`${p}_isAd`] = pData.isAd ? 'Yes' : 'No';
                                excelRow[`${p}_rating`] = pData.rating || '-';
                                excelRow[`${p}_rank`] = pData.ranking || '-';
                                excelRow[`${p}_combo`] = pData.combo || '-';
                                excelRow[`${p}_quantity`] = pData.quantity || '-';
                                excelRow[`${p}_deliveryTime`] = pData.deliveryTime
                                    ? (pData.deliveryTime.match(/^\d+\s*mins?/i)?.[0] || pData.deliveryTime)
                                    : '-';
                                excelRow[`${p}_isNew`] = pData.new === true ? 'New' : 'Old';

                                // Change fields
                                excelRow[`${p}_priceChange`] = pData.priceChange;
                                excelRow[`${p}_discountChange`] = pData.discountChange;
                                excelRow[`${p}_rankingChange`] = pData.rankingChange;

                                // Categories
                                const officialCategory = pData.officialCategory;
                                const officialSubCategory = pData.officialSubCategory;

                                if (officialCategory && officialCategory !== '-') {
                                    excelRow[`${p}_officialCategory`] = officialCategory;
                                    excelRow[`${p}_officialSubCategory`] = officialSubCategory || '-';
                                } else {
                                    // Fallback
                                    let lookupKey = `${p}|${(pData.categoryUrl || '').trim().toLowerCase()}`;
                                    const fallback = urlToCategoryMap.get(lookupKey);
                                    if (fallback) {
                                        excelRow[`${p}_officialCategory`] = fallback.officialCategory || '-';
                                        excelRow[`${p}_officialSubCategory`] = fallback.officialSubCategory || '-';
                                    } else {
                                        // Master Fallback
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
                                // unavailable
                                excelRow[`${p}_available`] = 'No';
                                excelRow[`${p}_price`] = null;
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
                    }
                } // End Group Loop

                // --- Compute Hide Similar Status for this pincode+category block ---
                // Mirrors the UI's Union-Find deduplication ("Hide Similar" toggle)
                const blockRows = allProcessedRows.filter(r => r.pincode === pin && r.category === cat);
                const blockPlatforms = ['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart', 'flipkartMinutes'];

                const getBaseId = (productId) =>
                    productId.split('__')[0].replace(/-[a-z]$/i, '');

                const nBlock = blockRows.length;
                const parent = Array.from({ length: nBlock }, (_, i) => i);
                const find = (i) => {
                    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
                    return i;
                };
                const union = (i, j) => {
                    const pi = find(i), pj = find(j);
                    if (pi !== pj) parent[pi] = pj;
                };

                const baseIdMap = {};
                blockRows.forEach((row, i) => {
                    const pr = row._productRowRef;
                    if (!pr) return;
                    blockPlatforms.forEach(plat => {
                        const pid = pr[plat]?.productId;
                        if (pid) {
                            const key = `${plat}:${getBaseId(pid)}`;
                            if (baseIdMap[key] !== undefined) {
                                union(i, baseIdMap[key]);
                            } else {
                                baseIdMap[key] = i;
                            }
                        }
                    });
                });

                // Group indices by Union-Find root
                const ufGroups = {};
                blockRows.forEach((_, i) => {
                    const root = find(i);
                    if (!ufGroups[root]) ufGroups[root] = [];
                    ufGroups[root].push(i);
                });

                const getPlatformCount = (pr) => blockPlatforms.filter(p => pr[p]).length;
                const getMinRank = (pr) => {
                    let min = Infinity;
                    blockPlatforms.forEach(key => {
                        if (pr[key]?.ranking !== undefined && pr[key]?.ranking !== null) {
                            const num = Number(pr[key].ranking);
                            if (!isNaN(num) && num < min) min = num;
                        }
                    });
                    return min;
                };

                // Determine which indices are "Present" (kept) vs "Hide" (filtered out)
                const presentIndices = new Set();
                Object.values(ufGroups).forEach(group => {
                    if (group.length === 1) {
                        presentIndices.add(group[0]);
                        return;
                    }
                    const multiPlatform = group.filter(i => {
                        const pr = blockRows[i]._productRowRef;
                        return pr && getPlatformCount(pr) > 1;
                    });
                    if (multiPlatform.length > 0) {
                        multiPlatform.forEach(i => presentIndices.add(i));
                    } else {
                        // All single-platform: keep only lowest-rank one
                        let bestIdx = group[0];
                        let bestRank = getMinRank(blockRows[group[0]]._productRowRef || {});
                        for (let k = 1; k < group.length; k++) {
                            const pr = blockRows[group[k]]._productRowRef || {};
                            const r = getMinRank(pr);
                            if (r < bestRank) { bestRank = r; bestIdx = group[k]; }
                        }
                        presentIndices.add(bestIdx);
                    }
                });

                // Annotate each row
                blockRows.forEach((row, i) => {
                    row.hideSimilarStatus = presentIndices.has(i) ? 'Present' : 'Hide';
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


        // Sorting Logic: Sort by Match Count (High availability first)
        const sortPlatforms = ['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart', 'flipkartMinutes'];

        allProcessedRows.sort((a, b) => {
            // 1. Primary Sort: Pincode (Ascending) - Group by Location
            if (a.pincode !== b.pincode) {
                return (a.pincode || '').toString().localeCompare((b.pincode || '').toString());
            }

            // 2. Secondary Sort: Category (Ascending) - Group by Category within Pincode
            if (a.category !== b.category) {
                return (a.category || '').localeCompare(b.category || '');
            }

            // 3. Tertiary Sort: Match Count (High availability first)
            const countA = sortPlatforms.filter(p => a[`${p}_available`] === 'Yes').length;
            const countB = sortPlatforms.filter(p => b[`${p}_available`] === 'Yes').length;

            if (countA !== countB) {
                return countB - countA; // Descending
            }

            // 4. Quaternary Sort: Product Name (Ascending)
            return (a.productName || '').localeCompare(b.productName || '');
        });

        // Use collected unique platforms for columns BUT enforce specific order
        // User Request: "even they are no have nay product still show there columns"
        // So we strictly use ONE fixed list of all platforms, regardless of what data was found.
        const allPlatforms = ['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'];

        try {
            const debugPath = path.join(process.cwd(), 'debug_export_data.json');
            fs.writeFileSync(debugPath, JSON.stringify(allProcessedRows, null, 2));
            console.log(`✅ Debug data dumped to ${debugPath}`);
        } catch (err) {
            console.error('❌ Failed to dump debug data:', err);
        }

        // Generate Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Comparison Data');

        // Define Base Columns
        const columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Time', key: 'time', width: 12 },
            { header: 'Pincode', key: 'pincode', width: 10 },
            { header: 'Category', key: 'category', width: 15 },
            { header: 'Product Name', key: 'productName', width: 30 },
            { header: 'Weight', key: 'productWeight', width: 10 },
            { header: 'Hide Similar Status', key: 'hideSimilarStatus', width: 20 },
        ];

        // Add Dynamic Columns for each Platform
        allPlatforms.forEach(platform => {
            const pName = platform.charAt(0).toUpperCase() + platform.slice(1);
            columns.push(
                { header: `${pName} Avail`, key: `${platform}_available`, width: 10 },
                { header: `${pName} Price`, key: `${platform}_price`, width: 12, style: { numFmt: '₹#,##0.00' } },
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

                // Official Category Columns
                { header: `${pName} Official Cat`, key: `${platform}_officialCategory`, width: 20 },
                { header: `${pName} Official Sub-cat`, key: `${platform}_officialSubCategory`, width: 20 }
            );
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

            // Conditional Formatting
            allPlatforms.forEach(platform => {
                const availCell = excelRow.getCell(`${platform}_available`);
                if (availCell.value === 'Yes') {
                    availCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFDCFCE7' } // Light Green
                    };
                    availCell.font = { color: { argb: 'FF166534' } }; // Dark Green Text
                } else {
                    availCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFEE2E2' } // Light Red
                    };
                    availCell.font = { color: { argb: 'FF991B1B' } }; // Dark Red Text
                }

                const stockCell = excelRow.getCell(`${platform}_stock`);
                if (stockCell.value === 'In Stock') {
                    stockCell.font = { color: { argb: 'FF166534' } };
                } else if (stockCell.value === 'Out of Stock') {
                    stockCell.font = { color: { argb: 'FFDC2626' } };
                }

                // Is New column styling
                const isNewCell = excelRow.getCell(`${platform}_isNew`);
                if (isNewCell.value === 'New') {
                    isNewCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; // Light Blue
                    isNewCell.font = { color: { argb: 'FF1E40AF' }, bold: true }; // Dark Blue
                }

                // Format link cells as hyperlinks
                const linkCell = excelRow.getCell(`${platform}_link`);
                if (linkCell.value && linkCell.value !== '') {
                    linkCell.value = {
                        text: 'View',
                        hyperlink: linkCell.value
                    };
                    linkCell.font = {
                        color: { argb: 'FF0000FF' }, // Blue
                        underline: true
                    };
                }
            });
        });

        // Using the latest date found across all rows for the filename/email subject might be ambiguous but we'll use "Latest"
        const latestDate = new Date(); // Current export time

        // Freeze Header
        worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

        const buffer = await workbook.xlsx.writeBuffer();

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
