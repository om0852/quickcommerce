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
        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Start and End dates are required' }, { status: 400 });
        }

        console.log('Export request:', { startDate, endDate, email, platforms, categories, pincodes });

        // Build Query
        const query = {
            scrapedAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        if (platforms.length > 0 && !platforms.includes('all')) {
            query.platform = { $in: platforms };
        }

        if (categories.length > 0 && !categories.includes('all')) {
            query.category = { $in: categories };
        }

        if (pincodes.length > 0) {
            query.pincode = { $in: pincodes };
        }

        if (products.length > 0 && !products.includes('all')) {
            query.productName = { $in: products };
        }

        console.log('Query:', JSON.stringify(query));

        // Fetch Data
        const snapshots = await ProductSnapshot.find(query).sort({ scrapedAt: 1 }).lean();
        console.log(`Found ${snapshots.length} records`);

        if (snapshots.length === 0) {
            return NextResponse.json({ error: 'No data found for the selected filters' }, { status: 404 });
        }

        // Process Data for Pivot/Comparison View
        // 1. Identify all unique platforms present in the data to create columns
        const allPlatforms = _.uniq(snapshots.map(s => s.platform)).sort();

        // 2. Group data by unique identifier: Product + Pincode + Time (approx)
        // Note: scrapedAt might slightly vary, so we can group by Date + Hour or similar if needed.
        // For now, let's group by Date (YYYY-MM-DD), Category, Pincode, ProductName
        // We will assume snapshots for different platforms generally happen around the same time-block
        // or we can just list each distinct capture time.
        // Let's stick to strict grouping: Date + Time + Pincode + Product Name
        // We need to format Date + Time to a string key.
        const groupedData = _.groupBy(snapshots, (doc) => {
            const dateObj = new Date(doc.scrapedAt);
            const dateStr = dateObj.toLocaleDateString();
            const timeStr = dateObj.toLocaleTimeString(); // This might enable exact matching if scraped together
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
            // Take the first item to get base details (Date, Pincode, etc.)
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
                    rowData[`${platform}_price`] = null; // Or '-'
                    rowData[`${platform}_rank`] = null;
                    rowData[`${platform}_stock`] = '-';
                }
            });

            const row = worksheet.addRow(rowData);

            // Conditional Formatting for "Available" and "Stock" columns
            allPlatforms.forEach(platform => {
                // Availability Color
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

                // Stock Color (Optional, if "In Stock" make green)
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

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Category Comparison Export - ${startDate} to ${endDate}`,
            text: `Please find attached the requested category comparison report.\n\nFilters:\nDate: ${startDate} to ${endDate}\nPlatforms included: ${allPlatforms.join(', ')}\nCategories: ${categories.join(', ')}\nPincodes: ${pincodes.join(', ')}`,
            attachments: [
                {
                    filename: `product_comparison_${Date.now()}.xlsx`,
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
