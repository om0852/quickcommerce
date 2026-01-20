import React, { useState, useMemo } from 'react';
import Tooltip from '@mui/material/Tooltip';
import { TrendingUp, TrendingDown, ChevronUp, ChevronDown, ChevronsUpDown, RefreshCw, Search, X } from 'lucide-react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { cn } from '@/lib/utils'; // Keep cn for tailwind utility usage if needed

const ProductImage = ({ product }) => {
    const platforms = ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'];

    // Collect all available images from all platforms
    const images = useMemo(() => {
        return platforms
            .map(p => product[p]?.productImage)
            .filter(url => url && url.length > 5); // Basic filter for valid URL strings
    }, [product]);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [failed, setFailed] = useState(false);

    // Reset state when product changes
    React.useEffect(() => {
        setCurrentImageIndex(0);
        setFailed(false);
    }, [product]);

    const handleError = () => {
        if (currentImageIndex < images.length - 1) {
            setCurrentImageIndex(prev => prev + 1);
        } else {
            setFailed(true);
        }
    };

    if (images.length === 0 || failed) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-neutral-100 text-[10px] text-neutral-400">
                No Img
            </div>
        );
    }

    return (
        <img
            className="h-full w-full object-contain mix-blend-multiply"
            src={images[currentImageIndex]}
            alt={product.name}
            onError={handleError}
            loading="lazy"
        />
    );
};

