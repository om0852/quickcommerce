import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';
import nodemailer from 'nodemailer';
import ExcelJS from 'exceljs';
import _ from 'lodash';
import { mergeProductsAcrossPlatforms } from '@/lib/productMatching';

export async function POST(req) {
    try {
        await dbConnect();

        const body = await req.json();
        const {
            startDate,
            endDate,
            email,
            platforms = [],
            products = [],
            categories = [],
            pincodes = []
        } = body;

        // Validation
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        console.log('Export request:', { startDate, endDate, email, platforms, categories, pincodes });

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
                    // 14 days lookback
                    const lookbackDate = new Date();
                    lookbackDate.setDate(lookbackDate.getDate() - 14);

                    // Find all distinct timestamps in the last 14 days
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
                        jiomart: []
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
                                scrapedAt: snap.scrapedAt
                            });
                        }
                    });

                    // 4. Merge using shared logic to ensure consistent order/matching
                    // CRITICAL: We only merge products from the SAME timestamp.
                    const mergedProducts = mergeProductsAcrossPlatforms(
                        productsByPlatform.zepto,
                        productsByPlatform.blinkit,
                        productsByPlatform.jiomart
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
                        ['zepto', 'blinkit', 'jiomart'].forEach(p => {
                            if (product[p]) {
                                rowData[`${p}_available`] = 'Yes';
                                rowData[`${p}_price`] = product[p].currentPrice;
                                rowData[`${p}_rank`] = product[p].ranking;
                                rowData[`${p}_stock`] = product[p].isOutOfStock ? 'Out of Stock' : 'In Stock';
                            } else {
                                rowData[`${p}_available`] = 'No';
                                rowData[`${p}_price`] = null;
                                rowData[`${p}_rank`] = null;
                                rowData[`${p}_stock`] = '-';
                            }
                        });

                        allProcessedRows.push(rowData);
                    });
                }
            }
        }

        if (allProcessedRows.length === 0) {
            return NextResponse.json({ error: 'No data found for the selected filters' }, { status: 404 });
        }

        // Use collected unique platforms for columns or default to standard 3
        const allPlatforms = Array.from(uniquePlatforms).sort();

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
                { header: `${pName} Available`, key: `${platform}_available`, width: 15 },
                { header: `${pName} Price`, key: `${platform}_price`, width: 12, style: { numFmt: '₹#,##0.00' } },
                { header: `${pName} Rank`, key: `${platform}_rank`, width: 10 },
                { header: `${pName} Stock`, key: `${platform}_stock`, width: 12 }
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
            console.warn('EMAIL_USER or EMAIL_PASS not set. Cannot send email.');
            return NextResponse.json({ error: 'Server email configuration missing' }, { status: 500 });
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

        return NextResponse.json({ success: true, message: 'Email sent successfully' });

    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
