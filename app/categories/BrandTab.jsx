import React, { useMemo, useState } from 'react';
import { Search, X, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import BrandProductsDialog from './BrandProductsDialog';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableFooter from '@mui/material/TableFooter';

// Skeleton component
const Skeleton = ({ className }) => (
    <div className={cn("animate-pulse bg-gray-200 rounded", className)} />
);

const BrandTab = ({ products, loading, platformFilter = 'all' }) => {
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

    const sortedBrands = useMemo(() => {
        const brandMap = {};

        products.forEach(product => {
            const brandName = product.brand && product.brand.trim() !== '' ? product.brand : 'Other';

            // ... (keep mapping logic same)
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

        const brandList = Object.values(brandMap).sort((a, b) => {
            if (a.name === 'Other') return 1;
            if (b.name === 'Other') return -1;
            return b.total - a.total;
        });

        // Apply Platform Filter
        if (platformFilter !== 'all') {
            return brandList.filter(b => b[platformFilter] > 0);
        }
        return brandList;

    }, [products, platformFilter]);

    const filteredBrands = useMemo(() => {
        if (!searchQuery) return sortedBrands;
        const query = searchQuery.toLowerCase();
        return sortedBrands.filter(b => b.name.toLowerCase().includes(query));
    }, [sortedBrands, searchQuery]);

    const totals = useMemo(() => {
        const result = { total: 0 };
        platforms.forEach(p => result[p] = 0);

        filteredBrands.forEach(b => {
            result.total += b.total;
            platforms.forEach(p => result[p] += b[p]);
        });

        return result;
    }, [filteredBrands]);


    // Interaction State
    const [selectedBrandInteraction, setSelectedBrandInteraction] = useState(null);

    const handleInteraction = (brandName, platform) => {
        if (!selectedBrandInteraction) {
            setSelectedBrandInteraction({ brandName, platform });
        }
    };

    const handleCloseDialog = () => {
        setSelectedBrandInteraction(null);
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Controls removed - using main page filter now */}

            {/* Table */}
            <Paper
                sx={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    // maxWidth: 'calc(100vw - 2rem)', // Same constraint as ProductTable
                    flex: 1,
                    borderRadius: '0.75rem', // rounded-xl
                    border: '1px solid #e5e5e5', // border-neutral-200
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', // shadow-sm
                    overflow: 'hidden'
                }}
            >
                <TableContainer sx={{ flex: 1 }}>
                    <Table stickyHeader aria-label="brand table" size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: 'bold',
                                        color: '#737373',
                                        backgroundColor: '#fafafa',
                                        borderBottom: '1px solid #e5e5e5',
                                        padding: '12px 24px'
                                    }}
                                >
                                    <div className="relative w-full">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Search Brands..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 shadow-sm"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                </TableCell>
                                {platforms.map(p => (
                                    <TableCell
                                        key={p}
                                        align="center"
                                        sx={{
                                            fontWeight: 'bold',
                                            color: '#737373',
                                            backgroundColor: '#fafafa',
                                            borderBottom: '1px solid #e5e5e5',
                                            padding: '12px 16px',
                                            minWidth: 100
                                        }}
                                    >
                                        {platformLabels[p]}
                                    </TableCell>
                                ))}
                                <TableCell
                                    align="center"
                                    sx={{
                                        fontWeight: 'bold',
                                        color: '#171717', // darker for total
                                        backgroundColor: '#f5f5f5', // slightly darker bg for total col header
                                        borderBottom: '1px solid #e5e5e5',
                                        padding: '12px 16px',
                                        minWidth: 80
                                    }}
                                >
                                    Total
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                // Skeleton Rows
                                Array.from({ length: 10 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell sx={{ padding: '12px 24px' }}><Skeleton className="h-4 w-32" /></TableCell>
                                        {platforms.map(p => (
                                            <TableCell key={p} align="center" sx={{ padding: '12px 16px' }}><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                                        ))}
                                        <TableCell align="center" sx={{ padding: '12px 16px', backgroundColor: '#fafafa' }}><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <>
                                    {filteredBrands.map((brand) => (
                                        <TableRow
                                            key={brand.name}
                                            hover
                                            sx={{
                                                '&:hover': { backgroundColor: '#fafafa' },
                                                backgroundColor: brand.name === 'Other' ? '#fffbeb' : 'inherit' // amber-50 for Other
                                            }}
                                        >
                                            <TableCell
                                                sx={{
                                                    padding: '12px 24px',
                                                    color: brand.name === 'Other' ? '#b45309' : '#171717', // amber-700 or neutral-900
                                                    fontStyle: brand.name === 'Other' ? 'italic' : 'normal',
                                                    fontWeight: 500
                                                }}
                                            >
                                                {brand.name}
                                            </TableCell>
                                            {platforms.map(p => (
                                                <TableCell
                                                    key={p}
                                                    align="center"
                                                    onClick={() => brand[p] > 0 && handleInteraction(brand.name, p)}
                                                    sx={{
                                                        padding: '12px 16px',
                                                        cursor: brand[p] > 0 ? 'pointer' : 'default',
                                                        color: brand[p] > 0 ? '#2563eb' : '#d4d4d4', // blue-600 or gray-300
                                                        fontWeight: brand[p] > 0 ? 500 : 'normal',
                                                        '&:hover': brand[p] > 0 ? { backgroundColor: '#f3f4f6' } : {} // gray-100
                                                    }}
                                                >
                                                    {brand[p] > 0 ? brand[p] : '—'}
                                                </TableCell>
                                            ))}
                                            <TableCell
                                                align="center"
                                                onClick={() => handleInteraction(brand.name, 'total')}
                                                sx={{
                                                    padding: '12px 16px',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    color: '#171717',
                                                    backgroundColor: '#fafafa',
                                                    '&:hover': { backgroundColor: '#e5e5e5' } // gray-200
                                                }}
                                            >
                                                {brand.total}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredBrands.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ padding: '48px 24px', color: '#737373' }}>
                                                <div className="flex flex-col items-center gap-2">
                                                    <Package size={32} className="text-gray-300" />
                                                    <p>
                                                        {products.length === 0
                                                            ? "No products data available."
                                                            : "No brands found matching your criteria."}
                                                    </p>
                                                    {products.length > 0 && (
                                                        <p className="text-xs text-gray-400">
                                                            (Parsed {products.length} products, {platformFilter} filter active)
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            )}
                        </TableBody>
                        <TableFooter>
                            {!loading && filteredBrands.length > 0 && (
                                <TableRow sx={{
                                    position: 'sticky',
                                    bottom: 0,
                                    backgroundColor: '#171717', // neutral-900
                                    zIndex: 10
                                }}>
                                    <TableCell sx={{ color: 'white', fontWeight: 600, padding: '12px 24px' }}>Total</TableCell>
                                    {platforms.map(p => (
                                        <TableCell key={p} align="center" sx={{ color: 'white', fontWeight: 600, padding: '12px 16px' }}>
                                            {totals[p]}
                                        </TableCell>
                                    ))}
                                    <TableCell align="center" sx={{ color: 'white', fontWeight: 600, backgroundColor: '#262626', padding: '12px 16px' }}> {/* neutral-800 */}
                                        {totals.total}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableFooter>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Brand Products Dialog */}
            {selectedBrandInteraction && (
                <BrandProductsDialog
                    isOpen={!!selectedBrandInteraction}
                    onClose={handleCloseDialog}
                    brandName={selectedBrandInteraction.brandName}
                    platform={selectedBrandInteraction.platform}
                    allProducts={products}
                    onRefresh={() => { /* Handle refresh if needed */ }}
                />
            )}
        </div>
    );
};

export default BrandTab;

