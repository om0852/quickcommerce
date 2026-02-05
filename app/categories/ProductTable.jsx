import React, { useState, useMemo } from 'react';
import Tooltip from '@mui/material/Tooltip';
import { TrendingUp, TrendingDown, ChevronUp, ChevronDown, ChevronsUpDown, RefreshCw, Search, X, Pencil, Menu as MenuIcon, Check } from 'lucide-react';
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
                                        <button
                                            onClick={handleSortMenuClick}
                                            className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-500"
                                            title="Filter & Sort"
                                        >
                                            <MenuIcon size={16} />
                                        </button>
                                        <Menu
                                            anchorEl={sortMenuAnchor}
                                            open={isSortMenuOpen}
                                            onClose={handleSortMenuClose}
                                            MenuListProps={{
                                                'aria-labelledby': 'basic-button',
                                            }}
                                            anchorOrigin={{
                                                vertical: 'bottom',
                                                horizontal: 'right',
                                            }}
                                            transformOrigin={{
                                                vertical: 'top',
                                                horizontal: 'right',
                                            }}
                                        >
                                            <MenuItem onClick={() => handleNameSort('asc')} className="text-sm gap-2">
                                                <TrendingUp size={14} className="text-gray-500" />
                                                <span className="text-sm">Sort Name (A to Z)</span>
                                            </MenuItem>
                                            <MenuItem onClick={() => handleNameSort('desc')} className="text-sm gap-2">
                                                <TrendingDown size={14} className="text-gray-500" />
                                                <span className="text-sm">Sort Name (Z to A)</span>
                                            </MenuItem>
                                            <MenuItem onClick={() => handlePriceSort('asc')} className="text-sm gap-2">
                                                <TrendingUp size={14} className="text-gray-500" />
                                                <span className="text-sm">Sort Price (Low to High)</span>
                                            </MenuItem>
                                            <MenuItem onClick={() => handlePriceSort('desc')} className="text-sm gap-2">
                                                <TrendingDown size={14} className="text-gray-500" />
                                                <span className="text-sm">Sort Price (High to Low)</span>
                                            </MenuItem>
                                            {isAdmin && (
                                                <MenuItem
                                                    onClick={() => {
                                                        onShowNewFirstChange(!showNewFirst);
                                                        handleSortMenuClose();
                                                    }}
                                                    className="text-sm gap-2 border-t border-gray-100 mt-1 pt-2"
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className="text-sm font-medium">Show New First</span>
                                                        {showNewFirst && <Check size={14} className="text-neutral-900" />}
                                                    </div>
                                                </MenuItem>
                                            )}
                                        </Menu>
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
                            {products.map((product, index) => {
                                // Check if it's a header row
                                if (product.isHeader) {
                                    return null;
                                }

                                return (
                                    <TableRow
                                        hover
                                        role="checkbox"
                                        tabIndex={-1}
                                        key={product.name + index} // Use index fallback if names are same across regions (though backend should handle)
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
                                                verticalAlign: 'top', // ALIGNMENT FIX
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
                                                    {/* ADMIN MANAGE BUTTON */}
                                                    {isAdmin && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setManageGroup(product); // Product here represents the merged group row
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
                                                        verticalAlign: 'top' // ALIGNMENT FIX
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
                                                            {/* NEW Status - Visible to All */}
                                                            {data.new && (
                                                                <div className="mt-1">
                                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
                                                                        NEW
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
                                                        totalPlatformCounts && totalPlatformCounts[p] === 0 ? (
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
                </TableContainer >
                {
                    products.filter(p => !p.isHeader).length === 0 && ( /* Only show if no actual products, ignoring headers */
                        <div className="px-6 py-12 text-center text-sm text-neutral-500">
                            No products found matching your filters.
                        </div>
                    )
                }

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
