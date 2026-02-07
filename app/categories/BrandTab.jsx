import React, { useMemo, useState } from 'react';
import { Search, X, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

// Skeleton component
const Skeleton = ({ className }) => (
    <div className={cn("animate-pulse bg-gray-200 rounded", className)} />
);

// Table skeleton rows
const TableSkeleton = () => (
    <>
        {Array.from({ length: 10 }).map((_, i) => (
            <tr key={i} className="border-b border-gray-100">
                <td className="px-6 py-3"><Skeleton className="h-4 w-32" /></td>
                <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                <td className="px-4 py-3 text-center bg-gray-50"><Skeleton className="h-4 w-10 mx-auto" /></td>
            </tr>
        ))}
    </>
);

const BrandTab = ({ products, loading }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const platforms = ['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'];
    const platformLabels = {
        jiomart: 'JioMart',
        zepto: 'Zepto',
        blinkit: 'Blinkit',
        dmart: 'DMart',
        flipkartMinutes: 'Flipkart',
        instamart: 'Instamart'
    };

    // Aggregate brand data from products
    const brandData = useMemo(() => {
        const brandMap = {};

        products.forEach(product => {
            const brandName = product.brand && product.brand.trim() !== '' ? product.brand : 'Other';

            if (!brandMap[brandName]) {
                brandMap[brandName] = {
                    name: brandName,
                    total: 0,
                    jiomart: 0,
                    zepto: 0,
                    blinkit: 0,
                    dmart: 0,
                    flipkartMinutes: 0,
                    instamart: 0
                };
            }

            platforms.forEach(p => {
                if (product[p]) {
                    brandMap[brandName][p]++;
                    brandMap[brandName].total++;
                }
            });
        });

        return Object.values(brandMap).sort((a, b) => {
            if (a.name === 'Other') return 1;
            if (b.name === 'Other') return -1;
            return b.total - a.total;
        });
    }, [products]);

    const filteredBrands = useMemo(() => {
        if (!searchQuery) return brandData;
        const query = searchQuery.toLowerCase();
        return brandData.filter(b => b.name.toLowerCase().includes(query));
    }, [brandData, searchQuery]);

    const totals = useMemo(() => {
        const result = { total: 0 };
        platforms.forEach(p => result[p] = 0);

        filteredBrands.forEach(b => {
            result.total += b.total;
            platforms.forEach(p => result[p] += b[p]);
        });

        return result;
    }, [filteredBrands]);

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Controls */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search brands..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
                        disabled={loading}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="ml-auto text-sm text-gray-500 font-medium">
                    {loading ? <Skeleton className="h-4 w-24" /> : `${filteredBrands.length} brands found`}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 font-medium border-b border-gray-200">Brand</th>
                                {platforms.map(p => (
                                    <th key={p} className="px-4 py-3 font-medium border-b border-gray-200 text-center">
                                        {platformLabels[p]}
                                    </th>
                                ))}
                                <th className="px-4 py-3 font-medium border-b border-gray-200 text-center bg-gray-100">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <TableSkeleton />
                            ) : (
                                <>
                                    {filteredBrands.map((brand) => (
                                        <tr
                                            key={brand.name}
                                            className={cn(
                                                "hover:bg-gray-50 transition-colors",
                                                brand.name === 'Other' && "bg-amber-50/50"
                                            )}
                                        >
                                            <td className="px-6 py-3 font-medium text-neutral-900">
                                                {brand.name === 'Other' ? (
                                                    <span className="text-amber-700 italic">{brand.name}</span>
                                                ) : (
                                                    brand.name
                                                )}
                                            </td>
                                            {platforms.map(p => (
                                                <td key={p} className="px-4 py-3 text-center text-gray-600">
                                                    {brand[p] > 0 ? brand[p] : <span className="text-gray-300">—</span>}
                                                </td>
                                            ))}
                                            <td className="px-4 py-3 text-center font-bold text-neutral-900 bg-gray-50">
                                                {brand.total}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredBrands.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Package size={32} className="text-gray-300" />
                                                    <p>No brands found matching your criteria.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )}
                        </tbody>
                        {!loading && filteredBrands.length > 0 && (
                            <tfoot className="bg-neutral-900 text-white font-semibold sticky bottom-0">
                                <tr>
                                    <td className="px-6 py-3">Total</td>
                                    {platforms.map(p => (
                                        <td key={p} className="px-4 py-3 text-center">
                                            {totals[p]}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 text-center bg-neutral-800">
                                        {totals.total}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BrandTab;
