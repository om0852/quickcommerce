import React, { useState, useMemo } from 'react';
import Tooltip from '@mui/material/Tooltip';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, X, Pencil, Filter, Menu as MenuIcon, Check, Copy, Loader2, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
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
    allFilteredProducts,
    sortConfig,
    onSort,
    onProductClick,
    loading,
    searchQuery,
    onSearchChange,
    platformCounts,
    totalPlatformCounts, // NEW Prop
    platformFilter,
    pincode,
    onRefresh,
    showNewFirst,
    onShowNewFirstChange,
    showNonHyphenOnly = false,
    onShowNonHyphenOnlyChange,
    isAdmin = false, // Passed from parent
    onLocalUpdate,
    isBulkEditMode = false,
    selectedGroupIds = [],
    onSelectionChange,
    bulkBrands = [],
}) {
    const [manageGroup, setManageGroup] = useState(null);
    const [editProduct, setEditProduct] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [editingProductId, setEditingProductId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [savingProductId, setSavingProductId] = useState(null);
    const [selectedBrand, setSelectedBrand] = useState('');
    const [bulkUpdating, setBulkUpdating] = useState(false);

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

    // Rank Submenu State
    const [rankSubMenuAnchor, setRankSubMenuAnchor] = useState(null);
    const [rankSortDirection, setRankSortDirection] = useState('asc');
    const isRankSubMenuOpen = Boolean(rankSubMenuAnchor);

    const handleRankSubMenuOpen = (event, direction) => {
        setRankSubMenuAnchor(event.currentTarget);
        setRankSortDirection(direction);
    };

    const handleRankSubMenuClose = () => {
        setRankSubMenuAnchor(null);
    };

    const handlePlatformRankSort = (platform) => {
        onSort(platform, rankSortDirection);
        handleRankSubMenuClose();
        handleSortMenuClose();
    };

    const newlyAddedCount = useMemo(() => {
        const productsToCount = allFilteredProducts || products;
        if (!productsToCount) return 0;
        const platforms = platformFilter && platformFilter !== 'all'
            ? [platformFilter]
            : ['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart', 'flipkartMinutes'];
        let count = 0;
        productsToCount.forEach(p => {
            if (!p.isHeader) {
                if (platforms.some(plat => p[plat]?.new === true)) {
                    count++;
                }
            }
        });
        return count;
    }, [allFilteredProducts, products, platformFilter]);

    const handlePriceSort = (direction) => {
        onSort('averagePrice', direction);
        handleSortMenuClose();
    };

    const handleInlineSave = async (groupingId) => {
        if (!editValue.trim() || savingProductId === groupingId) return;

        setSavingProductId(groupingId);
        try {
            const res = await fetch('/api/grouping/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupingId,
                    updates: { name: editValue.trim() }
                })
            });

            if (res.ok) {
                if (onLocalUpdate) {
                    onLocalUpdate({ groupingId, name: editValue.trim() });
                }
                setToastState({ open: true, message: 'Name updated successfully', severity: 'success' });
            } else {
                setToastState({ open: true, message: 'Failed to update name', severity: 'error' });
            }
        } catch (error) {
            console.error('Error updating name:', error);
            setToastState({ open: true, message: 'Error updating name', severity: 'error' });
        } finally {
            setSavingProductId(null);
            setEditingProductId(null);
        }
    };

    const showToast = (message, severity = 'success') => {
        setToastState({
            open: true,
            message,
            severity
        });
    };

    const handleBulkBrandUpdate = async () => {
        if (!selectedBrand || selectedGroupIds.length === 0 || bulkUpdating) return;

        const brand = bulkBrands.find(b => b._id === selectedBrand);
        if (!brand) return;

        setBulkUpdating(true);
        let successCount = 0;
        let failCount = 0;

        for (const groupingId of selectedGroupIds) {
            try {
                const res = await fetch('/api/grouping/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        groupingId,
                        updates: { brand: brand.brandName, brandId: brand._id }
                    })
                });
                if (res.ok) {
                    successCount++;
                    if (onLocalUpdate) {
                        onLocalUpdate({ groupingId, brand: brand.brandName, brandId: brand._id });
                    }
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }
        }

        setBulkUpdating(false);
        setSelectedBrand('');
        if (onSelectionChange) onSelectionChange([]);
        showToast(
            failCount === 0
                ? `Brand updated for ${successCount} group(s)`
                : `Updated ${successCount}, failed ${failCount}`,
            failCount === 0 ? 'success' : 'warning'
        );
    };

    const formatProductName = (name) => {
        if (!name) return '';
        const delimiter = name.includes(' - ') ? ' - ' : (name.includes(' -') ? ' -' : null);

        if (delimiter) {
            const parts = name.split(delimiter);
            const firstPart = parts[0].trim();
            const rest = parts.slice(1).join(delimiter).trim();
            return (
                <>
                    <span className="font-extrabold text-neutral-900">{firstPart}</span>
                    {rest && <span className="text-neutral-600 font-medium"> - {rest}</span>}
                </>
            );
        }
        return <span className="font-extrabold text-neutral-900">{name}</span>;
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
                {/* Bulk Action Bar */}
                {isBulkEditMode && selectedGroupIds.length > 0 && (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border-b border-blue-200">
                        <span className="text-sm font-medium text-blue-700">{selectedGroupIds.length} group(s) selected</span>
                        <div className="flex items-center gap-2 ml-auto">
                            <select
                                value={selectedBrand}
                                onChange={(e) => setSelectedBrand(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-blue-400"
                                disabled={bulkUpdating}
                            >
                                <option value="">Select Brand to Apply...</option>
                                {(Array.isArray(bulkBrands) ? bulkBrands : []).map(b => (
                                    <option key={b._id} value={b._id}>{b.brandName}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleBulkBrandUpdate}
                                disabled={!selectedBrand || bulkUpdating}
                                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
                            >
                                {bulkUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                                {bulkUpdating ? 'Updating...' : 'Update Brand'}
                            </button>
                            <button
                                onClick={() => onSelectionChange && onSelectionChange([])}
                                className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}
                <TableContainer>
                    <Table stickyHeader aria-label="sticky table" size="small">
                        <TableHead>
                            <TableRow>
                                {/* Bulk Checkbox Header */}
                                {isBulkEditMode && (
                                    <TableCell
                                        padding="checkbox"
                                        sx={{
                                            backgroundColor: '#fafafa',
                                            borderBottom: '1px solid #e5e5e5',
                                            position: 'sticky',
                                            left: 0,
                                            zIndex: 31,
                                            width: 44,
                                            minWidth: 44,
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 cursor-pointer"
                                            checked={products.filter(p => !p.isHeader).length > 0 && products.filter(p => !p.isHeader).every(p => selectedGroupIds.includes(p.groupingId))}
                                            onChange={(e) => {
                                                const ids = products.filter(p => !p.isHeader).map(p => p.groupingId);
                                                if (onSelectionChange) onSelectionChange(e.target.checked ? ids : []);
                                            }}
                                        />
                                    </TableCell>
                                )}
                                {/* Product Header - Sticky Left */}
                                <TableCell
                                    sx={{
                                        fontWeight: 'bold',
                                        color: '#737373', // text-neutral-500
                                        backgroundColor: '#fafafa', // bg-neutral-50
                                        position: 'sticky',
                                        left: isBulkEditMode ? 44 : 0,
                                        zIndex: 30, // Lowered from 60 to be below dropdowns (z-50)
                                        minWidth: { xs: 120, sm: 150, md: 200, lg: 220 },
                                        width: { xs: 120, sm: 150, md: 200, lg: 220 },
                                        maxWidth: { xs: 120, sm: 150, md: 200, lg: 220 },
                                        borderBottom: '1px solid #e5e5e5',
                                        borderRight: '1px solid #e5e5e5',
                                        boxShadow: '4px 0 8px -4px rgba(0,0,0,0.05)',
                                        padding: '8px 16px'
                                    }}
                                >
                                    <div className="flex flex-row items-center justify-start w-full gap-3">
                                        <span className="hidden sm:inline-block w-10 text-neutral-500 font-bold">SKUs</span>
                                        <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                                            <input
                                                type="text"
                                                placeholder="Search by name, ID or Group ID..."
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
                                        <Menu
                                            anchorEl={sortMenuAnchor}
                                            open={isSortMenuOpen}
                                            onClose={handleSortMenuClose}
                                            anchorOrigin={{
                                                vertical: 'bottom',
                                                horizontal: 'right',
                                            }}
                                            transformOrigin={{
                                                vertical: 'top',
                                                horizontal: 'right',
                                            }}
                                            PaperProps={{
                                                sx: {
                                                    mt: 1,
                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                                    border: '1px solid #e5e7eb',
                                                    minWidth: '160px',
                                                    borderRadius: '0.375rem',
                                                }
                                            }}
                                            MenuListProps={{
                                                sx: { py: 0.5 }
                                            }}
                                        >
                                            <MenuItem
                                                onClick={() => {
                                                    onSort(null);
                                                    if (showNewFirst) onShowNewFirstChange(false);
                                                    if (showNonHyphenOnly) onShowNonHyphenOnlyChange(false);
                                                    handleSortMenuClose();
                                                }}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.key === null && !showNewFirst && !showNonHyphenOnly ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.key === null && !showNewFirst && !showNonHyphenOnly ? 700 : 500,
                                                    color: sortConfig.key === null && !showNewFirst && !showNonHyphenOnly ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' },
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <span>Group With Highest Product</span>
                                                {sortConfig.key === null && !showNewFirst && !showNonHyphenOnly && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>

                                            <MenuItem
                                                onClick={() => {
                                                    onSort('groupCount', 'asc');
                                                    if (showNewFirst) onShowNewFirstChange(false);
                                                    if (showNonHyphenOnly) onShowNonHyphenOnlyChange(false);
                                                    handleSortMenuClose();
                                                }}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.key === 'groupCount' && sortConfig.direction === 'asc' && !showNewFirst && !showNonHyphenOnly ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.key === 'groupCount' && sortConfig.direction === 'asc' && !showNewFirst && !showNonHyphenOnly ? 700 : 500,
                                                    color: sortConfig.key === 'groupCount' && sortConfig.direction === 'asc' && !showNewFirst && !showNonHyphenOnly ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' },
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <span>Group With Lowest Product</span>
                                                {sortConfig.key === 'groupCount' && sortConfig.direction === 'asc' && !showNewFirst && !showNonHyphenOnly && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>

                                            <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

                                            <MenuItem
                                                onClick={() => {
                                                    onSort('brand', 'asc');
                                                    if (showNewFirst) onShowNewFirstChange(false);
                                                    if (showNonHyphenOnly) onShowNonHyphenOnlyChange(false);
                                                    handleSortMenuClose();
                                                }}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.key === 'brand' && sortConfig.direction === 'asc' && !showNewFirst && !showNonHyphenOnly ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.key === 'brand' && sortConfig.direction === 'asc' && !showNewFirst && !showNonHyphenOnly ? 700 : 500,
                                                    color: sortConfig.key === 'brand' && sortConfig.direction === 'asc' && !showNewFirst && !showNonHyphenOnly ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' },
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <span>Brand Name (A to Z)</span>
                                                {sortConfig.key === 'brand' && sortConfig.direction === 'asc' && !showNewFirst && !showNonHyphenOnly && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>

                                            <MenuItem
                                                onClick={() => {
                                                    onSort('brand', 'desc');
                                                    if (showNewFirst) onShowNewFirstChange(false);
                                                    if (showNonHyphenOnly) onShowNonHyphenOnlyChange(false);
                                                    handleSortMenuClose();
                                                }}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.key === 'brand' && sortConfig.direction === 'desc' && !showNewFirst && !showNonHyphenOnly ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.key === 'brand' && sortConfig.direction === 'desc' && !showNewFirst && !showNonHyphenOnly ? 700 : 500,
                                                    color: sortConfig.key === 'brand' && sortConfig.direction === 'desc' && !showNewFirst && !showNonHyphenOnly ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' },
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <span>Brand Name (Z to A)</span>
                                                {sortConfig.key === 'brand' && sortConfig.direction === 'desc' && !showNewFirst && !showNonHyphenOnly && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>

                                            <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

                                            <MenuItem
                                                onClick={() => {
                                                    onSort('name', 'asc');
                                                    if (showNewFirst) onShowNewFirstChange(false);
                                                    if (showNonHyphenOnly) onShowNonHyphenOnlyChange(false);
                                                    handleSortMenuClose();
                                                }}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.key === 'name' && sortConfig.direction === 'asc' && !showNewFirst && !showNonHyphenOnly ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.key === 'name' && sortConfig.direction === 'asc' && !showNewFirst && !showNonHyphenOnly ? 700 : 500,
                                                    color: sortConfig.key === 'name' && sortConfig.direction === 'asc' && !showNewFirst && !showNonHyphenOnly ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' },
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <span>Product Name (A to Z)</span>
                                                {sortConfig.key === 'name' && sortConfig.direction === 'asc' && !showNewFirst && !showNonHyphenOnly && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>

                                            <MenuItem
                                                onClick={() => {
                                                    onSort('name', 'desc');
                                                    if (showNewFirst) onShowNewFirstChange(false);
                                                    if (showNonHyphenOnly) onShowNonHyphenOnlyChange(false);
                                                    handleSortMenuClose();
                                                }}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.key === 'name' && sortConfig.direction === 'desc' && !showNewFirst && !showNonHyphenOnly ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.key === 'name' && sortConfig.direction === 'desc' && !showNewFirst && !showNonHyphenOnly ? 700 : 500,
                                                    color: sortConfig.key === 'name' && sortConfig.direction === 'desc' && !showNewFirst && !showNonHyphenOnly ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' },
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <span>Product Name (Z to A)</span>
                                                {sortConfig.key === 'name' && sortConfig.direction === 'desc' && !showNewFirst && !showNonHyphenOnly && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>

                                            <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

                                            <MenuItem
                                                onClick={(e) => handleRankSubMenuOpen(e, 'asc')}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.direction === 'asc' && ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].includes(sortConfig.key) ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.direction === 'asc' && ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].includes(sortConfig.key) ? 700 : 500,
                                                    color: sortConfig.direction === 'asc' && ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].includes(sortConfig.key) ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' },
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp size={14} className="text-emerald-600" />
                                                    <span>Rank: Low to High</span>
                                                </div>
                                                <ChevronRight size={14} className="text-gray-400" />
                                            </MenuItem>

                                            <MenuItem
                                                onClick={(e) => handleRankSubMenuOpen(e, 'desc')}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.direction === 'desc' && ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].includes(sortConfig.key) ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.direction === 'desc' && ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].includes(sortConfig.key) ? 700 : 500,
                                                    color: sortConfig.direction === 'desc' && ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].includes(sortConfig.key) ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' },
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <TrendingDown size={14} className="text-rose-600" />
                                                    <span>Rank: High to Low</span>
                                                </div>
                                                <ChevronRight size={14} className="text-gray-400" />
                                            </MenuItem>

                                            {/* Submenu for Platform Selection */}
                                            <Menu
                                                anchorEl={rankSubMenuAnchor}
                                                open={isRankSubMenuOpen}
                                                onClose={handleRankSubMenuClose}
                                                anchorOrigin={{
                                                    vertical: 'top',
                                                    horizontal: 'right',
                                                }}
                                                transformOrigin={{
                                                    vertical: 'top',
                                                    horizontal: 'left',
                                                }}
                                                PaperProps={{
                                                    sx: {
                                                        ml: 0.5,
                                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                                        border: '1px solid #e5e7eb',
                                                        minWidth: '140px',
                                                        borderRadius: '0.375rem',
                                                    }
                                                }}
                                            >
                                                {['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'].map((plat) => (
                                                    <MenuItem
                                                        key={plat}
                                                        onClick={() => {
                                                            handlePlatformRankSort(plat);
                                                            if (showNewFirst) onShowNewFirstChange(false);
                                                            if (showNonHyphenOnly) onShowNonHyphenOnlyChange(false);
                                                        }}
                                                        sx={{
                                                            px: 1.5,
                                                            py: 1,
                                                            fontSize: '0.75rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            backgroundColor: sortConfig.key === plat && sortConfig.direction === rankSortDirection && !showNewFirst && !showNonHyphenOnly ? '#f9fafb' : 'transparent',
                                                            fontWeight: sortConfig.key === plat && sortConfig.direction === rankSortDirection && !showNewFirst && !showNonHyphenOnly ? 700 : 500,
                                                            color: sortConfig.key === plat && sortConfig.direction === rankSortDirection && !showNewFirst && !showNonHyphenOnly ? '#171717' : '#4b5563',
                                                            '&:hover': { backgroundColor: '#f9fafb' },
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <span className="capitalize">{plat === 'flipkartMinutes' ? 'Flipkart' : plat}</span>
                                                        {sortConfig.key === plat && sortConfig.direction === rankSortDirection && !showNewFirst && !showNonHyphenOnly && <Check size={14} className="text-neutral-900" />}
                                                    </MenuItem>
                                                ))}
                                            </Menu>

                                            <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

                                            <MenuItem
                                                onClick={() => {
                                                    onShowNewFirstChange(true);
                                                    if (onShowNonHyphenOnlyChange) onShowNonHyphenOnlyChange(false);
                                                    onSort(null); // Clear manual sort
                                                    handleSortMenuClose();
                                                }}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: showNewFirst ? '#f9fafb' : 'transparent',
                                                    fontWeight: showNewFirst ? 700 : 500,
                                                    color: showNewFirst ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' },
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <span>Newly Added {newlyAddedCount > 0 && `(${newlyAddedCount})`}</span>
                                                {showNewFirst && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>

                                            {isAdmin && (
                                                <MenuItem
                                                    onClick={() => {
                                                        if (onShowNonHyphenOnlyChange) onShowNonHyphenOnlyChange(true);
                                                        onShowNewFirstChange(false);
                                                        onSort(null); // Clear manual sort
                                                        handleSortMenuClose();
                                                    }}
                                                    sx={{
                                                        px: 1.5,
                                                        py: 1,
                                                        fontSize: '0.75rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        backgroundColor: showNonHyphenOnly ? '#f9fafb' : 'transparent',
                                                        fontWeight: showNonHyphenOnly ? 700 : 500,
                                                        color: showNonHyphenOnly ? '#171717' : '#4b5563',
                                                        '&:hover': { backgroundColor: '#f9fafb' },
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <span>Non Hyphen ( - )</span>
                                                    {showNonHyphenOnly && <Check size={14} className="text-neutral-900" />}
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
                                            minWidth: 100,
                                            width: 100,
                                            maxWidth: 100,
                                            padding: '8px 12px',
                                            borderBottom: '1px solid #e5e5e5',
                                            '&:hover': { backgroundColor: '#f5f5f5' }
                                        }}
                                    >
                                        <div className="flex items-center gap-1">
                                            {platform === 'flipkartMinutes' ? 'Flipkart' : platform}
                                            {sortConfig.key === platform ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> :
                                                    sortConfig.direction === 'desc' ? <ChevronDown size={14} /> :
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
                                                left: isBulkEditMode ? 44 : 0,
                                                backgroundColor: 'white',
                                                zIndex: 20,
                                                minWidth: { xs: 150, md: 220 },
                                                width: { xs: 150, md: 220 },
                                                maxWidth: { xs: 150, md: 220 },
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
                                                    padding: '8px 12px',
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
                                products.filter((product, index, self) => {
                                    if (product.isHeader) return true;
                                    return self.findIndex(p => p.groupingId === product.groupingId && !p.isHeader) === index;
                                }).map((product, index) => {
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
                                            onClick={(e) => {
                                                const selection = window.getSelection();
                                                if (selection.toString().length > 0) return;

                                                // If we're clicking inside the input, don't trigger row click
                                                if (e.target.tagName.toLowerCase() === 'input') return;

                                                // Debounce single click to allow double click to happen first
                                                if (window.clickTimer) {
                                                    clearTimeout(window.clickTimer);
                                                    window.clickTimer = null;
                                                }
                                                window.clickTimer = setTimeout(() => {
                                                    onProductClick(product);
                                                }, 250); // 250ms delay to wait for potential double click
                                            }}
                                            onDoubleClick={(e) => {
                                                if (window.clickTimer) {
                                                    clearTimeout(window.clickTimer);
                                                    window.clickTimer = null;
                                                }
                                            }}
                                            sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#fafafa' } }}
                                        >
                                            {/* Bulk Checkbox Cell */}
                                            {isBulkEditMode && (
                                                <TableCell
                                                    padding="checkbox"
                                                    onClick={(e) => e.stopPropagation()}
                                                    sx={{
                                                        position: 'sticky',
                                                        left: 0,
                                                        zIndex: 19,
                                                        backgroundColor: selectedGroupIds.includes(product.groupingId) ? '#eff6ff' : 'white',
                                                        borderBottom: '1px solid #e5e5e5',
                                                        width: 44,
                                                        minWidth: 44,
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 cursor-pointer"
                                                        checked={selectedGroupIds.includes(product.groupingId)}
                                                        onChange={(e) => {
                                                            if (!onSelectionChange) return;
                                                            if (e.target.checked) {
                                                                onSelectionChange([...selectedGroupIds, product.groupingId]);
                                                            } else {
                                                                onSelectionChange(selectedGroupIds.filter(id => id !== product.groupingId));
                                                            }
                                                        }}
                                                    />
                                                </TableCell>
                                            )}
                                            {/* Product Cell - Sticky Left */}
                                            <TableCell
                                                component="th"
                                                scope="row"
                                                sx={{
                                                    position: 'sticky',
                                                    left: isBulkEditMode ? 44 : 0,
                                                    backgroundColor: 'white',
                                                    zIndex: 20,
                                                    minWidth: { xs: 150, md: 200, lg: 220 },
                                                    width: { xs: 150, md: 200, lg: 220 },
                                                    maxWidth: { xs: 150, md: 200, lg: 220 },
                                                    borderBottom: '1px solid #e5e5e5',
                                                    borderRight: '1px solid #e5e5e5',
                                                    boxShadow: '4px 0 8px -4px rgba(0,0,0,0.05)',
                                                    padding: '8px 16px',
                                                    transition: 'background-color 0.2s',
                                                    verticalAlign: 'top',
                                                    '.MuiTableRow-root:hover &': {
                                                        backgroundColor: '#fafafa'
                                                    }
                                                }}
                                            >
                                                <div className="flex flex-row items-start gap-3">
                                                    <div className="h-10 w-10 flex-shrink-0 rounded-lg border border-neutral-200 p-0.5 bg-white overflow-hidden self-start">
                                                        <ProductImage product={product} />
                                                    </div>
                                                    <div className="w-full min-w-0">
                                                        <div className="text-[13px] font-medium text-neutral-900 whitespace-normal break-words flex items-center gap-1.5" title={product.name}>
                                                            <span
                                                                className="flex-1 min-w-0 cursor-pointer"
                                                                onDoubleClick={() => {
                                                                    if (isAdmin) {
                                                                        setEditingProductId(product.groupingId);
                                                                        setEditValue(product.name);
                                                                    }
                                                                }}
                                                                title={isAdmin ? "Double click to edit" : product.name}
                                                            >
                                                                {editingProductId === product.groupingId ? (
                                                                    <div className="relative w-full h-8">
                                                                        <div className="absolute left-0 top-0 z-[100] flex flex-col gap-1.5 p-2 bg-white border border-black/20 rounded-lg shadow-2xl min-w-[450px]">
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    type="text"
                                                                                    autoFocus
                                                                                    onFocus={(e) => e.target.select()}
                                                                                    value={editValue}
                                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter') {
                                                                                            e.preventDefault();
                                                                                            handleInlineSave(product.parentGroupId || product.groupingId);
                                                                                        } else if (e.key === 'Escape') {
                                                                                            setEditingProductId(null);
                                                                                        }
                                                                                    }}
                                                                                    onBlur={() => setEditingProductId(null)}
                                                                                    disabled={savingProductId === (product.parentGroupId || product.groupingId)}
                                                                                    className="flex-1 px-3 py-1.5 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                                                                                    title="Edit Product Name"
                                                                                />
                                                                                {savingProductId === (product.parentGroupId || product.groupingId) && (
                                                                                    <Loader2 size={14} className="animate-spin text-neutral-400" />
                                                                                )}
                                                                            </div>
                                                                            {((product.weight && product.weight !== 'N/A') || product.quantity) && (
                                                                                <span className="text-neutral-500 font-normal text-[11px] px-1">
                                                                                    + Weight/Qty suffix: ({(product.weight && product.weight !== 'N/A') ? product.weight : product.quantity})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="block leading-tight break-words">
                                                                        {formatProductName(product.name)}
                                                                        {(() => {
                                                                            const suffix = (product.weight && product.weight !== 'N/A') ? product.weight : product.quantity;
                                                                            if (!suffix) return null;

                                                                            // Check if suffix is already mentioned in product name to avoid redundancy
                                                                            const nameLower = product.name.toLowerCase();
                                                                            const suffixLower = suffix.toString().toLowerCase();
                                                                            if (nameLower.includes(suffixLower)) return null;

                                                                            return <span className="text-neutral-400 font-normal ml-1">({suffix})</span>;
                                                                        })()}
                                                                    </div>
                                                                )}
                                                            </span>
                                                            {isAdmin && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigator.clipboard.writeText(product.name);
                                                                        setCopiedId(product.groupingId);
                                                                        setTimeout(() => setCopiedId(null), 3000);
                                                                    }}
                                                                    className={`p-1 rounded-md transition-colors flex-shrink-0 ${copiedId === product.groupingId ? 'text-green-600 bg-green-50' : 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100'}`}
                                                                    title={copiedId === product.groupingId ? "Copied!" : "Copy Group Name"}
                                                                >
                                                                    {copiedId === product.groupingId ? <Check size={12} /> : <Copy size={12} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {product.brand && (
                                                            <div className="text-xs text-orange-600 font-medium mt-0.5">
                                                                {product.brand}
                                                            </div>
                                                        )}
                                                        {isAdmin && (
                                                            <div className="mt-2 flex flex-row items-center gap-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditProduct(product);
                                                                    }}
                                                                    className="flex-1 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded border border-neutral-200 transition-colors text-center whitespace-nowrap"
                                                                    title="Edit Values"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setManageGroup(product);
                                                                    }}
                                                                    className="flex-1 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded border border-neutral-200 transition-colors text-center whitespace-nowrap"
                                                                >
                                                                    Group
                                                                </button>
                                                            </div>
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
                                                            minWidth: 100,
                                                            width: 100,
                                                            maxWidth: 100,
                                                            padding: '8px 12px',
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
                        onUpdate={(updatedData) => {
                            if (updatedData && onLocalUpdate) {
                                onLocalUpdate(updatedData);
                            } else if (onRefresh) {
                                onRefresh();
                            }
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
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseToast} severity={toastState.severity} sx={{ width: '100%' }}>
                    {toastState.message}
                </Alert>
            </Snackbar>
        </>
    );
});

export default ProductTable;
