import React, { useState, useMemo } from 'react';
import Tooltip from '@mui/material/Tooltip';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, X, Pencil, Filter, Menu as MenuIcon } from 'lucide-react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
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

import GroupManagementDialog from './GroupManagementDialog';
import ProductEditDialog from './ProductEditDialog'; // NEW Import

const ProductTable = React.memo(function ProductTable({
    products,
    sortConfig,
    onSort,
    onProductClick,
    loading,
    searchQuery,
    onSearchChange,
    platformCounts,
    totalPlatformCounts, // NEW Prop
    pincode,
    onRefresh, // NEW Prop
    showNewFirst,
    onShowNewFirstChange,
    isAdmin // Passed from parent
}) {
    const [manageGroup, setManageGroup] = useState(null); // Group currently being managed
    const [editProduct, setEditProduct] = useState(null); // Product currently being edited

    // TOAST STATE
    const [toastState, setToastState] = useState({
        open: false,
        message: '',
        severity: 'success' // 'success' | 'error' | 'info' | 'warning'
    });

    const handleCloseToast = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setToastState(prev => ({ ...prev, open: false }));
    };

    // Sort Menu State
    const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
    const isSortMenuOpen = Boolean(sortMenuAnchor);

    const handleSortMenuClick = (event) => {
        setSortMenuAnchor(event.currentTarget);
    };

    const handleSortMenuClose = () => {
        setSortMenuAnchor(null);
    };

    const handleNameSort = (direction) => {
        onSort('name', direction);
        handleSortMenuClose();
    };

    const handlePriceSort = (direction) => {
        onSort('averagePrice', direction);
        handleSortMenuClose();
    };

    const showToast = (message, severity = 'success') => {
        setToastState({
            open: true,
            message,
            severity
        });
    };

    return (
        <>
            <Paper
                sx={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    maxWidth: 'calc(100vw - 2rem)', // Constraint to prevent page overflow
                    borderRadius: '0.75rem', // rounded-xl
                    border: '1px solid #e5e5e5', // border-neutral-200
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', // shadow-sm
                    position: 'relative' // Ensure relative positioning for overlay
                }}
            >
                <TableContainer>
                    <Table stickyHeader aria-label="sticky table" size="small">
                        <TableHead>
                            <TableRow>
                                {/* Product Header - Sticky Left */}
                                <TableCell
                                    sx={{
                                        fontWeight: 'bold',
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
                                        <span>SKUs</span>
                                        <div className="relative flex-1 max-w-[full]" onClick={(e) => e.stopPropagation()}>
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

                                        {/* Hamburger Sort Menu */}
                                        {/* Dropdown Trigger */}
                                        <button
                                            onClick={handleSortMenuClick}
                                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 cursor-pointer"
                                            title="Filter & Sort"
                                        >
                                            <Filter size={16} />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {isSortMenuOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={handleSortMenuClose}
                                                />
                                                <div className="absolute top-full right-0 mt-1 z-50 bg-white rounded-md shadow-lg border border-gray-200 min-w-[160px] py-1">

                                                    <div
                                                        onClick={() => {
                                                            onSort(null);
                                                            if (showNewFirst) onShowNewFirstChange(false);
                                                            handleSortMenuClose();
                                                        }}
                                                        className={cn(
                                                            "px-3 py-2 cursor-pointer hover:bg-gray-50 text-xs flex items-center justify-between",
                                                            sortConfig.key === null && !showNewFirst ? "font-bold text-neutral-900 bg-gray-50" : "font-medium text-gray-600"
                                                        )}
                                                    >
                                                        <span>Default</span>
                                                        {sortConfig.key === null && !showNewFirst && <Check size={14} className="text-neutral-900" />}
                                                    </div>

                                                    <div className="border-t border-gray-100 my-1" />

                                                    <div
                                                        onClick={() => {
                                                            onSort('name', 'asc');
                                                            if (showNewFirst) onShowNewFirstChange(false);
                                                            handleSortMenuClose();
                                                        }}
                                                        className={cn(
                                                            "px-3 py-2 cursor-pointer hover:bg-gray-50 text-xs flex items-center justify-between",
                                                            sortConfig.key === 'name' && sortConfig.direction === 'asc' && !showNewFirst ? "font-bold text-neutral-900 bg-gray-50" : "font-medium text-gray-600"
                                                        )}
                                                    >
                                                        <span>Name (A to Z)</span>
                                                        {sortConfig.key === 'name' && sortConfig.direction === 'asc' && !showNewFirst && <Check size={14} className="text-neutral-900" />}
                                                    </div>

                                                    <div
                                                        onClick={() => {
                                                            onSort('name', 'desc');
                                                            if (showNewFirst) onShowNewFirstChange(false);
                                                            handleSortMenuClose();
                                                        }}
                                                        className={cn(
                                                            "px-3 py-2 cursor-pointer hover:bg-gray-50 text-xs flex items-center justify-between",
                                                            sortConfig.key === 'name' && sortConfig.direction === 'desc' && !showNewFirst ? "font-bold text-neutral-900 bg-gray-50" : "font-medium text-gray-600"
                                                        )}
                                                    >
                                                        <span>Name (Z to A)</span>
                                                        {sortConfig.key === 'name' && sortConfig.direction === 'desc' && !showNewFirst && <Check size={14} className="text-neutral-900" />}
                                                    </div>

                                                    <div
                                                        onClick={() => {
                                                            onSort('averagePrice', 'asc');
                                                            if (showNewFirst) onShowNewFirstChange(false);
                                                            handleSortMenuClose();
                                                        }}
                                                        className={cn(
                                                            "px-3 py-2 cursor-pointer hover:bg-gray-50 text-xs flex items-center justify-between",
                                                            sortConfig.key === 'averagePrice' && sortConfig.direction === 'asc' && !showNewFirst ? "font-bold text-neutral-900 bg-gray-50" : "font-medium text-gray-600"
                                                        )}
                                                    >
                                                        <span>Price (Low to High)</span>
                                                        {sortConfig.key === 'averagePrice' && sortConfig.direction === 'asc' && !showNewFirst && <Check size={14} className="text-neutral-900" />}
                                                    </div>

                                                    <div
                                                        onClick={() => {
                                                            onSort('averagePrice', 'desc');
                                                            if (showNewFirst) onShowNewFirstChange(false);
                                                            handleSortMenuClose();
                                                        }}
                                                        className={cn(
                                                            "px-3 py-2 cursor-pointer hover:bg-gray-50 text-xs flex items-center justify-between",
                                                            sortConfig.key === 'averagePrice' && sortConfig.direction === 'desc' && !showNewFirst ? "font-bold text-neutral-900 bg-gray-50" : "font-medium text-gray-600"
                                                        )}
                                                    >
                                                        <span>Price (High to Low)</span>
                                                        {sortConfig.key === 'averagePrice' && sortConfig.direction === 'desc' && !showNewFirst && <Check size={14} className="text-neutral-900" />}
                                                    </div>

                                                    <div className="border-t border-gray-100 my-1" />

                                                    <div
                                                        onClick={() => {
                                                            onShowNewFirstChange(true);
                                                            onSort(null); // Clear manual sort
                                                            handleSortMenuClose();
                                                        }}
                                                        className={cn(
                                                            "px-3 py-2 cursor-pointer hover:bg-gray-50 text-xs flex items-center justify-between",
                                                            showNewFirst ? "font-bold text-neutral-900 bg-gray-50" : "font-medium text-gray-600"
                                                        )}
                                                    >
                                                        <span>Newly Added</span>
                                                        {showNewFirst && <Check size={14} className="text-neutral-900" />}
                                                    </div>
                                                </div>
                                            </>
                                        )}
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
                                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> :
                                                    sortConfig.direction === 'desc' ? <ChevronDown size={14} /> :
                                                        sortConfig.direction === 'price_asc' ? <div className="flex items-center text-emerald-600"><span className="text-[10px] mr-0.5">₹</span><ChevronUp size={14} /></div> :
                                                            sortConfig.direction === 'price_desc' ? <div className="flex items-center text-emerald-600"><span className="text-[10px] mr-0.5">₹</span><ChevronDown size={14} /></div> :
                                                                <ChevronsUpDown size={14} className="text-neutral-300" />
                                            ) : (
                                                <ChevronsUpDown size={14} className="text-neutral-300" />
                                            )}
                                        </div>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                // Skeleton Loading Rows
                                Array.from({ length: 8 }).map((_, rowIndex) => (
                                    <TableRow key={`skeleton-${rowIndex}`}>
                                        {/* Product Cell Skeleton */}
                                        <TableCell
                                            sx={{
                                                position: 'sticky',
                                                left: 0,
                                                backgroundColor: 'white',
                                                zIndex: 20,
                                                minWidth: { xs: 150, md: 250 },
                                                width: { xs: 150, md: 250 },
                                                maxWidth: { xs: 150, md: 250 },
                                                borderBottom: '1px solid #e5e5e5',
                                                borderRight: '1px solid #e5e5e5',
                                                padding: '16px 32px',
                                            }}
                                        >
                                            <div className="grid grid-cols-[auto_1fr] gap-4">
                                                <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-neutral-200 animate-pulse" />
                                                <div className="w-full min-w-0 space-y-2">
                                                    <div className="h-4 bg-neutral-200 rounded animate-pulse w-3/4" />
                                                    <div className="h-3 bg-neutral-100 rounded animate-pulse w-1/2" />
                                                </div>
                                            </div>
                                        </TableCell>
                                        {/* Platform Cells Skeleton */}
                                        {['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'].map(p => (
                                            <TableCell
                                                key={p}
                                                sx={{
                                                    minWidth: 110,
                                                    width: 110,
                                                    maxWidth: 110,
                                                    borderBottom: '1px solid #e5e5e5',
                                                    padding: '16px 32px',
                                                }}
                                            >
                                                <div className="space-y-2">
                                                    <div className="h-4 bg-neutral-200 rounded animate-pulse w-12" />
                                                    <div className="h-3 bg-neutral-100 rounded animate-pulse w-16" />
                                                </div>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                products.map((product, index) => {
                                    // Check if it's a header row
                                    if (product.isHeader) {
                                        return null;
                                    }

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
                                                    zIndex: 20,
                                                    minWidth: { xs: 150, md: 250 },
                                                    width: { xs: 150, md: 250 },
                                                    maxWidth: { xs: 150, md: 250 },
                                                    borderBottom: '1px solid #e5e5e5',
                                                    borderRight: '1px solid #e5e5e5',
                                                    boxShadow: '4px 0 8px -4px rgba(0,0,0,0.05)',
                                                    padding: '16px 32px',
                                                    transition: 'background-color 0.2s',
                                                    verticalAlign: 'top',
                                                    '.MuiTableRow-root:hover &': {
                                                        backgroundColor: '#fafafa'
                                                    }
                                                }}
                                            >
                                                <div className="grid grid-cols-[auto_1fr] gap-4">
                                                    <div className="h-12 w-12 flex-shrink-0 rounded-lg border border-neutral-200 p-1 bg-white">
                                                        <ProductImage product={product} />
                                                    </div>
                                                    <div className="w-full min-w-0">
                                                        <div className="text-sm font-medium text-neutral-900 whitespace-normal break-words" title={product.name}>
                                                            {product.name}
                                                            {product.weight && <span className="text-neutral-500 font-normal"> - ({product.weight})</span>}
                                                            {isAdmin && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditProduct(product);
                                                                    }}
                                                                    className="ml-2 p-1 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors inline-block align-middle"
                                                                    title="Edit Values"
                                                                >
                                                                    <Pencil size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        {product.brand && (
                                                            <div className="text-xs text-orange-600 font-medium mt-0.5">
                                                                {product.brand}
                                                            </div>
                                                        )}
                                                        {isAdmin && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setManageGroup(product);
                                                                }}
                                                                className="mt-1 text-[10px] font-bold text-neutral-500 hover:text-neutral-900 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded border border-gray-200 transition-colors"
                                                            >
                                                                Manage Group
                                                            </button>
                                                        )}
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
                                                            padding: '16px 32px',
                                                            verticalAlign: 'top'
                                                        }}
                                                    >
                                                        {data ? (
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="text-sm font-semibold text-neutral-900">
                                                                        ₹{Number(data.currentPrice).toFixed(0)}
                                                                    </div>
                                                                    {data.ranking && !isNaN(data.ranking) && (
                                                                        <span className={cn(
                                                                            "text-[10px] font-bold px-1.5 py-0.5 rounded border bg-neutral-100 text-neutral-900 border-neutral-200"
                                                                        )}>
                                                                            #{data.ranking}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {data.new && (
                                                                    <span className="text-[10px] font-bold text-blue-600">NEW</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            totalPlatformCounts && totalPlatformCounts[p] === 0 ? (
                                                                <span className="text-xs font-bold text-rose-500">U/S</span>
                                                            ) : (
                                                                <span className="text-sm text-neutral-400 italic">--</span>
                                                            )
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {
                    !loading && products.filter(p => !p.isHeader).length === 0 && ( /* Only show if no actual products, ignoring headers */
                        <div className="px-6 py-12 text-center text-sm text-neutral-500">
                            No products found matching your filters.
                        </div>
                    )
                }

                {/* Skeleton Loading handled in TableBody */}
            </Paper >

            {/* Manage Group Dialog */}
            {
                manageGroup && (
                    <GroupManagementDialog
                        isOpen={!!manageGroup}
                        onClose={() => setManageGroup(null)}
                        groupingId={manageGroup.groupingId} // passed from merged data
                        productsInGroup={manageGroup} // passed full object to parse platforms
                        onUpdate={() => {
                            // Ideally trigger a refresh of the table data
                            // We don't have easy access to fetchCategoryData here unless we pass it down or use context.
                            // User might need to manually refresh or we can try to pass a callback.
                            // The simplest way for now is just close; user hits refresh button.
                            // Or we can add a simple window reload or context trigger.
                            // For now, let's just close dialog.
                            // If we want auto-refresh, we can pass a callback from parent.
                            setManageGroup(null);
                        }}
                        currentPincode={pincode} // Pass it down
                        showToast={showToast}
                    />
                )
            }

            {/* Edit Product Dialog */}
            {
                editProduct && (

                    <ProductEditDialog
                        isOpen={!!editProduct}
                        onClose={() => setEditProduct(null)}
                        product={editProduct}
                        onUpdate={() => {
                            if (onRefresh) onRefresh();
                            setEditProduct(null);
                        }}
                        showToast={showToast}
                    />
                )
            }

            <Snackbar
                open={toastState.open}
                autoHideDuration={4000}
                onClose={handleCloseToast}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseToast} severity={toastState.severity} sx={{ width: '100%' }}>
                    {toastState.message}
                </Alert>
            </Snackbar>
        </>
    );
});

export default ProductTable;
