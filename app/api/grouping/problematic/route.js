import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductGrouping from '@/models/ProductGrouping';
import ProductSnapshot from '@/models/ProductSnapshot';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
    try {
        await dbConnect();

        // 1. Read the JSON file
        const filePath = path.join(process.cwd(), 'baseids_check_after_cleaning.json');
        const fileContent = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(fileContent);

        const problematicGroups = data.stillProblematic || [];
        const groupingIds = problematicGroups.map(g => g.groupingId);

        // 2. Fetch full group data for these IDs
        const groups = await ProductGrouping.find({ groupingId: { $in: groupingIds } }).lean();

        // 3. For each group, fetch latest snapshots for all its products
        const results = await Promise.all(groups.map(async (group) => {
            const productsWithData = await Promise.all(group.products.map(async (p) => {
                const latestSnapshot = await ProductSnapshot.findOne({
                    productId: p.productId,
                    platform: p.platform
                }).sort({ scrapedAt: -1 }).lean();

                // Derive baseId if it's missing but we have details
                let baseId = latestSnapshot?.baseId;
                if (!baseId && p.productId) {
                    baseId = p.productId.split('__')[0].replace(/-[a-z]$/i, '');
                }

                return {
                    ...p,
                    baseId,
                    details: latestSnapshot || null
                };
            }));

            return {
                ...group,
                products: productsWithData
            };
        }));

        return NextResponse.json({
            success: true,
            count: results.length,
            groups: results
        });

    } catch (error) {
        console.error('Problematic groups API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
