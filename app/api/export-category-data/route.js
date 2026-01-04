import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';
import nodemailer from 'nodemailer';
import ExcelJS from 'exceljs';
import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import { mergeProductsAcrossPlatforms } from '@/lib/productMatching';
import categoryData from '@/app/utils/categories_with_urls.json';

// Build a quick lookup map for URL -> Official Category info
const urlToCategoryMap = new Map();

try {
    Object.keys(categoryData).forEach(masterCat => {
        const platforms = categoryData[masterCat];
        Object.keys(platforms).forEach(platform => {
            const items = platforms[platform];
            if (Array.isArray(items)) {
                items.forEach(item => {
                    if (item.url) {
                        // Normalize URL: remove query params for robust matching if needed, 
                        // but strictly following user instructions we check "url". 
                        // For now, we store exact URL and assume scraper keeps it intact.
                        // Key: platform + '|' + url
                        const key = `${platform}|${item.url.trim()}`;
                        urlToCategoryMap.set(key, {
                            officialCategory: item.officialCategory,
                            officialSubCategory: item.officialSubCategory
                        });
                    }
                });
            }
        });
    });
    console.log(`✅ Loaded ${urlToCategoryMap.size} URLs into category lookup map`);
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

        // Loop through each combination to find the distinct latest snapshot for THAT unique combo
        for (const cat of targetCategories) {
            for (const pin of targetPincodes) {

                let targettimestamps = [];

                if (body.exportType === 'unique') {
                    // 7 days lookback
                    const lookbackDate = new Date();
                    lookbackDate.setDate(lookbackDate.getDate() - 7);

                    // Find all distinct timestamps in the last 7 days
                    const snapshots = await ProductSnapshot.find({
                        category: cat,
                        pincode: pin,
                        scrapedAt: { $gte: lookbackDate },
                        ...(platforms.length > 0 && !platforms.includes('all') ? { platform: { $in: platforms } } : {})
                    }).distinct('scrapedAt');

                    // Sort descending (latest first)
                    targettimestamps = snapshots.sort((a, b) => b - a);
                } else {
                    // Default 'latest': just the single newest one
                    const latestSnapshot = await ProductSnapshot.findOne({
                        category: cat,
                        pincode: pin,
                        ...(platforms.length > 0 && !platforms.includes('all') ? { platform: { $in: platforms } } : {})
                    }).sort({ scrapedAt: -1 }).select('scrapedAt').lean();

                    if (latestSnapshot) {
                        targettimestamps = [latestSnapshot.scrapedAt];
                    }
                }

                if (!targettimestamps.length) continue;

                const seenProductsInThisCategoryPincode = new Set();

                // Iterate through timestamps (newest to oldest)
                for (const scrapedAt of targettimestamps) {

                    // 2. Fetch all products for this specific session
                    const query = {
                        category: cat,
                        pincode: pin,
                        scrapedAt: scrapedAt
                    };
                    if (platforms.length > 0 && !platforms.includes('all')) {
                        query.platform = { $in: platforms };
                    }

                    // Sorting helps the platform grouping if we were doing it manually, but for splitting arrays it's fine
                    const snapshots = await ProductSnapshot.find(query).sort({ platform: 1, ranking: 1 }).lean();

                    if (!snapshots.length) continue;

                    // 3. Partition by platform
                    const productsByPlatform = {
                        zepto: [],
                        blinkit: [],
                        jiomart: [],
                        dmart: []
                    };

                    snapshots.forEach(snap => {
                        uniquePlatforms.add(snap.platform);
                        if (productsByPlatform[snap.platform]) {
                            productsByPlatform[snap.platform].push({
                                productId: snap.productId,
                                productName: snap.productName,
                                productImage: snap.productImage,
                                productWeight: snap.productWeight,
                                rating: snap.rating,
                                currentPrice: snap.currentPrice,
                                originalPrice: snap.originalPrice,
                                discountPercentage: snap.discountPercentage,
                                ranking: snap.ranking,
                                priceChange: snap.priceChange,
                                discountChange: snap.discountChange,
                                rankingChange: snap.rankingChange,
                                productUrl: snap.productUrl,
                                isOutOfStock: snap.isOutOfStock,
                                isOutOfStock: snap.isOutOfStock,
                                quantity: snap.quantity,
                                combo: snap.combo,
                                deliveryTime: snap.deliveryTime,
                                isAd: snap.isAd,
                                scrapedAt: snap.scrapedAt,
                                officialCategory: snap.officialCategory,
                                officialSubCategory: snap.officialSubCategory,
                                categoryUrl: snap.categoryUrl
                            });
                        }
                    });

                    // 4. Merge using shared logic to ensure consistent order/matching
                    // CRITICAL: We only merge products from the SAME timestamp.
                    const mergedProducts = mergeProductsAcrossPlatforms(
                        productsByPlatform.zepto,
                        productsByPlatform.blinkit,
                        productsByPlatform.jiomart,
                        productsByPlatform.dmart
                    );

                    // 5. Add to processed rows IF not already seen (for unique mode)
                    // For 'latest' mode, seenProducts won't matter as there's only one iteration.
                    mergedProducts.forEach(product => {
                        // Check product name filter if exists
                        if (products.length > 0 && !products.includes('all') && !products.includes(product.name)) {
                            return;
                        }

                        // Create a unique key for deduplication
                        const uniqueKey = product.name.toLowerCase().trim();

                        if (body.exportType === 'unique') {
                            if (seenProductsInThisCategoryPincode.has(uniqueKey)) {
                                return; // Skip if we already have a newer version of this product
                            }
                            seenProductsInThisCategoryPincode.add(uniqueKey);
                        }

                        const dateObj = new Date(scrapedAt);

                        const rowData = {
                            date: dateObj.toLocaleDateString(),
                            time: dateObj.toLocaleTimeString(),
                            pincode: pin,
                            category: cat,
                            productName: product.name,
                            productWeight: product.weight || 'N/A'
                        };

                        // Platforms
                        ['zepto', 'blinkit', 'jiomart', 'dmart'].forEach(p => {
                            if (product[p]) {
                                rowData[`${p}_available`] = 'Yes';
                                rowData[`${p}_price`] = product[p].currentPrice;
                                rowData[`${p}_originalPrice`] = product[p].originalPrice || '-';
                                rowData[`${p}_discount`] = product[p].discountPercentage ? `${Math.round(product[p].discountPercentage)}%` : '-';
                                rowData[`${p}_stock`] = product[p].isOutOfStock ? 'Out of Stock' : 'In Stock';
                                rowData[`${p}_link`] = product[p].url || '';
                                rowData[`${p}_isAd`] = product[p].isAd ? 'Yes' : 'No';
                                rowData[`${p}_rating`] = product[p].rating || '-';
                                rowData[`${p}_rank`] = product[p].ranking || '-';
                                rowData[`${p}_combo`] = product[p].combo || '-';
                                rowData[`${p}_quantity`] = product[p].quantity || '-';
                                // Updated delivery time logic: Use platform value directly
                                rowData[`${p}_deliveryTime`] = product[p].deliveryTime || '-';

                                // New Tracking Fields
                                rowData[`${p}_priceChange`] = product[p].priceChange || 0;
                                rowData[`${p}_discountChange`] = product[p].discountChange || 0;
                                rowData[`${p}_rankingChange`] = product[p].rankingChange || 0;

                                // Platform Category Parsing
                                const rawSubCat = product[p].subCategory || '';
                                let platformCat = cat; // Default to our main category name
                                let platformSub = rawSubCat;

                                if (rawSubCat.includes(' - ')) {
                                    const parts = rawSubCat.split(' - ');
                                    if (parts.length >= 2) {
                                        platformCat = parts[0];
                                        platformSub = parts.slice(1).join(' - ');
                                    }
                                }

                                rowData[`${p}_platformCategory`] = platformCat;
                                rowData[`${p}_platformSubCategory`] = platformSub;

                                // Official Category Mapping
                                const officialCategory = product[p].officialCategory;
                                const officialSubCategory = product[p].officialSubCategory;

                                if (officialCategory && officialCategory !== '-') {
                                    rowData[`${p}_officialCategory`] = officialCategory;
                                    rowData[`${p}_officialSubCategory`] = officialSubCategory || '-';
                                } else {
                                    // Fallback lookup
                                    const lookupKey = `${p}|${(product[p].categoryUrl || '').trim()}`;
                                    const fallback = urlToCategoryMap.get(lookupKey);

                                    if (fallback) {
                                        rowData[`${p}_officialCategory`] = fallback.officialCategory || '-';
                                        rowData[`${p}_officialSubCategory`] = fallback.officialSubCategory || '-';
                                    } else {
                                        rowData[`${p}_officialCategory`] = '-';
                                        rowData[`${p}_officialSubCategory`] = '-';
                                    }
                                }

                            } else {
                                rowData[`${p}_available`] = 'No';
                                rowData[`${p}_price`] = null;
                                rowData[`${p}_originalPrice`] = '-';
                                rowData[`${p}_discount`] = '-';
                                rowData[`${p}_stock`] = '-';
                                rowData[`${p}_link`] = '';
                                rowData[`${p}_isAd`] = '-';
                                rowData[`${p}_rating`] = '-';
                                rowData[`${p}_rank`] = null;
                                rowData[`${p}_combo`] = '-';
                                rowData[`${p}_quantity`] = '-';
                                rowData[`${p}_deliveryTime`] = '-';
                                rowData[`${p}_priceChange`] = '-';
                                rowData[`${p}_discountChange`] = '-';
                                rowData[`${p}_rankingChange`] = '-';
                                rowData[`${p}_platformCategory`] = '-';
                                rowData[`${p}_platformSubCategory`] = '-';
                                rowData[`${p}_officialCategory`] = '-';
                                rowData[`${p}_officialSubCategory`] = '-';
                            }
                        });


                        allProcessedRows.push(rowData);
                    });
                }
            }
        }

        if (allProcessedRows.length === 0) {
            console.warn('⚠️ Background Export: No data found for the selected filters');
            return; // Or maybe send an email saying "no data found"?
        }

        // Use collected unique platforms for columns or default to standard 3
        const allPlatforms = Array.from(uniquePlatforms).sort();

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
                { header: `${pName} Link`, key: `${platform}_link`, width: 15 },

                // Platform Category Columns
                { header: `${pName} Category`, key: `${platform}_platformCategory`, width: 20 },

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

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('⚠️ EMAIL_USER or EMAIL_PASS not set. Cannot send email.');
            return;
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

    } catch (error) {
        console.error('❌ Background Export Status: FAILED', error);
    }
}

export async function POST(req) {
    try {
        await dbConnect();

        const body = await req.json();
        const { email } = body;

        // Validation
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        console.log('🚀 Starting export process...');

        // Execute the export synchronously to ensure it completes
        await processExportInBackground(body);

        console.log('✅ Export completed and email sent');

        // Response after completion
        return NextResponse.json({
            success: true,
            message: 'Excel file has been generated and sent to your email successfully!'
        });

    } catch (error) {
        console.error('❌ Export request error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
