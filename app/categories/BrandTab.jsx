import React, { useMemo, useState, useEffect } from 'react';
import { Search, X, Package, Menu as MenuIcon, RefreshCw, TrendingUp, TrendingDown, Check, ChevronUp, ChevronDown, ChevronsUpDown, Filter, Plus, Edit2, Trash2 } from 'lucide-react';
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
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

// Skeleton component
const Skeleton = ({ className }) => (
    <div className={cn("animate-pulse bg-gray-200 rounded", className)} />
);

const BrandTab = ({ products, loading, platformFilter = 'all', pincode, snapshotDate, isAdmin = false }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' }); // key: 'name' | 'total' | platform, direction: 'asc' | 'desc'
    const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
    const isSortMenuOpen = Boolean(sortMenuAnchor);

    const [apiBrands, setApiBrands] = useState([]);
    const [isFetchingBrands, setIsFetchingBrands] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isAdmin) {
            fetchBrands();
        }
    }, [isAdmin]);

    const fetchBrands = async () => {
        setIsFetchingBrands(true);
        try {
            const res = await fetch('/api/brands?all=true');
            const data = await res.json();
            if (data.success) setApiBrands(data.brands);
        } catch (err) {
            console.error("Failed to fetch brands from API", err);
        } finally {
            setIsFetchingBrands(false);
        }
    };

    const handleAddBrand = async () => {
        const brandName = window.prompt("Enter new brand name:");
        if (!brandName || !brandName.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/brands', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brandName: brandName.trim() })
            });
            const data = await res.json();
            if (data.success) {
                alert("Brand added successfully!");
                fetchBrands();
            } else {
                alert(data.error || "Failed to add brand");
            }
        } catch (err) {
            console.error(err);
            alert("Error adding brand");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditBrand = async (brand) => {
        // apiBrand check (we need the _id to update/delete)
        const matchedApiBrand = apiBrands.find(b => b.brandName === brand.name);
        if (!matchedApiBrand) {
            alert("This brand is derived from products and not in the database yet. Adding it first...");
            // Optionally, create it on the fly, but let's prompt them to create it manually or automatically create it.
            return;
        }

        const newName = window.prompt(`Rename brand "${brand.name}" to:`, brand.name);
        if (!newName || !newName.trim() || newName.trim() === brand.name) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/brands/${matchedApiBrand._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newBrandName: newName.trim() })
            });
            const data = await res.json();
            if (data.success) {
                alert("Brand renamed successfully! Product snapshots will update in the background. Please refresh data.");
                fetchBrands();
            } else {
                alert(data.error || "Failed to rename brand");
            }
        } catch (err) {
            console.error(err);
            alert("Error renaming brand");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteBrand = async (brand) => {
        const matchedApiBrand = apiBrands.find(b => b.brandName === brand.name);
        if (!matchedApiBrand) {
            alert("This brand is not in the database.");
            return;
        }

        if (!window.confirm(`Are you sure you want to delete the brand "${brand.name}"? This will remove it from all products and groups.`)) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/brands/${matchedApiBrand._id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                alert("Brand deleted successfully!");
                fetchBrands();
            } else {
                alert(data.error || "Failed to delete brand");
            }
        } catch (err) {
            console.error(err);
            alert("Error deleting brand");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSortMenuClick = (event) => {
        setSortMenuAnchor(event.currentTarget);
    };

    const handleSortMenuClose = () => {
        setSortMenuAnchor(null);
    };

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

        // Merge apiBrands if isAdmin
        if (isAdmin) {
            apiBrands.forEach(apiBrand => {
                if (!brandMap[apiBrand.brandName]) {
                    brandMap[apiBrand.brandName] = {
                        name: apiBrand.brandName,
                        total: 0,
                        jiomart: 0,
                        zepto: 0,
                        blinkit: 0,
                        dmart: 0,
                        flipkartMinutes: 0,
                        instamart: 0
                    };
                }
            });
        }

        const brandList = Object.values(brandMap).sort((a, b) => {
            const aEmpty = a.total === 0;
            const bEmpty = b.total === 0;

            // Push empty brands to the very bottom
            if (aEmpty && !bEmpty) return 1;
            if (!aEmpty && bEmpty) return -1;

            // 'Other' goes to the bottom of the non-empty list
            if (a.name === 'Other') return 1;
            if (b.name === 'Other') return -1;

            if (sortConfig.key === 'name') {
                if (sortConfig.direction === 'asc') {
                    return a.name.localeCompare(b.name);
                } else {
                    return b.name.localeCompare(a.name);
                }
            } else if (sortConfig.key) {
                // Sort by specific key (total or platform)
                const valA = a[sortConfig.key] || 0;
                const valB = b[sortConfig.key] || 0;
                // console.log(`Sorting ${sortConfig.key} (${sortConfig.direction}): ${a.name}(${valA}) vs ${b.name}(${valB})`);
                if (sortConfig.direction === 'asc') {
                    return valA - valB;
                } else {
                    return valB - valA;
                }
            } else {
                // Default: Sort by total count desc
                return b.total - a.total;
            }
        });

        // Apply Platform Filter
        if (platformFilter !== 'all') {
            return brandList.filter(b => b[platformFilter] > 0 || (isAdmin && b.total === 0));
        }
        return brandList;

    }, [products, platformFilter, sortConfig, apiBrands, isAdmin]);

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

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        } else if (sortConfig.key === key && sortConfig.direction === 'asc') {
            setSortConfig({ key: null, direction: 'desc' }); // Reset
            return;
        }
        setSortConfig({ key, direction });
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
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                        width: '100%',
                                        gap: '10px'
                                    }}>
                                        <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                                            <input
                                                type="text"
                                                placeholder="Search Brands..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-neutral-400 transition-all font-medium normal-case placeholder:text-gray-400 text-neutral-700"
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Hamburger Sort Menu */}
                                        <button
                                            onClick={handleSortMenuClick}
                                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 cursor-pointer"
                                            title="Filter & Sort"
                                        >
                                            <Filter size={16} />
                                        </button>

                                        {isAdmin && (
                                            <button
                                                onClick={handleAddBrand}
                                                disabled={isSubmitting}
                                                className="ml-2 flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                                title="Add New Brand"
                                            >
                                                <Plus size={14} /> Add Brand
                                            </button>
                                        )}

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
                                                    setSortConfig({ key: null, direction: 'desc' });
                                                    handleSortMenuClose();
                                                }}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.key === null ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.key === null ? 700 : 500,
                                                    color: sortConfig.key === null ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' }
                                                }}
                                            >
                                                <span>Default (Total Count)</span>
                                                {sortConfig.key === null && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>

                                            <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

                                            <MenuItem
                                                onClick={() => {
                                                    setSortConfig({ key: 'name', direction: 'asc' });
                                                    handleSortMenuClose();
                                                }}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.key === 'name' && sortConfig.direction === 'asc' ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.key === 'name' && sortConfig.direction === 'asc' ? 700 : 500,
                                                    color: sortConfig.key === 'name' && sortConfig.direction === 'asc' ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' }
                                                }}
                                            >
                                                <span>Name (A to Z)</span>
                                                {sortConfig.key === 'name' && sortConfig.direction === 'asc' && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>

                                            <MenuItem
                                                onClick={() => {
                                                    setSortConfig({ key: 'name', direction: 'desc' });
                                                    handleSortMenuClose();
                                                }}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.key === 'name' && sortConfig.direction === 'desc' ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.key === 'name' && sortConfig.direction === 'desc' ? 700 : 500,
                                                    color: sortConfig.key === 'name' && sortConfig.direction === 'desc' ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' }
                                                }}
                                            >
                                                <span>Name (Z to A)</span>
                                                {sortConfig.key === 'name' && sortConfig.direction === 'desc' && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>

                                            <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />

                                            <MenuItem
                                                onClick={() => {
                                                    setSortConfig({ key: 'total', direction: 'desc' });
                                                    handleSortMenuClose();
                                                }}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.key === 'total' && sortConfig.direction === 'desc' ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.key === 'total' && sortConfig.direction === 'desc' ? 700 : 500,
                                                    color: sortConfig.key === 'total' && sortConfig.direction === 'desc' ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' }
                                                }}
                                            >
                                                <span>Total (High to Low)</span>
                                                {sortConfig.key === 'total' && sortConfig.direction === 'desc' && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>

                                            <MenuItem
                                                onClick={() => {
                                                    setSortConfig({ key: 'total', direction: 'asc' });
                                                    handleSortMenuClose();
                                                }}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: sortConfig.key === 'total' && sortConfig.direction === 'asc' ? '#f9fafb' : 'transparent',
                                                    fontWeight: sortConfig.key === 'total' && sortConfig.direction === 'asc' ? 700 : 500,
                                                    color: sortConfig.key === 'total' && sortConfig.direction === 'asc' ? '#171717' : '#4b5563',
                                                    '&:hover': { backgroundColor: '#f9fafb' }
                                                }}
                                            >
                                                <span>Total (Low to High)</span>
                                                {sortConfig.key === 'total' && sortConfig.direction === 'asc' && <Check size={14} className="text-neutral-900" />}
                                            </MenuItem>
                                        </Menu>
                                    </div>
                                </TableCell>
                                {platforms.map(p => (
                                    <TableCell
                                        key={p}
                                        align="center"
                                        onClick={() => handleSort(p)}
                                        sx={{
                                            fontWeight: 'bold',
                                            color: '#737373',
                                            backgroundColor: '#fafafa',
                                            borderBottom: '1px solid #e5e5e5',
                                            padding: '12px 16px',
                                            minWidth: 100,
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            '&:hover': { backgroundColor: '#f5f5f5' }
                                        }}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            {platformLabels[p]}
                                            {sortConfig.key === p ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> :
                                                    <ChevronDown size={14} />
                                            ) : (
                                                <ChevronsUpDown size={14} className="text-neutral-300" />
                                            )}
                                        </div>
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
                                {isAdmin && (
                                    <TableCell
                                        align="center"
                                        sx={{
                                            fontWeight: 'bold',
                                            color: '#171717',
                                            backgroundColor: '#f5f5f5',
                                            borderBottom: '1px solid #e5e5e5',
                                            padding: '12px 16px',
                                            minWidth: 80
                                        }}
                                    >
                                        Actions
                                    </TableCell>
                                )}
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
                                            {isAdmin && (
                                                <TableCell align="center" sx={{ padding: '12px 16px', backgroundColor: '#fafafa' }}>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEditBrand(brand); }}
                                                            className="text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                                                            title="Rename Brand"
                                                            disabled={isSubmitting}
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand); }}
                                                            className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                                                            title="Delete Brand"
                                                            disabled={isSubmitting}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </TableCell>
                                            )}
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
                                    {isAdmin && <TableCell sx={{ backgroundColor: '#262626' }}></TableCell>}
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
                    pincode={pincode}
                    snapshotDate={snapshotDate}
                    isAdmin={isAdmin}
                />
            )}
        </div>
    );
};

export default BrandTab;