const ProductTable = React.memo(function ProductTable({
    products,
    sortConfig,
    onSort,
    onProductClick,
    loading,
    searchQuery,
    onSearchChange,
    platformCounts
}) {
    return (
        <Paper
            sx={{
                height: '100%',
                width: '100%',
                overflow: 'hidden',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                maxWidth: 'calc(100vw - 2rem)', // Constraint to prevent page overflow
                borderRadius: '0.75rem', // rounded-xl
                border: '1px solid #e5e5e5', // border-neutral-200
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', // shadow-sm
                position: 'relative' // Ensure relative positioning for overlay
            }}
        >
            <TableContainer sx={{ flex: 1, maxHeight: '100%', height: '100%' }}>
                <Table stickyHeader aria-label="sticky table" size="small">
                    <TableHead>
                        <TableRow>
                            {/* Product Header - Sticky Left */}
                            <TableCell
                                sx={{
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    color: '#737373', // text-neutral-500
                                    backgroundColor: '#fafafa', // bg-neutral-50
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 30, // Lowered from 60 to be below dropdowns (z-50)
                                    minWidth: { xs: 150, md: 250 },
                                    width: { xs: 150, md: 250 },
                                    maxWidth: { xs: 150, md: 250 },
                                    borderBottom: '1px solid #e5e5e5',
                                    borderRight: '1px solid #e5e5e5',
                                    boxShadow: '4px 0 8px -4px rgba(0,0,0,0.05)',
                                    padding: '8px 16px'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    width: '100%',
                                    gap: '10px'
                                }}>
                                    <span>PRODUCT</span>
                                    <div className="relative flex-1 max-w-[160px]" onClick={(e) => e.stopPropagation()}>
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={searchQuery}
                                            onChange={(e) => onSearchChange(e.target.value)}
                                            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-neutral-400 transition-all font-medium normal-case placeholder:text-gray-400 text-neutral-700"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => onSearchChange('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </TableCell>

                            {/* Platform Headers */}
                            {['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'].map((platform) => (
                                <TableCell
                                    key={platform}
                                    onClick={() => onSort(platform)}
                                    sx={{
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        color: '#737373',
                                        backgroundColor: '#fafafa',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        userSelect: 'none',
                                        minWidth: 110,
                                        width: 110,
                                        maxWidth: 110,
                                        borderBottom: '1px solid #e5e5e5',
                                        '&:hover': { backgroundColor: '#f5f5f5' }
                                    }}
                                >
                                    <div className="flex items-center gap-1">
                                        {platform === 'flipkartMinutes' ? 'Flipkart' : platform}
                                        {sortConfig.key === platform ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                        ) : (
                                            <ChevronsUpDown size={14} className="text-neutral-300" />
                                        )}
                                    </div>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {products.map((product, index) => {
                            return (
                                <TableRow
                                    hover
                                    role="checkbox"
                                    tabIndex={-1}
                                    key={product.name + index}
                                    onClick={() => {
                                        const selection = window.getSelection();
                                        if (selection.toString().length === 0) {
                                            onProductClick(product);
                                        }
                                    }}
                                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#fafafa' } }}
                                >
                                    {/* Product Cell - Sticky Left */}
                                    <TableCell
                                        component="th"
                                        scope="row"
                                        sx={{
                                            position: 'sticky',
                                            left: 0,
                                            backgroundColor: 'white',
                                            zIndex: 20, // Lowered from 40
                                            minWidth: { xs: 150, md: 250 },
                                            width: { xs: 150, md: 250 },
                                            maxWidth: { xs: 150, md: 250 },
                                            borderBottom: '1px solid #e5e5e5',
                                            borderRight: '1px solid #e5e5e5',
                                            boxShadow: '4px 0 8px -4px rgba(0,0,0,0.05)',
                                            padding: '16px 32px', // px-8 py-4
                                            transition: 'background-color 0.2s',
                                            '.MuiTableRow-root:hover &': {
                                                backgroundColor: '#fafafa'
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 flex-shrink-0 rounded-lg border border-neutral-200 p-1 bg-white">
                                                <ProductImage product={product} />
                                            </div>
                                            <div className="w-full">
                                                <div className="text-sm font-medium text-neutral-900" title={product.name}>
                                                    {product.name}
                                                    {product.weight && <span className="text-neutral-500 font-normal"> - ({product.weight})</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Platform Data Cells */}
                                    {['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'].map(p => {
                                        const data = product[p];
                                        return (
                                            <TableCell
                                                key={p}
                                                sx={{
                                                    minWidth: 110,
                                                    width: 110,
                                                    maxWidth: 110,
                                                    borderBottom: '1px solid #e5e5e5',
                                                    padding: '16px 32px'
                                                }}
                                            >
                                                {data ? (
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-sm font-semibold text-neutral-900">
                                                                ₹{Number(data.currentPrice).toFixed(0)}
                                                            </div>
                                                            {/* Ranking Badge */}
                                                            {data.ranking && !isNaN(data.ranking) && (
                                                                <span className={cn(
                                                                    "text-[10px] font-bold px-1.5 py-0.5 rounded border bg-neutral-100 text-neutral-900 border-neutral-200"
                                                                )}>
                                                                    #{data.ranking}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {/* Ad Status - New Line */}
                                                        {data.isAd && (
                                                            <div className="mt-1">
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">
                                                                    Ad
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="text-xs text-neutral-500 mt-1 flex flex-col gap-0.5">
                                                            {data.priceChange && !isNaN(data.priceChange) && data.priceChange !== 0 ? (
                                                                <span className={cn(
                                                                    "inline-flex items-center gap-0.5 text-neutral-700"
                                                                )}>
                                                                    {data.priceChange < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                                                                    {Math.abs(data.priceChange)}
                                                                </span>
                                                            ) : null}
                                                            {((data.deliveryTime && data.deliveryTime.length < 20) || p === 'jiomart') && (
                                                                <span className="opacity-75">{p === 'jiomart' ? '10-30 min' : data.deliveryTime}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    platformCounts && platformCounts[p] === 0 ? (
                                                        <Tooltip title="Unserviceable">
                                                            <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-full border border-rose-100 whitespace-nowrap cursor-default">
                                                                U/S
                                                            </span>
                                                        </Tooltip>
                                                    ) : (
                                                        <span className="text-sm text-neutral-400 italic">--</span>
                                                    )
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            {products.length === 0 && (
                <div className="px-6 py-12 text-center text-sm text-neutral-500">
                    No products found matching your filters.
                </div>
            )}

            {/* Loading Overlay */}
            {
                loading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-35 flex items-center justify-center rounded-xl">
                        <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin text-neutral-900">
                                <RefreshCw size={32} />
                            </div>
                            <span className="text-sm font-medium text-neutral-900">Updating data...</span>
                        </div>
                    </div>
                )
            }
        </Paper >
    );
});

export default ProductTable;
