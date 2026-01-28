
import React, { useState } from 'react';
import { X, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import CustomDropdown from '@/components/CustomDropdown';

export default function GroupManagementDialog({
    isOpen,
    onClose,
    groupingId,
    productsInGroup, // Array of products already in this group (from merged data)
    onUpdate, // Callback to refresh data after changes
    currentPincode = '201303' // Default to 201303 if not provided
}) {
    if (!isOpen) return null;

    const [loading, setLoading] = useState(false);
    const [addProductState, setAddProductState] = useState({
        pincode: currentPincode, // Use passed prop as default
        platform: 'zepto',
        productId: ''
    });
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    const PINCODE_OPTIONS = [
        { label: 'Delhi NCR — 201303', value: '201303' },
        { label: 'Navi Mumbai — 400706', value: '400706' },
        { label: 'Delhi NCR — 201014', value: '201014' },
        { label: 'Delhi NCR — 122008', value: '122008' },
        { label: 'Delhi NCR — 122010', value: '122010' },
        { label: 'Delhi NCR — 122016', value: '122016' },
        { label: 'Mumbai — 400070', value: '400070' },
        { label: 'Mumbai — 400703', value: '400703' },
        { label: 'Mumbai — 401101', value: '401101' },
        { label: 'Mumbai — 401202', value: '401202' },
        { label: 'Delhi — 110001', value: '110001' },
        { label: 'Delhi — 110075', value: '110075' }
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative w-full h-full max-w-6xl max-h-[95vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-8 py-5 border-b border-neutral-200 bg-gradient-to-r from-neutral-50 to-neutral-100/50">
                    <div>
                        <h3 className="text-lg sm:text-2xl font-bold text-neutral-900">Manage Product Group</h3>
                        <p className="text-xs sm:text-sm text-neutral-500 mt-1">Group ID: <span className="font-mono font-semibold text-neutral-700">{groupingId}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8">

                    {/* Status Messages */}
                    {error && <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-start gap-3"><span className="text-lg">⚠️</span>{error}</div>}
                    {successMsg && <div className="p-4 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 flex items-start gap-3"><span className="text-lg">✓</span>{successMsg}</div>}

                    {/* Current Products Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm sm:text-base font-bold text-neutral-900 uppercase tracking-wider">Current Products in Group</h4>
                            <span className="bg-neutral-900 text-white text-xs font-bold px-3 py-1 rounded-full">{platformItems.length} Items</span>
                        </div>

                        {platformItems.length === 0 ? (
                            <div className="p-8 text-center bg-neutral-50 rounded-lg border border-dashed border-neutral-300">
                                <p className="text-neutral-500 text-sm">No products in this group yet. Add one below!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {platformItems.map(item => (
                                    <div key={item.srcKey} className="bg-white p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all">
                                        <div className="flex items-start justify-between mb-3">
                                            <span className="text-xs font-bold uppercase px-2 py-1 bg-neutral-900 text-white rounded">{item.srcKey}</span>
                                            <button
                                                onClick={() => handleRemove(item)}
                                                disabled={loading}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                                title="Remove from group"
                                            >
                                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-sm font-semibold text-neutral-900 line-clamp-2">
                                                {item.productName || item.name}
                                            </p>
                                            <div className="p-2 bg-neutral-50 rounded border border-neutral-200">
                                                <p className="text-[10px] text-neutral-500 font-medium">Product ID</p>
                                                <p className="text-xs font-mono font-bold text-neutral-700 mt-0.5 break-all">{item.productId}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add New Product Section */}
                    <div className="space-y-4 pt-4 border-t border-neutral-200">
                        <h4 className="text-sm sm:text-base font-bold text-neutral-900 uppercase tracking-wider">Add New Product</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-neutral-50 p-6 rounded-lg border border-neutral-200">
                            <div>
                                <label className="text-xs font-bold text-neutral-600 mb-2 block uppercase tracking-wider">Pincode</label>
                                <CustomDropdown
                                    value={addProductState.pincode}
                                    onChange={v => setAddProductState(prev => ({ ...prev, pincode: v }))}
                                    options={PINCODE_OPTIONS}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-600 mb-2 block uppercase tracking-wider">Platform</label>
                                <CustomDropdown
                                    value={addProductState.platform}
                                    onChange={v => setAddProductState(prev => ({ ...prev, platform: v }))}
                                    options={PLATFORM_OPTIONS}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-600 mb-2 block uppercase tracking-wider">Product ID</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                                    placeholder="Enter Product ID..."
                                    value={addProductState.productId}
                                    onChange={e => setAddProductState(prev => ({ ...prev, productId: e.target.value }))}
                                />
                            </div>
                            <div className="sm:col-span-2 lg:col-span-3">
                                <button
                                    onClick={handleAdd}
                                    disabled={loading || !addProductState.productId}
                                    className="w-full bg-neutral-900 hover:bg-neutral-800 text-white px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                    Add Product to Group
                                </button>
                                <p className="text-[11px] text-neutral-500 mt-3 leading-relaxed">
                                    💡 Enter the Product ID from the database or scraper logs. The product must exist in the selected Pincode snapshot.
                                </p>
                            </div>
                        </div>

                        {/* DANGER ZONE: Delete Entire Group */}
                        <div className="mt-8 pt-8 border-t border-red-100">
                            <h4 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-2">Danger Zone</h4>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-red-900">Delete this entire group</p>
                                    <p className="text-xs text-red-600 mt-1">This will dissolve the group. Products will remain in the database but will be ungrouped.</p>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (confirm('Are you sure you want to DELETE this entire group? all products inside it will be ungrouped.')) {
                                            setLoading(true);
                                            try {
                                                const res = await fetch('/api/grouping/delete-group', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ groupingId })
                                                });
                                                const data = await res.json();
                                                if (!res.ok) throw new Error(data.error);

                                                alert('Group deleted successfully!');
                                                onClose();
                                                if (onUpdate) onUpdate();
                                            } catch (err) {
                                                setError(err.message);
                                                setLoading(false);
                                            }
                                        }
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm transition-colors"
                                >
                                    Delete Group
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
