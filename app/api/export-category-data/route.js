import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';
import nodemailer from 'nodemailer';
import ExcelJS from 'exceljs';
import _ from 'lodash';

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

        // Build Query
        const query = {};

        // Platform Filter
        if (platforms.length > 0 && !platforms.includes('all')) {
            query.platform = { $in: platforms };
        }

        // Category Filter
        if (categories.length > 0 && !categories.includes('all')) {
            query.category = { $in: categories };
        }

        // Pincode Filter
        if (pincodes.length > 0) {
            query.pincode = { $in: pincodes };
        }

        // Product Filter
        if (products.length > 0 && !products.includes('all')) {
            query.productName = { $in: products };
        }

        console.log('Base Query filters:', JSON.stringify(query));

        // Find the latest scrapedAt date
        // sorting by scrapedAt desc to get the latest one
        const latestSnapshot = await ProductSnapshot.findOne(query).sort({ scrapedAt: -1 }).lean();

        if (!latestSnapshot) {
            return NextResponse.json({ error: 'No data found for the selected filters' }, { status: 404 });
        }

        const latestDate = new Date(latestSnapshot.scrapedAt);
        console.log('Latest Snapshot Date found:', latestDate);

        // Create start and end of that specific day to capture all scrapes from that day (or exact timestamp?)
        // The user request says "last updated scrap data". usually this means the last batch.
        // Assuming batch timestamps are identical or very close. 
        // Let's filter for documents with the exact same timestamp if possible, or same minute.
        // Or if we want "last updated day", we use the whole day.
        // Given typically multiple scrapes might happen in a day, user probably wants the specific LAST one.
        // But matching exact ms might be risky if they vary slightly.
        // Let's assume day granularity is safer unless "last updated" implies real-time. 
        // Re-reading: "last updated scrap data". 
        // Let's use the exact timestamp of the latest snapshot found, assuming a batch run has same timestamp. 

        // Actually, safer to grab the latest timestamp and find all records that match that timestamp exactly (or within a minute window if inconsistent).
        // Let's iterate: find distinct scrapedAt values, sort desc, pick first.

        // Logic: Add scrapedAt filter to the query
        query.scrapedAt = latestSnapshot.scrapedAt;

        console.log('Final Query with Date:', JSON.stringify(query));

        // Fetch Data matching that latest timestamp
        const snapshots = await ProductSnapshot.find(query).lean();
        console.log(`Found ${snapshots.length} records for latest timestamp: ${latestSnapshot.scrapedAt}`);

        // Process Data for Pivot/Comparison View
        // 1. Identify all unique platforms present in the data to create columns
        const allPlatforms = _.uniq(snapshots.map(s => s.platform)).sort();

        // 2. Group data by unique identifier: Product + Pincode + Time (approx)
        // Group by Date + Time + Pincode + Product Name
        const groupedData = _.groupBy(snapshots, (doc) => {
            const dateObj = new Date(doc.scrapedAt);
            const dateStr = dateObj.toLocaleDateString();
            const timeStr = dateObj.toLocaleTimeString();
            return `${dateStr}|${timeStr}|${doc.pincode}|${doc.category}|${doc.productName}`;
        });

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
        for (const key in groupedData) {
            const group = groupedData[key];
            const baseDoc = group[0];
            const dateObj = new Date(baseDoc.scrapedAt);

            const rowData = {
                date: dateObj.toLocaleDateString(),
                time: dateObj.toLocaleTimeString(),
                pincode: baseDoc.pincode,
                category: baseDoc.category,
                productName: baseDoc.productName,
                productWeight: baseDoc.productWeight || 'N/A'
            };

            // Fill in platform specific data
            allPlatforms.forEach(platform => {
                const platformDoc = group.find(d => d.platform === platform);

                if (platformDoc) {
                    rowData[`${platform}_available`] = 'Yes';
                    rowData[`${platform}_price`] = platformDoc.currentPrice;
                    rowData[`${platform}_rank`] = platformDoc.ranking;
                    rowData[`${platform}_stock`] = platformDoc.isOutOfStock ? 'Out of Stock' : 'In Stock';
                } else {
                    rowData[`${platform}_available`] = 'No';
                    rowData[`${platform}_price`] = null;
                    rowData[`${platform}_rank`] = null;
                    rowData[`${platform}_stock`] = '-';
                }
            });

            const row = worksheet.addRow(rowData);

            // Conditional Formatting
            allPlatforms.forEach(platform => {
                const availCell = row.getCell(`${platform}_available`);
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

                const stockCell = row.getCell(`${platform}_stock`);
                if (stockCell.value === 'In Stock') {
                    stockCell.font = { color: { argb: 'FF166534' } };
                } else if (stockCell.value === 'Out of Stock') {
                    stockCell.font = { color: { argb: 'FFDC2626' } };
                }
            });
        }

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
