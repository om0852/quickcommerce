"use client"
import React, { useState } from 'react';
import { Download, X, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExportCategoryDialog({
    isOpen,
    onClose,
    currentCategory,
    currentPincode,
    availableProducts = [],
    availablePlatforms = [],
    pincodeOptions = [],
    categoryOptions = []
}) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    // Form State
    const [email, setEmail] = useState('');

    // Dropdown States - defaulting to first option or specific values if needed
    const [selectedPlatform, setSelectedPlatform] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState(currentCategory || 'all');
    const [selectedPincode, setSelectedPincode] = useState(currentPincode || (pincodeOptions[0]?.value) || '');
    const [exportType, setExportType] = useState('latest');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await fetch('/api/export-category-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    exportType,
                    // Sending arrays to match expected backend format even though UI is single select
                    platforms: selectedPlatform === 'all' ? ['all'] : [selectedPlatform],
                    categories: selectedCategory === 'all' ? ['all'] : [selectedCategory],
                    pincodes: [selectedPincode],
                    products: ['all'] // Removed from UI, default to all
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Export failed');
            }

            setSuccess(data.message || "Excel file has been sent to your email!");
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] backdrop-blur-[4px] transition-opacity duration-200">
            <div className="bg-white rounded-xl w-[90%] max-w-[480px] max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 bg-white border-b border-neutral-100 flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900 mb-1">Export Data</h2>
                        <p className="text-sm text-neutral-500">
                            Generate an Excel report
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors border border-transparent hover:border-neutral-200"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">

                    {/* Email Input */}
                    <div className="mb-6">
                        <label className="block mb-2 text-sm font-semibold text-neutral-900">
                            Email Address <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input
                                type="email"
                                required
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-md border border-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors placeholder:text-neutral-400"
                            />
                        </div>
                    </div>

                    {/* Filters Container */}
                    <div className="mb-8">

                        {/* Grid for Dropdowns */}
                        <div className="grid gap-4">
                            {/* Export Type */}
                            <div>
                                <label className="block mb-1.5 text-sm font-medium text-neutral-600">Export Type</label>
                                <select
                                    value={exportType}
                                    onChange={(e) => setExportType(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-md border border-neutral-200 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
                                >
                                    <option value="latest">Latest Snapshot Only</option>
                                    <option value="unique">Unique Products (Last 7 Days)</option>
                                </select>
                            </div>

                            {/* Platform */}
                            <div>
                                <label className="block mb-1.5 text-sm font-medium text-neutral-600">Platform</label>
                                <select
                                    value={selectedPlatform}
                                    onChange={(e) => setSelectedPlatform(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-md border border-neutral-200 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
                                >
                                    <option value="all">All Platforms</option>
                                    {availablePlatforms.map(p => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Category & Pincode Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1.5 text-sm font-medium text-neutral-600">Category</label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-md border border-neutral-200 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
                                    >
                                        <option value="all">All</option>
                                        {categoryOptions.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-sm font-medium text-neutral-600">Pincode</label>
                                    <select
                                        value={selectedPincode}
                                        onChange={(e) => setSelectedPincode(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-md border border-neutral-200 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
                                    >
                                        {pincodeOptions.map(p => (
                                            <option key={p.value} value={p.value}>{p.value}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer actions */}
                    <div className="flex gap-3 pt-6 border-t border-neutral-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-md border border-neutral-200 bg-white text-neutral-600 text-sm font-medium hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "flex-1 px-4 py-2.5 rounded-md border border-neutral-900 bg-neutral-900 text-white text-sm font-medium flex items-center justify-center gap-2 transition-all hover:bg-black hover:shadow-md",
                                loading && "opacity-70 cursor-not-allowed hover:bg-neutral-900 hover:shadow-none"
                            )}
                        >
                            {loading ? (
                                'Processing...'
                            ) : success ? (
                                <>
                                    <CheckCircle size={16} /> Sent!
                                </>
                            ) : (
                                <>
                                    <Download size={16} /> Export
                                </>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="mt-6 p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-center gap-2 border border-red-100">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
