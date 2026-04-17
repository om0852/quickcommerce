import React, { useState, useMemo, useEffect } from 'react';
import Tooltip from '@mui/material/Tooltip';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, X, Pencil, Filter, Menu as MenuIcon, Check, Copy, Loader2, ChevronRight, TrendingUp, TrendingDown, Unlink, Skull, LayoutGrid, Info } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { PLATFORMS, PLATFORM_SHORT_NAMES, PLATFORM_OPTIONS, UNSERVICEABLE_PINCODES } from '@/app/constants/platforms';
import { parseProductName } from '@/app/utils/formatters';
import { useNotification } from '@/app/hooks/useNotification';

import GroupManagementDialog from './GroupManagementDialog';
import ProductEditDialog from './ProductEditDialog';
import GroupDetailsCrossPincodeDialog from './GroupDetailsCrossPincodeDialog';
import GroupInfoDialog from './GroupInfoDialog';
import ProductImage from './ProductImage';
import CustomDropdown from '@/components/CustomDropdown';

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
    category,
    pincode,
    onRefresh,
    tableFilters,
    setTableFilters,
    isAdmin = false, // Passed from parent
    onLocalUpdate,
    onBulkUpdate,
    isBulkEditMode = false,
    selectedGroupIds = [],
    onSelectionChange,
    availableBrands = [],
    brandsLoading = false,
    isLiveMode = true, // NEW Prop
    scrapeIntervals,
    ngInterval,
    onInfoClick, // NEW: open ProductDetailsDialog for a product
}) {
    const [manageGroup, setManageGroup] = useState(null);
    const [editProduct, setEditProduct] = useState(null);
    const [crossPincodeGroup, setCrossPincodeGroup] = useState(null);
    const [crossPincodePlatform, setCrossPincodePlatform] = useState(null);
    const [groupInfoProduct, setGroupInfoProduct] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [editingProductId, setEditingProductId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [savingProductId, setSavingProductId] = useState(null);
    const [isRegrouping, setIsRegrouping] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState('');
    const [bulkName, setBulkName] = useState('');
    const [bulkWeight, setBulkWeight] = useState('');
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const platformLabels = useMemo(() => {
        return PLATFORM_OPTIONS.reduce((acc, opt) => ({
            ...acc,
            [opt.value]: opt.label
        }), {});
    }, []);

    // Notification management (toast)
    const { toastState, showToast, handleCloseToast } = useNotification();

    // Sort Menu State
    const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
    const isSortMenuOpen = Boolean(sortMenuAnchor);

    const getMenuItemStyle = (isActive) => ({
        px: 1.5, py: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: isActive ? '#f9fafb' : 'transparent',
        fontWeight: isActive ? 700 : 500,
        color: isActive ? '#171717' : '#4b5563',
        '&:hover': { backgroundColor: '#f9fafb' }, cursor: 'pointer'
    });

    const handleSortMenuClick = (event) => {
        setSortMenuAnchor(event.currentTarget);
    };

    const handleSortMenuClose = () => {
        setSortMenuAnchor(null);
        setSortSubMenuAnchor(null);
        setRankSubMenuAnchor(null);
    };

    const handleNameSort = (direction) => {
        clearFilters();
        onSort('name', direction);
        handleSortMenuClose();
    };

    const handleBrandSort = (direction) => {
        clearFilters();
        onSort('brand', direction);
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
        clearFilters();
        onSort(platform, rankSortDirection);
        handleRankSubMenuClose();
        handleSortMenuClose();
    };

    // Sort Submenu State (Price, Discount, Stock, Ads)
    const [sortSubMenuAnchor, setSortSubMenuAnchor] = useState(null);
    const isSortSubMenuOpen = Boolean(sortSubMenuAnchor);

    const handleSortSubSubMenuOpen = (event) => {
        setSortSubMenuAnchor(event.currentTarget);
    };

    const handleSortSubSubMenuClose = () => {
        setSortSubMenuAnchor(null);
    };

    const newlyAddedCount = useMemo(() => {
        const productsToCount = allFilteredProducts || products;
        if (!productsToCount) return 0;

        return productsToCount.reduce((count, p) => {
            if (!p.isHeader && PLATFORMS.some(plat => p[plat]?.new === true)) {
                return count + 1;
            }
            return count;
        }, 0);
    }, [allFilteredProducts, products]);

    const clearFilters = () => {
        setTableFilters({
            showNewFirst: false, showNonHyphenOnly: false, showDangerFirst: false,
            showPureNewFirst: false, showAdFirst: false, showInStockFirst: false,
            showOutStockFirst: false
        });
    };

    const setExclusiveFilter = (filterKey, value) => {
        setTableFilters({
            showNewFirst: filterKey === 'showNewFirst' ? value : false,
            showNonHyphenOnly: filterKey === 'showNonHyphenOnly' ? value : false,
            showDangerFirst: filterKey === 'showDangerFirst' ? value : false,
            showPureNewFirst: filterKey === 'showPureNewFirst' ? value : false,
            showAdFirst: filterKey === 'showAdFirst' ? value : false,
            showInStockFirst: filterKey === 'showInStockFirst' ? value : false,
            showOutStockFirst: filterKey === 'showOutStockFirst' ? value : false,
        });
    };

    const handleHighestProductCountSort = () => {
        clearFilters();
        onSort('groupCount', 'desc');
        handleSortMenuClose();
    };

    const handleLowestProductCountSort = () => {
        clearFilters();
        onSort('groupCount', 'asc');
        handleSortMenuClose();
    };

    const handlePriceSort = (direction) => {
        clearFilters();
        onSort('averagePrice', direction);
        handleSortMenuClose();
    };

    const handleInStockSort = () => {
        setExclusiveFilter('showInStockFirst', true);
        onSort(null);
        handleSortSubSubMenuClose();
        handleSortMenuClose();
    };

    const handleOutStockSort = () => {
        setExclusiveFilter('showOutStockFirst', true);
        onSort(null);
        handleSortSubSubMenuClose();
        handleSortMenuClose();
    };

    const handleAdSort = () => {
        setExclusiveFilter('showAdFirst', true);
        onSort(null);
        handleSortSubSubMenuClose();
        handleSortMenuClose();
    };

    const handleNewlyAddedToggle = () => {
        const next = !tableFilters?.tableFilters?.showNewFirst;
        setExclusiveFilter('showNewFirst', next);
        onSort(null);
        handleSortMenuClose();
    };

    const handleNonHyphenToggle = () => {
        setExclusiveFilter('showNonHyphenOnly', true);
        onSort(null);
        handleSortMenuClose();
    };

    const handleDangerFirstToggle = () => {
        const next = !tableFilters?.tableFilters?.showDangerFirst;
        setExclusiveFilter('showDangerFirst', next);
        onSort(null);
        handleSortSubSubMenuClose();
        handleSortMenuClose();
    };

    const handlePureNewFirstToggle = () => {
        const next = !tableFilters?.tableFilters?.showPureNewFirst;
        setExclusiveFilter('showPureNewFirst', next);
        onSort(null);
        handleSortSubSubMenuClose();
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
                showToast('Name updated successfully', 'success');
            } else {
                showToast('Failed to update name', 'error');
            }
        } catch (error) {
            console.error('Error updating name:', error);
            showToast('Error updating name', 'error');
        } finally {
            setSavingProductId(null);
            setEditingProductId(null);
        }
    };

    const handleBulkUpdate = async () => {
        if (selectedGroupIds.length === 0 || bulkUpdating) return;

        // Check if at least one field is provided
        if (!selectedBrand && !bulkName.trim() && !bulkWeight.trim()) {
            showToast('Please provide at least one value to update', 'warning');
            return;
        }

        const brand = selectedBrand ? availableBrands.find(b => b._id === selectedBrand) : null;

        setBulkUpdating(true);

        try {
            const updates = {};
            if (bulkName.trim()) updates.name = bulkName.trim();
            if (bulkWeight.trim()) updates.weight = bulkWeight.trim();
            if (brand) {
                updates.brand = brand.brandName;
                updates.brandId = brand.brandId;
            }

            const { successCount, total } = await onBulkUpdate(selectedGroupIds, updates);
            const failCount = total - successCount;

            showToast(
                failCount === 0
                    ? `Updated ${successCount} group(s)`
                    : `Updated ${successCount}, failed ${failCount}`,
                failCount === 0 ? 'success' : 'warning'
            );
        } catch (error) {
            console.error('Error in bulk update:', error);
            showToast('Failed to perform bulk update', 'error');
        } finally {
            setBulkUpdating(false);
            setSelectedBrand('');
            setBulkName('');
            setBulkWeight('');
            if (onSelectionChange) onSelectionChange([]);
        }
    };

    const handleRegroup = async (product) => {
        if (!confirm(`Before creating new group check whether you can add this in any existing group or not. If not then click Confirm else Cancel it.`)) return;

        // Find the active platform data for this row
        const activePlatform = PLATFORMS.find(p => product[p] && product[p].productId);

        if (!activePlatform) {
            showToast('Could not find platform data for this product', 'error');
            return;
        }

        const platformData = product[activePlatform];
        const productId = platformData.productId;

        setIsRegrouping(true);
        setSavingProductId(product.groupingId);
        try {
            const res = await fetch('/api/grouping/regroup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: productId,
                    platform: activePlatform,
                    category: product.officialCategory || 'Uncategorized',
                    pincode: pincode
                })
            });

            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                if (onRefresh) onRefresh();
            } else {
                showToast(data.error || 'Failed to regroup', 'error');
            }
        } catch (error) {
            console.error('Error regrouping:', error);
            showToast('Error regrouping', 'error');
        } finally {
            setIsRegrouping(false);
            setSavingProductId(null);
        }
    };

    return (
        <>
            <Paper
                elevation={0}
                square
                sx={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative' // Ensure relative positioning for overlay
                }}
            >
                {/* Bulk Action Bar */}
                {isBulkEditMode && selectedGroupIds.length > 0 && (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border-b border-blue-200">
                        <span className="text-sm font-medium text-blue-700 whitespace-nowrap">{selectedGroupIds.length} group(s) selected</span>
                        <div className="flex flex-wrap items-center gap-2 ml-auto">
                            <input
                                type="text"
                                placeholder="New Name..."
                                value={bulkName}
                                onChange={(e) => setBulkName(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-blue-400 w-48"
                                disabled={bulkUpdating}
                            />
                            <input
                                type="text"
                                placeholder="New Weight..."
                                value={bulkWeight}
                                onChange={(e) => setBulkWeight(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-blue-400 w-32"
                                disabled={bulkUpdating}
                            />
                            {brandsLoading ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg bg-gray-50 h-[34px] w-48">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Loading brands...</span>
                                </div>
                            ) : (
                                <div className="w-48 relative z-[60]">
                                    <CustomDropdown
                                        value={selectedBrand}
                                        onChange={(val) => setSelectedBrand(val)}
                                        options={[
                                            { value: '', label: 'Select Brand...' },
                                            ...(Array.isArray(availableBrands) ? availableBrands : []).map(b => ({
                                                value: b._id,
                                                label: b.brandName
                                            }))
                                        ]}
                                        searchable={true}
                                        placeholder="Select Brand..."
                                        disabled={bulkUpdating}
                                        className="h-[34px]"
                                    />
                                </div>
                            )}
                            <button
                                onClick={handleBulkUpdate}
                                disabled={bulkUpdating || (!selectedBrand && !bulkName.trim() && !bulkWeight.trim())}
                                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
                            >
                                {bulkUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                                {bulkUpdating ? 'Updating...' : 'Apply Changes'}
                            </button>
                            <button
                                onClick={() => {
                                    if (onSelectionChange) onSelectionChange([]);
                                    setBulkName('');
                                    setBulkWeight('');
                                    setSelectedBrand('');
                                }}
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
                                            checked={allFilteredProducts.filter(p => !p.isHeader).length > 0 && allFilteredProducts.filter(p => !p.isHeader).every(p => selectedGroupIds.includes(p.groupingId))}
                                            onChange={(e) => {
                                                const ids = allFilteredProducts.filter(p => !p.isHeader).map(p => p.groupingId);
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
                                        minWidth: { xs: 240, sm: 280, md: 320, lg: 350 },
                                        width: { xs: 240, sm: 280, md: 320, lg: 350 },
                                        maxWidth: { xs: 240, sm: 280, md: 320, lg: 350 },
                                        borderBottom: '1px solid #e5e5e5',
                                        borderRight: '1px solid #e5e5e5',
                                        boxShadow: '4px 0 8px -4px rgba(0,0,0,0.05)',
                                        padding: '8px 16px'
                                    }}
                                >
                                    <div className="flex flex-row items-center justify-start w-full gap-3">
                                        <span className="hidden sm:inline-block w-10 text-neutral-500 font-bold">SKUs</span>
                                        <div className="flex flex-row items-center justify-start w-full gap-1">
                                            <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                                                <input
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
                                                className="hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 cursor-pointer"
                                                title="Filter & Sort"
                                            >
                                                <Filter size={16} />
                                            </button>
                                        </div>

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
                                                onClick={() => handleNameSort('asc')}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.key === 'name' && sortConfig.direction === 'asc' && !tableFilters?.tableFilters?.showNewFirst && !tableFilters?.showAdFirst && !tableFilters?.showInStockFirst && !tableFilters?.showOutStockFirst && !tableFilters?.tableFilters?.showNonHyphenOnly ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.key === 'name' && sortConfig.direction === 'asc' && !tableFilters?.tableFilters?.showNewFirst && !tableFilters?.showAdFirst && !tableFilters?.showInStockFirst && !tableFilters?.showOutStockFirst && !tableFilters?.tableFilters?.showNonHyphenOnly ? 700 : 500,
                                                    color: sortConfig.key === 'name' && sortConfig.direction === 'asc' && !tableFilters?.tableFilters?.showNewFirst && !tableFilters?.showAdFirst && !tableFilters?.showInStockFirst && !tableFilters?.showOutStockFirst && !tableFilters?.tableFilters?.showNonHyphenOnly ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' },
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <span>Product Name (A to Z)</span>
                                                {sortConfig.key === 'name' && sortConfig.direction === 'asc' && !tableFilters?.tableFilters?.showNewFirst && !tableFilters?.showAdFirst && !tableFilters?.showInStockFirst && !tableFilters?.showOutStockFirst && !tableFilters?.tableFilters?.showNonHyphenOnly && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>

                                            <MenuItem
                                                onClick={() => handleNameSort('desc')}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.key === 'name' && sortConfig.direction === 'desc' && !tableFilters?.tableFilters?.showNewFirst && !tableFilters?.showAdFirst && !tableFilters?.showInStockFirst && !tableFilters?.showOutStockFirst && !tableFilters?.tableFilters?.showNonHyphenOnly ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.key === 'name' && sortConfig.direction === 'desc' && !tableFilters?.tableFilters?.showNewFirst && !tableFilters?.showAdFirst && !tableFilters?.showInStockFirst && !tableFilters?.showOutStockFirst && !tableFilters?.tableFilters?.showNonHyphenOnly ? 700 : 500,
                                                    color: sortConfig.key === 'name' && sortConfig.direction === 'desc' && !tableFilters?.tableFilters?.showNewFirst && !tableFilters?.showAdFirst && !tableFilters?.showInStockFirst && !tableFilters?.showOutStockFirst && !tableFilters?.tableFilters?.showNonHyphenOnly ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' },
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <span>Product Name (Z to A)</span>
                                                {sortConfig.key === 'name' && sortConfig.direction === 'desc' && !tableFilters?.tableFilters?.showNewFirst && !tableFilters?.showAdFirst && !tableFilters?.showInStockFirst && !tableFilters?.showOutStockFirst && !tableFilters?.tableFilters?.showNonHyphenOnly && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>

                                            <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

                                            <MenuItem
                                                onClick={() => handleBrandSort('asc')}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.key === 'brand' && sortConfig.direction === 'asc' && !tableFilters?.tableFilters?.showNewFirst && !tableFilters?.showAdFirst && !tableFilters?.showInStockFirst && !tableFilters?.showOutStockFirst && !tableFilters?.tableFilters?.showNonHyphenOnly ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.key === 'brand' && sortConfig.direction === 'asc' && !tableFilters?.tableFilters?.showNewFirst && !tableFilters?.showAdFirst && !tableFilters?.showInStockFirst && !tableFilters?.showOutStockFirst && !tableFilters?.tableFilters?.showNonHyphenOnly ? 700 : 500,
                                                    color: sortConfig.key === 'brand' && sortConfig.direction === 'asc' && !tableFilters?.tableFilters?.showNewFirst && !tableFilters?.showAdFirst && !tableFilters?.showInStockFirst && !tableFilters?.showOutStockFirst && !tableFilters?.tableFilters?.showNonHyphenOnly ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' },
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <span>Brand Name (A to Z)</span>
                                                {sortConfig.key === 'brand' && sortConfig.direction === 'asc' && !tableFilters?.tableFilters?.showNewFirst && !tableFilters?.showAdFirst && !tableFilters?.showInStockFirst && !tableFilters?.showOutStockFirst && !tableFilters?.tableFilters?.showNonHyphenOnly && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>

                                            <MenuItem
                                                onClick={() => handleBrandSort('desc')}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.key === 'brand' && sortConfig.direction === 'desc' && !tableFilters?.tableFilters?.showNewFirst && !tableFilters?.showAdFirst && !tableFilters?.showInStockFirst && !tableFilters?.showOutStockFirst && !tableFilters?.tableFilters?.showNonHyphenOnly ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.key === 'brand' && sortConfig.direction === 'desc' && !tableFilters?.tableFilters?.showNewFirst && !tableFilters?.showAdFirst && !tableFilters?.showInStockFirst && !tableFilters?.showOutStockFirst && !tableFilters?.tableFilters?.showNonHyphenOnly ? 700 : 500,
                                                    color: sortConfig.key === 'brand' && sortConfig.direction === 'desc' && !tableFilters?.tableFilters?.showNewFirst && !tableFilters?.showAdFirst && !tableFilters?.showInStockFirst && !tableFilters?.showOutStockFirst && !tableFilters?.tableFilters?.showNonHyphenOnly ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' },
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <span>Brand Name (Z to A)</span>
                                                {sortConfig.key === 'brand' && sortConfig.direction === 'desc' && !tableFilters?.tableFilters?.showNewFirst && !tableFilters?.showAdFirst && !tableFilters?.showInStockFirst && !tableFilters?.showOutStockFirst && !tableFilters?.tableFilters?.showNonHyphenOnly && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>

                                            <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

                                            <MenuItem
                                                onClick={handleSortSubSubMenuOpen}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.key === 'averageDiscount' || sortConfig.key === 'averagePrice' || tableFilters?.showInStockFirst || tableFilters?.showOutStockFirst || tableFilters?.showAdFirst || ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].includes(sortConfig.key) || tableFilters?.showDangerFirst || tableFilters?.showPureNewFirst || sortConfig.key === 'groupCount' ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.key === 'averageDiscount' || sortConfig.key === 'averagePrice' || tableFilters?.showInStockFirst || tableFilters?.showOutStockFirst || tableFilters?.showAdFirst || ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].includes(sortConfig.key) || tableFilters?.showDangerFirst || tableFilters?.showPureNewFirst || sortConfig.key === 'groupCount' ? 700 : 500,
                                                    color: sortConfig.key === 'averageDiscount' || sortConfig.key === 'averagePrice' || tableFilters?.showInStockFirst || tableFilters?.showOutStockFirst || tableFilters?.showAdFirst || ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].includes(sortConfig.key) || tableFilters?.showDangerFirst || tableFilters?.showPureNewFirst || sortConfig.key === 'groupCount' ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' },
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <span>Sort by</span>
                                                <ChevronRight size={14} className="text-gray-400" />
                                            </MenuItem>

                                            <Menu
                                                anchorEl={sortSubMenuAnchor}
                                                open={isSortSubMenuOpen}
                                                onClose={handleSortSubSubMenuClose}
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
                                                        minWidth: '160px',
                                                        borderRadius: '0.375rem',
                                                    }
                                                }}
                                            >
                                                <MenuItem
                                                    onClick={handleHighestProductCountSort}
                                                    sx={{
                                                        px: 1.5, py: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        backgroundColor: sortConfig.key === 'groupCount' && sortConfig.direction === 'desc' ? '#f9fafb' : 'transparent',
                                                        fontWeight: sortConfig.key === 'groupCount' && sortConfig.direction === 'desc' ? 700 : 500,
                                                        color: sortConfig.key === 'groupCount' && sortConfig.direction === 'desc' ? '#171717' : '#4b5563',
                                                        '&:hover': { backgroundColor: '#f9fafb' }, cursor: 'pointer'
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp size={14} className="text-blue-600" />
                                                        <span>Group With Highest Product</span>
                                                    </div>
                                                    {sortConfig.key === 'groupCount' && sortConfig.direction === 'desc' && <Check size={14} />}
                                                </MenuItem>

                                                <MenuItem
                                                    onClick={handleLowestProductCountSort}
                                                    sx={{
                                                        px: 1.5, py: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        backgroundColor: sortConfig.key === 'groupCount' && sortConfig.direction === 'asc' ? '#f9fafb' : 'transparent',
                                                        fontWeight: sortConfig.key === 'groupCount' && sortConfig.direction === 'asc' ? 700 : 500,
                                                        color: sortConfig.key === 'groupCount' && sortConfig.direction === 'asc' ? '#171717' : '#4b5563',
                                                        '&:hover': { backgroundColor: '#f9fafb' }, cursor: 'pointer'
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <TrendingDown size={14} className="text-blue-600" />
                                                        <span>Group With Lowest Product</span>
                                                    </div>
                                                    {sortConfig.key === 'groupCount' && sortConfig.direction === 'asc' && <Check size={14} />}
                                                </MenuItem>

                                                <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

                                                <MenuItem
                                                    onClick={(e) => handleRankSubMenuOpen(e, 'asc')}
                                                    sx={{
                                                        px: 1.5, py: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        backgroundColor: sortConfig.direction === 'asc' && ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].includes(sortConfig.key) ? '#f9fafb' : 'transparent',
                                                        fontWeight: sortConfig.direction === 'asc' && ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].includes(sortConfig.key) ? 700 : 500,
                                                        color: sortConfig.direction === 'asc' && ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].includes(sortConfig.key) ? '#171717' : '#4b5563',
                                                        '&:hover': { backgroundColor: '#f9fafb' }, cursor: 'pointer'
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
                                                        px: 1.5, py: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        backgroundColor: sortConfig.direction === 'desc' && ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].includes(sortConfig.key) ? '#f9fafb' : 'transparent',
                                                        fontWeight: sortConfig.direction === 'desc' && ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].includes(sortConfig.key) ? 700 : 500,
                                                        color: sortConfig.direction === 'desc' && ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].includes(sortConfig.key) ? '#171717' : '#4b5563',
                                                        '&:hover': { backgroundColor: '#f9fafb' }, cursor: 'pointer'
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <TrendingDown size={14} className="text-rose-600" />
                                                        <span>Rank: High to Low</span>
                                                    </div>
                                                    <ChevronRight size={14} className="text-gray-400" />
                                                </MenuItem>

                                                <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

                                                <MenuItem
                                                    onClick={handleDangerFirstToggle}
                                                    sx={{
                                                        px: 1.5, py: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        backgroundColor: tableFilters?.showDangerFirst ? '#f9fafb' : 'transparent',
                                                        fontWeight: tableFilters?.showDangerFirst ? 700 : 500,
                                                        color: tableFilters?.showDangerFirst ? '#171717' : '#4b5563',
                                                        '&:hover': { backgroundColor: '#f9fafb' }, cursor: 'pointer'
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Skull size={14} className="text-rose-600" />
                                                        <span>Danger First</span>
                                                    </div>
                                                    {tableFilters?.showDangerFirst && <Check size={14} className="text-neutral-900" />}
                                                </MenuItem>

                                                <MenuItem
                                                    onClick={handlePureNewFirstToggle}
                                                    sx={{
                                                        px: 1.5, py: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        backgroundColor: tableFilters?.showPureNewFirst ? '#f9fafb' : 'transparent',
                                                        fontWeight: tableFilters?.showPureNewFirst ? 700 : 500,
                                                        color: tableFilters?.showPureNewFirst ? '#171717' : '#4b5563',
                                                        '&:hover': { backgroundColor: '#f9fafb' }, cursor: 'pointer'
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <LayoutGrid size={14} className="text-purple-600" />
                                                        <span>Pure & New (NG)</span>
                                                    </div>
                                                    {tableFilters?.showPureNewFirst && <Check size={14} className="text-neutral-900" />}
                                                </MenuItem>

                                                <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

                                                <MenuItem
                                                    onClick={() => handlePriceSort('desc')}
                                                    sx={{ px: 1.5, py: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: sortConfig.key === 'averagePrice' && sortConfig.direction === 'desc' ? '#f9fafb' : 'transparent', fontWeight: sortConfig.key === 'averagePrice' && sortConfig.direction === 'desc' ? 700 : 500, color: sortConfig.key === 'averagePrice' && sortConfig.direction === 'desc' ? '#171717' : '#4b5563', '&:hover': { backgroundColor: '#f9fafb' }, cursor: 'pointer' }}
                                                >
                                                    <span>Price: High to Low</span>
                                                    {sortConfig.key === 'averagePrice' && sortConfig.direction === 'desc' && <Check size={14} />}
                                                </MenuItem>

                                                <MenuItem
                                                    onClick={() => handlePriceSort('asc')}
                                                    sx={{ px: 1.5, py: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: sortConfig.key === 'averagePrice' && sortConfig.direction === 'asc' ? '#f9fafb' : 'transparent', fontWeight: sortConfig.key === 'averagePrice' && sortConfig.direction === 'asc' ? 700 : 500, color: sortConfig.key === 'averagePrice' && sortConfig.direction === 'asc' ? '#171717' : '#4b5563', '&:hover': { backgroundColor: '#f9fafb' }, cursor: 'pointer' }}
                                                >
                                                    <span>Price: Low to High</span>
                                                    {sortConfig.key === 'averagePrice' && sortConfig.direction === 'asc' && <Check size={14} />}
                                                </MenuItem>

                                                <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

                                                <MenuItem
                                                    onClick={handleInStockSort}
                                                    sx={{ px: 1.5, py: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: tableFilters?.showInStockFirst ? '#f9fafb' : 'transparent', fontWeight: tableFilters?.showInStockFirst ? 700 : 500, color: tableFilters?.showInStockFirst ? '#171717' : '#4b5563', '&:hover': { backgroundColor: '#f9fafb' }, cursor: 'pointer' }}
                                                >
                                                    <span>Stock In</span>
                                                    {tableFilters?.showInStockFirst && <Check size={14} />}
                                                </MenuItem>

                                                <MenuItem
                                                    onClick={handleOutStockSort}
                                                    sx={{ px: 1.5, py: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: tableFilters?.showOutStockFirst ? '#f9fafb' : 'transparent', fontWeight: tableFilters?.showOutStockFirst ? 700 : 500, color: tableFilters?.showOutStockFirst ? '#171717' : '#4b5563', '&:hover': { backgroundColor: '#f9fafb' }, cursor: 'pointer' }}
                                                >
                                                    <span>Stock Out</span>
                                                    {tableFilters?.showOutStockFirst && <Check size={14} />}
                                                </MenuItem>
                                                
                                                <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

                                                <MenuItem
                                                    onClick={handleAdSort}
                                                    sx={{ px: 1.5, py: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: tableFilters?.showAdFirst ? '#f9fafb' : 'transparent', fontWeight: tableFilters?.showAdFirst ? 700 : 500, color: tableFilters?.showAdFirst ? '#171717' : '#4b5563', '&:hover': { backgroundColor: '#f9fafb' }, cursor: 'pointer' }}
                                                >
                                                    <span>Ads</span>
                                                    {tableFilters?.showAdFirst && <Check size={14} />}
                                                </MenuItem>
                                            </Menu>

                                            {/* Rank Selection Platforms Submenu */}
                                            <Menu
                                                anchorEl={rankSubMenuAnchor}
                                                open={isRankSubMenuOpen}
                                                onClose={handleRankSubMenuClose}
                                                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                                                PaperProps={{
                                                    sx: { ml: 0.5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', border: '1px solid #e5e7eb', minWidth: '140px', borderRadius: '0.375rem' }
                                                }}
                                            >
                                                {['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'].map((plat) => (
                                                    <MenuItem
                                                        key={plat}
                                                        onClick={() => {
                                                            handlePlatformRankSort(plat);
                                                            handleRankSubMenuClose();
                                                            handleSortSubSubMenuClose();
                                                            handleSortMenuClose();
                                                        }}
                                                        sx={{
                                                            px: 1.5, py: 0.75, fontSize: '0.725rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            backgroundColor: sortConfig.key === plat && sortConfig.direction === rankSortDirection ? '#f9fafb' : 'transparent',
                                                            fontWeight: sortConfig.key === plat && sortConfig.direction === rankSortDirection ? 700 : 500,
                                                            color: sortConfig.key === plat && sortConfig.direction === rankSortDirection ? '#171717' : '#4b5563',
                                                            '&:hover': { backgroundColor: '#f9fafb' }, cursor: 'pointer'
                                                        }}
                                                    >
                                                        <span className="capitalize">{plat === 'flipkartMinutes' ? 'Flipkart' : plat}</span>
                                                        {sortConfig.key === plat && sortConfig.direction === rankSortDirection && <Check size={14} className="text-neutral-900" />}
                                                    </MenuItem>
                                                ))}
                                            </Menu>

                                            <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

                                            <MenuItem
                                                onClick={handleNewlyAddedToggle}
                                                sx={{
                                                    px: 1.5, py: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    backgroundColor: tableFilters?.showNewFirst ? '#f9fafb' : 'transparent',
                                                    fontWeight: tableFilters?.showNewFirst ? 700 : 500,
                                                    color: tableFilters?.showNewFirst ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' }, cursor: 'pointer'
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp size={14} className="text-blue-600" />
                                                    <span>Newly Added {newlyAddedCount > 0 && `(${newlyAddedCount})`}</span>
                                                </div>
                                                {tableFilters?.showNewFirst && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>

                                            {isAdmin && (
                                                <MenuItem
                                                    onClick={handleNonHyphenToggle}
                                                    sx={{
                                                        px: 1.5, py: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        backgroundColor: tableFilters?.showNonHyphenOnly ? '#f9fafb' : 'transparent',
                                                        fontWeight: tableFilters?.showNonHyphenOnly ? 700 : 500,
                                                        color: tableFilters?.showNonHyphenOnly ? '#171717' : '#4b5563',
                                                        '&:hover': { backgroundColor: '#f9fafb' }, cursor: 'pointer'
                                                    }}
                                                >
                                                    <span>Non Hyphen ( - ) ({platformCounts.nonHyphen || 0})</span>
                                                    {tableFilters?.showNonHyphenOnly && <Check size={14} className="text-neutral-900" />}
                                                </MenuItem>
                                            )}
                                        </Menu>
                                    </div>

                                </TableCell>

                                {/* Platform Headers */}
                                {['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'].map((platform) => (
                                    <TableCell
                                        key={platform}
                                        align="center"
                                        sx={{
                                            fontWeight: 'bold',
                                            textTransform: 'uppercase',
                                            color: '#737373',
                                            backgroundColor: '#fafafa',
                                            userSelect: 'none',
                                            minWidth: windowWidth < 1000 ? 80 : 110,
                                            width: windowWidth < 1000 ? 80 : 110,
                                            maxWidth: windowWidth < 1000 ? 80 : 110,
                                            padding: '8px 12px',
                                            borderBottom: '1px solid #e5e5e5',
                                        }}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            {windowWidth < 1000 ? (PLATFORM_SHORT_NAMES[platform] || platform) : (platformLabels[platform] || platform)}
                                        </div>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading && products.length === 0 ? (
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
                                                minWidth: { xs: 240, sm: 280, md: 320, lg: 350 },
                                                width: { xs: 240, sm: 280, md: 320, lg: 350 },
                                                maxWidth: { xs: 240, sm: 280, md: 320, lg: 350 },
                                                borderBottom: '1px solid #e5e5e5',
                                                borderRight: '1px solid #e5e5e5',
                                                padding: '16px 32px',
                                            }}
                                        >
                                            <div style={{ height: isAdmin ? '95px' : '70px', overflow: 'hidden' }}>
                                                <div className="grid grid-cols-[auto_1fr] gap-4">
                                                    <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-neutral-200 animate-pulse" />
                                                    <div className="w-full min-w-0 space-y-2">
                                                        <div className="h-4 bg-neutral-200 rounded animate-pulse w-3/4" />
                                                        <div className="h-3 bg-neutral-100 rounded animate-pulse w-1/2" />
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        {/* Platform Cells Skeleton */}
                                        {['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'].map(p => (
                                            <TableCell
                                                key={p}
                                                align="center"
                                                sx={{
                                                    minWidth: windowWidth < 1000 ? 80 : 110,
                                                    width: windowWidth < 1000 ? 80 : 110,
                                                    maxWidth: windowWidth < 1000 ? 80 : 110,
                                                    borderBottom: '1px solid #e5e5e5',
                                                    padding: '8px 12px',
                                                }}
                                            >
                                                <div style={{ height: isAdmin ? '95px' : '70px', overflow: 'hidden' }}>
                                                    <div className="space-y-2 flex flex-col items-center">
                                                        <div className="h-4 bg-neutral-200 rounded animate-pulse w-12" />
                                                        <div className="h-3 bg-neutral-100 rounded animate-pulse w-16" />
                                                    </div>
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
                                        sx={{ 
                                            cursor: 'pointer', 
                                            '&:hover': { backgroundColor: product.isGhostConflict ? '#fff1f2' : '#fafafa' },
                                            backgroundColor: product.isGhostConflict ? '#fff5f5' : 'transparent',
                                            opacity: product.isGhostConflict ? 0.75 : 1,
                                        }}
                                        title={product.isGhostConflict ? 'This group has a conflict but no data at the current pincode' : undefined}
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
                                                    zIndex: editingProductId === product.groupingId ? 40 : 20,
                                                    minWidth: { xs: 240, sm: 280, md: 320, lg: 350 },
                                                    width: { xs: 240, sm: 280, md: 320, lg: 350 },
                                                    maxWidth: { xs: 240, sm: 280, md: 320, lg: 350 },
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
                                                <div style={{ height: isAdmin ? '95px' : '70px', overflow: editingProductId === product.groupingId ? 'visible' : 'hidden' }}>
                                                    <div className="flex flex-row items-start gap-3">
                                                        <div className="h-10 w-10 flex-shrink-0 rounded-lg border border-neutral-200 p-0.5 bg-white overflow-hidden self-start">
                                                            <ProductImage product={product} />
                                                        </div>
                                                        <div className="w-full min-w-0">
                                                            <div className="text-[13px] font-medium text-neutral-900 whitespace-normal break-words flex items-center gap-1.5" title={product.name}>
                                                                <span
                                                                    className="flex-1 min-w-0 cursor-pointer"
                                                                    onDoubleClick={() => {
                                                                        if (isAdmin && !product.isDuplicate) {
                                                                            setEditingProductId(product.groupingId);
                                                                            setEditValue(product.name);
                                                                        }
                                                                    }}
                                                                    title={isAdmin ? (product.isDuplicate ? "Master Group controls this variant" : "Double click to edit") : product.name}
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
                                                                        <div className="block leading-tight break-words line-clamp-2 min-h-[32px]">
                                                                            {(() => {
                                                                                const isFV = category === 'Fruits & Vegetables';
                                                                                const parsed = isFV ? parseProductName(product.name) : null;
                                                                                return parsed ? (
                                                                                  <>
                                                                                    <span className="font-extrabold text-neutral-900">{parsed.firstPart}</span>
                                                                                    {parsed.rest && <span className="text-neutral-600 font-medium">{parsed.delimiter}{parsed.rest}</span>}
                                                                                  </>
                                                                                ) : (
                                                                                    <span className={cn(
                                                                                        "text-neutral-900",
                                                                                        isFV ? "font-extrabold" : "font-normal"
                                                                                    )}>
                                                                                        {product.name}
                                                                                    </span>
                                                                                );
                                                                            })()}
                                                                            {product.label && (
                                                                                <span 
                                                                                    className="ml-1.5 inline-flex items-center" 
                                                                                    title={`Label: ${product.label}`}
                                                                                >
                                                                                    <img
                                                                                        src="https://img.icons8.com/?size=100&id=86717&format=png&color=DAA520"
                                                                                        alt="Crown"
                                                                                        style={{ width: 14, height: 14 }}
                                                                                    />
                                                                                </span>
                                                                            )}
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
                                                                 <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setGroupInfoProduct(product);
                                                                        }}
                                                                        className="p-1 rounded-md transition-colors flex-shrink-0 text-blue-400 hover:text-blue-600 hover:bg-blue-50 ml-1"
                                                                        title="View Group Details (All Pincodes)"
                                                                    >
                                                                        <Info size={14} />
                                                                    </button>
                                                            </div>
                                                            <div className="text-xs text-orange-600 font-medium mt-0.5 min-h-[16px] flex items-center gap-2">
                                                                <span>{product.brand || ""}</span>
                                                                {product.createdAt && (() => {
                                                                    const created = new Date(product.createdAt);
                                                                    const { start, end } = ngInterval || scrapeIntervals || {};
                                                                    const isNew = (start && end)
                                                                        ? (created > start && created <= end)
                                                                        : (created.toDateString() === new Date().toDateString());
                                                                    return isNew && (
                                                                        <span 
                                                                            className="text-[10px] font-bold px-1 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200 animate-pulse" 
                                                                            title="New Group"
                                                                        >
                                                                            NG
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </div>
                                                            {isAdmin && !product.isDuplicate && (
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
                                                            {isAdmin && product.isDuplicate && (
                                                                <div className="mt-2 flex flex-row items-center gap-2">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRegroup(product);
                                                                        }}
                                                                        disabled={savingProductId === product.groupingId}
                                                                        className="flex-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 transition-colors text-center whitespace-nowrap flex items-center justify-center gap-1"
                                                                        title="Create a new separate group for this product and its variants"
                                                                    >
                                                                        {savingProductId === product.groupingId ? <Loader2 size={10} className="animate-spin" /> : null}
                                                                        Create Group
                                                                    </button>
                                                                </div>
                                                            )}
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
                                                        align="center"
                                                        sx={{
                                                            minWidth: windowWidth < 1000 ? 80 : 110,
                                                            width: windowWidth < 1000 ? 80 : 110,
                                                            maxWidth: windowWidth < 1000 ? 80 : 110,
                                                            padding: '8px 12px',
                                                            verticalAlign: 'top'
                                                        }}
                                                    >
                                                        <div style={{ height: isAdmin ? '95px' : '70px', overflow: 'hidden' }}>
                                                            <div className="flex flex-col items-center">
                                                                {data ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <div className={cn(
                                                                                "text-sm font-semibold",
                                                                                data.isOutOfStock ? "text-rose-600" : "text-neutral-900"
                                                                            )}>
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
                                                                        {data.isAd && (
                                                                            <span className="text-[10px] font-bold text-green-600 text-center">AD</span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col items-center">
                                                                        {(() => {
                                                                            // 1. Explicit Unserviceable check
                                                                            if (UNSERVICEABLE_PINCODES[p]?.includes(pincode)) {
                                                                                return <span className="text-xs font-bold text-rose-500">U/S</span>;
                                                                            }

                                                                            // 2. Data missing check
                                                                            if (totalPlatformCounts && totalPlatformCounts[p] === 0) {
                                                                                if (isLiveMode) {
                                                                                    return (
                                                                                        <Tooltip title="Wait for some time data is getting updated" arrow>
                                                                                            <div className="flex flex-col items-center gap-0.5 cursor-help">
                                                                                                <span className="text-sm">⌛</span>
                                                                                                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">Sync</span>
                                                                                            </div>
                                                                                        </Tooltip>
                                                                                    );
                                                                                }
                                                                                return <span className="text-xs font-bold text-rose-500">U/S</span>;
                                                                            }

                                                                            // 3. Just not in this group
                                                                            return <span className="text-sm text-neutral-400 italic">--</span>;
                                                                        })()}
                                                                    </div>
                                                                )}

                                                                {/* Show group-wide/local conflict. For non-admins, ONLY show for JioMart. */}
                                                                {((isAdmin) || (p === 'jiomart' && product.groupConflicts?.[p]?.hasConflict)) && !product.isDuplicate && (
                                                                    <>
                                                                        {product.groupConflicts?.[p]?.hasConflict && (
                                                                            <div 
                                                                                className="mt-1 flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100 animate-pulse-subtle cursor-pointer hover:bg-rose-100 transition-colors"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setCrossPincodeGroup(product);
                                                                                    setCrossPincodePlatform(p);
                                                                                }}
                                                                                title="Click to view cross-pincode group details"
                                                                            >
                                                                                <Skull size={14} className="text-rose-600" />
                                                                                <span className="text-[10px] font-bold text-rose-700">
                                                                                    {product.groupConflicts[p].count}
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        {/* Show Star icon for same-baseId duplicates */}
                                                                        {product.groupConflicts?.[p]?.hasDuplicates && (
                                                                            <div className="mt-1 flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100">
                                                                                <img
                                                                                    src="https://img.icons8.com/?size=100&id=104&format=png&color=000000"
                                                                                    alt="Star"
                                                                                    style={{ width: 14, height: 14 }}
                                                                                />
                                                                                <span className="text-[10px] font-bold text-amber-700">
                                                                                    {product.groupConflicts[p].totalCount}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
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
                            setManageGroup(null);
                            if (onRefresh) onRefresh(); // Re-fetch fresh data from DB
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

            {/* Cross-Pincode Group Details Dialog */}
            {
                crossPincodeGroup && (
                    <GroupDetailsCrossPincodeDialog
                        isOpen={!!crossPincodeGroup}
                        onClose={() => {
                            setCrossPincodeGroup(null);
                            setCrossPincodePlatform(null);
                        }}
                        groupingId={crossPincodeGroup.parentGroupId || crossPincodeGroup.groupingId}
                        primaryName={crossPincodeGroup.name}
                        selectedPlatform={crossPincodePlatform}
                        onUpdate={onRefresh || onLocalUpdate}
                        showToast={showToast}
                        isAdmin={isAdmin}
                    />
                )
            }

            {/* Simple Loading Overlay for Regrouping */}
            {isRegrouping && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/40 backdrop-blur-md transition-all animate-in fade-in">
                    <Loader2 size={48} className="text-neutral-900 animate-spin" />
                </div>
            )}

            <GroupInfoDialog
                isOpen={!!groupInfoProduct}
                onClose={() => setGroupInfoProduct(null)}
                product={groupInfoProduct}
            />

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
