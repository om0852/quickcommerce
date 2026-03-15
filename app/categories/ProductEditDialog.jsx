import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Save, Loader2, ChevronDown, ChevronUp, ExternalLink, Search } from 'lucide-react';
import { Switch } from '@/components/ui/switch'; 
import { useSidebar } from '@/components/SidebarContext';
import { cn } from '@/lib/utils';
// Removed: import { brands } from '@/app/utils/brandarray';

// Searchable Brand Combobox Component
function BrandCombobox({ brand, setBrand, availableBrands, onAddNewBrand }) { // Added availableBrands, onAddNewBrand
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState(brand || '');
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    const itemRefs = useRef([]);

    // Sync search with brand when brand changes externally
    useEffect(() => {
        if (!isOpen) {
            setSearch(brand || '');
        }
    }, [brand, isOpen]);

    const filteredBrands = useMemo(() => {
        if (!availableBrands) return [];
        if (!search) return availableBrands.slice(0, 50); // Show first 50 when no search
        return availableBrands.filter(b =>
            b.toLowerCase().includes(search.toLowerCase())
        ).slice(0, 50); // Limit to 50 results
    }, [search, availableBrands]);

    const showAddOption = useMemo(() => {
        return search && !filteredBrands.some(b => b.toLowerCase() === search.toLowerCase());
    }, [search, filteredBrands]);

    const navigationOptions = useMemo(() => {
        const options = [];
        if (showAddOption) {
            options.push({ type: 'add', value: search });
        }
        filteredBrands.forEach(b => {
            options.push({ type: 'brand', value: b });
        });
        return options;
    }, [showAddOption, filteredBrands, search]);

    // Reset selected index when search or open state changes
    useEffect(() => {
        setSelectedIndex(-1);
    }, [search, isOpen]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
            itemRefs.current[selectedIndex].scrollIntoView({
                block: 'nearest',
                behavior: 'instant'
            });
        }
    }, [selectedIndex]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                inputRef.current && !inputRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = async (selectedBrand) => {
        setIsOpen(false);
        setSearch(selectedBrand);

        // Check if it's a new brand
        const isNew = availableBrands && !availableBrands.some(b => b.toLowerCase() === selectedBrand.toLowerCase());

        if (isNew && onAddNewBrand) {
            // Optimistically update parent
            setBrand(selectedBrand);
            await onAddNewBrand(selectedBrand);
        } else {
            setBrand(selectedBrand);
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearch(value);
        setBrand(value); // Update brand as user types (allows custom entry)
        if (!isOpen) setIsOpen(true);
    };

    const handleInputFocus = () => {
        setIsOpen(true);
    };

    const handleKeyDown = (e) => {
        if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setIsOpen(true);
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < navigationOptions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : navigationOptions.length - 1));
        } else if (e.key === 'Enter') {
            if (selectedIndex >= 0 && selectedIndex < navigationOptions.length) {
                e.preventDefault();
                handleSelect(navigationOptions[selectedIndex].value);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            inputRef.current?.blur();
        }
    };

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-colors"
                    placeholder="Search or add brand..."
                />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                    <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                    {navigationOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                            No brands found.
                        </div>
                    ) : (
                        <>
                            {navigationOptions.map((option, idx) => {
                                const isHighlighted = idx === selectedIndex;
                                if (option.type === 'add') {
                                    return (
                                        <button
                                            key="add-new"
                                            ref={el => itemRefs.current[idx] = el}
                                            onClick={() => handleSelect(option.value)}
                                            className={`w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 font-medium border-b border-gray-100 transition-colors ${isHighlighted ? 'bg-blue-50' : ''}`}
                                        >
                                            + Add "{option.value}" as new brand
                                        </button>
                                    );
                                }
                                return (
                                    <button
                                        key={idx}
                                        ref={el => itemRefs.current[idx] = el}
                                        onClick={() => handleSelect(option.value)}
                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${brand === option.value ? 'bg-gray-50 font-semibold' : ''} ${isHighlighted ? 'bg-gray-100' : ''}`}
                                    >
                                        {option.value}
                                    </button>
                                );
                            })}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ProductEditDialog({
    isOpen,
    onClose,
    product,
    onUpdate,
    showToast // NEW Prop
}) {
    const { isSidebarOpen } = useSidebar();
    
    // Group Level State
    const [name, setName] = useState('');
    const [weight, setWeight] = useState('');
    const [brand, setBrand] = useState('');
    const [groupImage, setGroupImage] = useState('');

    // Access available brands from API
    const [availableBrands, setAvailableBrands] = useState([]);

    // Platform Level State - Array of objects to track edits
    const [platformData, setPlatformData] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedPlatform, setExpandedPlatform] = useState(null); // Accordion state

    const platforms = ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'];

    if (!isOpen || !product) return null;

    // Fetch brands on mount
    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const res = await fetch('/api/brands');
                const data = await res.json();
                if (data.success) {
                    setAvailableBrands(data.brands.map(b => b.brandName));
                }
            } catch (err) {
                console.error("Failed to fetch brands", err);
            }
        };
        fetchBrands();
    }, []);

    // Function to handle adding a new brand
    const handleAddNewBrand = async (newBrandName) => {
        try {
            const res = await fetch('/api/brands', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brandName: newBrandName })
            });
            const data = await res.json();
            if (data.success) {
                if (showToast) showToast(`Brand "${newBrandName}" created!`, 'success');
                // Update local list
                setAvailableBrands(prev => [...prev, newBrandName].sort());
            } else if (data.error === 'Brand already exists') {
                // Ignore if exists, just select it
            } else {
                if (showToast) showToast(`Failed to create brand: ${data.error}`, 'error');
            }
        } catch (err) {
            console.error("Error creating brand", err);
            if (showToast) showToast('Error creating brand', 'error');
        }
    }

    useEffect(() => {
        if (product) {
            // Group Init
            setName(product.name || '');
            setWeight(product.weight || '');
            setBrand(product.brand || '');
            setGroupImage(product.groupImage || '');

            // Platform Init
            const initialData = [];
            platforms.forEach(p => {
                if (product[p] && product[p].snapshotId) {
                    initialData.push({
                        platform: p,
                        snapshotId: product[p].snapshotId,
                        productName: product[p].productName || '',
                        currentPrice: product[p].currentPrice || '',
                        originalPrice: product[p].originalPrice || '',
                        productWeight: product[p].productWeight || '',
                        productImage: product[p].productImage || '', // Added
                        officialCategory: product[p].officialCategory || '',
                        officialSubCategory: product[p].officialSubCategory || '',
                        productUrl: product[p].productUrl || '', // Added
                        isOutOfStock: product[p].isOutOfStock || false,
                        isAd: product[p].isAd || false,
                        // Track modification
                        isModified: false
                    });
                }
            });
            setPlatformData(initialData);
        }
    }, [product]);

    const handlePlatformChange = (index, field, value) => {
        setPlatformData(prev => {
            const newData = [...prev];
            newData[index] = {
                ...newData[index],
                [field]: value,
                isModified: true
            };
            return newData;
        });
    };

    const handleSave = async () => {
        setLoading(true);
        setError(null);

        try {
            const groupingId = product.parentGroupId || product.groupingId;
            const groupUpdatePromise = fetch('/api/grouping/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupingId: groupingId,
                    updates: { name, weight, brand, groupImage }
                })
            });

            // 2. Update Platform Snapshots
            const modifiedPlatforms = platformData.filter(p => p.isModified);
            let snapshotUpdatePromise = Promise.resolve();

            if (modifiedPlatforms.length > 0) {
                const updates = modifiedPlatforms.map(p => ({
                    snapshotId: p.snapshotId,
                    productName: p.productName,
                    currentPrice: Number(p.currentPrice),
                    originalPrice: Number(p.originalPrice),
                    productWeight: p.productWeight,
                    productImage: p.productImage, // Added
                    officialCategory: p.officialCategory,
                    officialSubCategory: p.officialSubCategory,
                    productUrl: p.productUrl, // Added
                    isOutOfStock: p.isOutOfStock,
                    isAd: p.isAd
                }));

                snapshotUpdatePromise = fetch('/api/product/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates })
                });
            }

            const [groupRes, snapRes] = await Promise.all([groupUpdatePromise, snapshotUpdatePromise]);

            if (groupRes && !groupRes.ok) throw new Error('Failed to update group');
            if (modifiedPlatforms.length > 0 && snapRes && !snapRes.ok) throw new Error('Failed to update snapshots');

            // Success
            if (showToast) showToast('Product updated successfully', 'success'); // Trigger Toast
            onUpdate({
                groupingId: product.groupingId,
                name,
                weight,
                brand,
                groupImage,
                modifiedPlatforms
            });
            onClose();

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cn(
            "fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-300",
            isSidebarOpen ? "xl:ml-64" : "xl:ml-0"
        )}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div 
                className="relative w-full max-w-4xl h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) {
                        e.preventDefault();
                        handleSave();
                    }
                }}
            >
                {/* Header */}
                <div className="flex-none px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Edit Product Details</h3>
                        <p className="text-sm text-gray-500">Edit master group and individual platform data</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200/50 cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/50">

                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md">
                            {error}
                        </div>
                    )}

                    {/* SECTION 1: Master Group */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Master Group Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">Group Name (Display Name)</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-colors"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">Group Weight</label>
                                <input
                                    type="text"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-colors"
                                />
                            </div>
                            <div className="space-y-1 relative">
                                <label className="text-xs font-semibold text-gray-500">Brand</label>
                                <BrandCombobox
                                    brand={brand}
                                    setBrand={setBrand}
                                    availableBrands={availableBrands}
                                    onAddNewBrand={handleAddNewBrand}
                                />
                            </div>
                            <div className="space-y-1 col-span-1 md:col-span-2">
                                <label className="text-xs font-semibold text-gray-500">Group Image URL (Optional Override)</label>
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={groupImage}
                                            onChange={(e) => setGroupImage(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-colors"
                                        />
                                    </div>
                                    {groupImage && (
                                        <div className="w-10 h-10 border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm flex-none">
                                            <img src={groupImage} alt="Group Preview" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Platform Specifics */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Platform Variants</h4>

                        {platformData.length === 0 && (
                            <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg text-sm text-orange-800">
                                <p className="font-bold">No platform data available for editing.</p>
                                <p className="mt-1">
                                    If you see platform data in the background but not here, your data might be stale.
                                    <br />
                                    <strong>Please refresh the page</strong> to load the latest data structure.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4">
                            {platformData.map((data, idx) => (
                                <div key={data.platform} className={`bg-white rounded-lg border transition-all ${data.isModified ? 'border-amber-300 shadow-sm' : 'border-gray-200'}`}>
                                    {/* Card Header (Click to expand) */}
                                    <div
                                        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-gray-50 rounded-t-lg transition-colors"
                                        onClick={() => setExpandedPlatform(expandedPlatform === idx ? null : idx)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold uppercase px-2 py-1 bg-neutral-900 text-white rounded">{data.platform}</span>
                                            <span className="text-sm font-medium text-gray-700 truncate max-w-[200px] md:max-w-md">{data.productName}</span>
                                            {data.isModified && <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Modified</span>}
                                        </div>
                                        <div className="text-gray-400">
                                            {expandedPlatform === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </div>
                                    </div>

                                    {/* Card Body (Expanded) */}
                                    {expandedPlatform === idx && (
                                        <div className="p-4 border-t border-gray-100 bg-gray-50/30 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-top-2">

                                            <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-3">
                                                <label className="text-xs font-semibold text-gray-500">Product Name</label>
                                                <input
                                                    type="text"
                                                    value={data.productName}
                                                    onChange={(e) => handlePlatformChange(idx, 'productName', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none"
                                                />
                                            </div>

                                            <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-3">
                                                <label className="text-xs font-semibold text-gray-500">Product Image URL</label>
                                                <div className="flex gap-2 items-start">
                                                    <input
                                                        type="text"
                                                        value={data.productImage}
                                                        onChange={(e) => handlePlatformChange(idx, 'productImage', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none"
                                                        placeholder="Image URL"
                                                    />
                                                    {data.productImage && (
                                                        <div className="flex-none w-10 h-10 border border-gray-200 rounded-md overflow-hidden bg-white group relative">
                                                            <img src={data.productImage} alt="Preview" className="w-full h-full object-contain" />
                                                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-gray-500">Current Price (₹)</label>
                                                <input
                                                    type="number"
                                                    value={data.currentPrice}
                                                    onChange={(e) => handlePlatformChange(idx, 'currentPrice', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-gray-500">MRP (₹)</label>
                                                <input
                                                    type="number"
                                                    value={data.originalPrice}
                                                    onChange={(e) => handlePlatformChange(idx, 'originalPrice', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-gray-500">Weight</label>
                                                <input
                                                    type="text"
                                                    value={data.productWeight}
                                                    onChange={(e) => handlePlatformChange(idx, 'productWeight', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-gray-500">Category</label>
                                                <input
                                                    type="text"
                                                    value={data.officialCategory}
                                                    onChange={(e) => handlePlatformChange(idx, 'officialCategory', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-gray-500">Sub Category</label>
                                                <input
                                                    type="text"
                                                    value={data.officialSubCategory}
                                                    onChange={(e) => handlePlatformChange(idx, 'officialSubCategory', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none"
                                                />
                                            </div>

                                            <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-3">
                                                <label className="text-xs font-semibold text-gray-500">Product URL</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={data.productUrl}
                                                        onChange={(e) => handlePlatformChange(idx, 'productUrl', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none"
                                                        placeholder="https://..."
                                                    />
                                                    {data.productUrl && (
                                                        <a
                                                            href={data.productUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors flex items-center justify-center p-0.5"
                                                            title="Test Link"
                                                        >
                                                            <ExternalLink size={16} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="w-full h-px bg-gray-200 col-span-1 md:col-span-2 lg:col-span-3 my-2" />

                                            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex items-center gap-6 pt-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={data.isOutOfStock}
                                                        onChange={(e) => handlePlatformChange(idx, 'isOutOfStock', e.target.checked)}
                                                        className="w-4 h-4 rounded border-gray-300 text-neutral-900 focus:ring-neutral-900"
                                                    />
                                                    <span className="text-sm text-gray-700">Out of Stock</span>
                                                </label>

                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={data.isAd}
                                                        onChange={(e) => handlePlatformChange(idx, 'isAd', e.target.checked)}
                                                        className="w-4 h-4 rounded border-gray-300 text-neutral-900 focus:ring-neutral-900"
                                                    />
                                                    <span className="text-sm text-gray-700">Is Sponsored/Ad</span>
                                                </label>
                                            </div>

                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="flex-none px-6 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-4 z-10">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 text-base font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer border border-gray-200"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-3 px-12 py-3 text-base font-bold text-white bg-neutral-900 hover:bg-black rounded-xl transition-colors disabled:opacity-70 shadow-lg transform active:scale-95 duration-200 cursor-pointer"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        Save All Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
