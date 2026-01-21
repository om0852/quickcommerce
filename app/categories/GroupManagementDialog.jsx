
import React, { useState } from 'react';
import { X, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import CustomDropdown from '@/components/CustomDropdown';

export default function GroupManagementDialog({
    isOpen,
    onClose,
    groupingId,
    productsInGroup, // Array of products already in this group (from merged data)
    onUpdate // Callback to refresh data after changes
}) {
    if (!isOpen) return null;

    const [loading, setLoading] = useState(false);
    const [addProductState, setAddProductState] = useState({
        pincode: '201303', // Default
        platform: 'zepto',
        productId: ''
    });
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    const PINCODE_OPTIONS = [
        { label: 'Delhi NCR — 201303', value: '201303' },
        { label: 'Navi Mumbai — 400706', value: '400706' },
        { label: 'Mumbai — 400070', value: '400070' },
        { label: 'Mumbai — 400703', value: '400703' },
        { label: 'Mumbai — 401101', value: '401101' },
        { label: 'Mumbai — 401202', value: '401202' }
    ];

    const PLATFORM_OPTIONS = [
        { label: 'JioMart', value: 'jiomart' },
        { label: 'Zepto', value: 'zepto' },
        { label: 'Blinkit', value: 'blinkit' },
        { label: 'DMart', value: 'dmart' },
        { label: 'Flipkart', value: 'flipkartMinutes' },
        { label: 'Instamart', value: 'instamart' }
    ];

    const handleRemove = async (product) => {
        if (!confirm(`Remove ${product.name} (${product.platform}) from this group?`)) return;

        setLoading(true);
        setError(null);
        try {
            // "product" here is the merged object node for a platform.
            // We need to resolve the platform key.
            // The table passes "merged product" which has keys like 'zepto', 'blinkit' etc.
            // We will list them in the UI and allow removing specific ones.

            // Wait, the dialog receives "productsInGroup".
            // If the parent passes the `product` object from the table row, it contains multiple platform variants.
            // We should list these variants.

            const res = await fetch('/api/grouping/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupingId,
                    productId: product.productId,
                    platform: product.srcKey // Helper needed to know which platform this specific item is from
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccessMsg('Product removed!');
            if (onUpdate) onUpdate();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!addProductState.productId) {
            setError('Product ID is required');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const res = await fetch('/api/grouping/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetGroupId: groupingId,
                    productId: addProductState.productId,
                    pincode: addProductState.pincode,
                    platform: addProductState.platform
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccessMsg('Product added successfully!');
            setAddProductState(prev => ({ ...prev, productId: '' })); // Clear ID
            if (onUpdate) onUpdate();

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Flatten the products for list view
    // The `productsInGroup` prop passed from parent should be the `product` object from the table.
    // It has keys like 'zepto', 'blinkit', etc.
    const platformItems = [];
    ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].forEach(p => {
        if (productsInGroup && productsInGroup[p]) {
            platformItems.push({
                ...productsInGroup[p],
                srcKey: p // Store platform key for logic
            });
        }
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
                    <h3 className="text-lg font-bold text-neutral-900">Manage Group: {productsInGroup.name}</h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-neutral-400 hover:text-neutral-600 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">

                    {/* Status Messages */}
                    {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100">{error}</div>}
                    {successMsg && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-md border border-green-100">{successMsg}</div>}

                    {/* Existing Products List */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Current Products</h4>
                        <div className="space-y-2">
                            {platformItems.map(item => (
                                <div key={item.srcKey} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold uppercase w-20 text-gray-500">{item.srcKey}</span>
                                        <div className="text-sm font-medium text-gray-900">
                                            {item.productName || item.name}
                                            <div className="text-xs text-gray-400 font-mono">{item.productId}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(item)}
                                        disabled={loading}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                        title="Remove from group"
                                    >
                                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Add New Product Section */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Add Product to Group</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1 block">Pincode</label>
                                <CustomDropdown
                                    value={addProductState.pincode}
                                    onChange={v => setAddProductState(prev => ({ ...prev, pincode: v }))}
                                    options={PINCODE_OPTIONS}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1 block">Platform</label>
                                <CustomDropdown
                                    value={addProductState.platform}
                                    onChange={v => setAddProductState(prev => ({ ...prev, platform: v }))}
                                    options={PLATFORM_OPTIONS}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-medium text-gray-500 mb-1 block">Product ID</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                                        placeholder="Enter Product ID..."
                                        value={addProductState.productId}
                                        onChange={e => setAddProductState(prev => ({ ...prev, productId: e.target.value }))}
                                    />
                                    <button
                                        onClick={handleAdd}
                                        disabled={loading || !addProductState.productId}
                                        className="bg-neutral-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                        Add
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">
                                    Enter the Product ID found in the database or scraper logs. The product must exist in the selected Pincode snapshot.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
