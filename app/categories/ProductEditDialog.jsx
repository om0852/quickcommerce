import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Save, Loader2, ChevronDown, ChevronUp, ExternalLink, Search } from 'lucide-react';
import { Switch } from '@/components/ui/switch'; // Assuming you have a Switch component, if not will use standard input or create simple toggle
import { brands } from '@/app/utils/brandarray';

// Searchable Brand Combobox Component
function BrandCombobox({ brand, setBrand }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState(brand || '');
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Sync search with brand when brand changes externally
    useEffect(() => {
        if (!isOpen) {
            setSearch(brand || '');
        }
    }, [brand, isOpen]);

    const filteredBrands = useMemo(() => {
        if (!search) return brands.slice(0, 50); // Show first 50 when no search
        return brands.filter(b =>
            b.toLowerCase().includes(search.toLowerCase())
        ).slice(0, 50); // Limit to 50 results
    }, [search]);

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

    const handleSelect = (selectedBrand) => {
        setBrand(selectedBrand);
        setSearch(selectedBrand);
        setIsOpen(false);
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
                    {filteredBrands.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                            No brands found.
                            {search && (
                                <button
                                    onClick={() => handleSelect(search)}
                                    className="block w-full mt-2 text-left text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    + Add "{search}" as new brand
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {search && !filteredBrands.includes(search) && (
                                <button
                                    onClick={() => handleSelect(search)}
                                    className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 font-medium border-b border-gray-100"
                                >
                                    + Add "{search}" as new brand
                                </button>
                            )}
                            {filteredBrands.map((b, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelect(b)}
                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${brand === b ? 'bg-gray-100 font-semibold' : ''}`}
                                >
                                    {b}
                                </button>
                            ))}
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
    if (!isOpen || !product) return null;

    // Group Level State
    const [name, setName] = useState('');
    const [weight, setWeight] = useState('');
    const [brand, setBrand] = useState('');

    // Platform Level State - Array of objects to track edits
    const [platformData, setPlatformData] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedPlatform, setExpandedPlatform] = useState(null); // Accordion state

    const platforms = ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'];

    useEffect(() => {
        if (product) {
            // Group Init
            setName(product.name || '');
            setWeight(product.weight || '');
            setBrand(product.brand || '');

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
            // 1. Update Group Details
            const groupUpdatePromise = fetch('/api/grouping/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupingId: product.groupingId,
                    updates: { name, weight, brand }
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
            onUpdate(); // Trigger refresh
            onClose();

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-4xl h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                                <BrandCombobox brand={brand} setBrand={setBrand} />
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
                <div className="flex-none px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 z-10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-neutral-900 hover:bg-black rounded-lg transition-colors disabled:opacity-70 shadow-md transform active:scale-95 duration-200 cursor-pointer"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save All Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
