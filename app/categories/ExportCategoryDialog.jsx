"use client"
import React, { useState, useEffect } from 'react';
import { Download, X, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/SidebarContext';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import { validateEmail } from '@/app/utils/formatters';

export default function ExportCategoryDialog({
    isOpen,
    onClose,
    currentCategory,
    currentPincode,
    availableProducts = [],
    availablePlatforms = [],
    pincodeOptions = [],
    categoryOptions = [],
    latestSnapshotTime = null
}) {
    const { isSidebarOpen } = useSidebar();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);

    // Form State
    const [email, setEmail] = useState('');

    // Dropdown States - defaulting to first option or specific values if needed
    const [selectedPlatform, setSelectedPlatform] = useState('all');
    // Default to currentCategory or first available option. Remove 'all' fallback.
    const [selectedCategory, setSelectedCategory] = useState(currentCategory || categoryOptions[0]?.value || '');
    // Initialize with current pincode as array, or empty/first option
    const [selectedPincodes, setSelectedPincodes] = useState(currentPincode ? [currentPincode] : (pincodeOptions[0]?.value ? [pincodeOptions[0].value] : []));
    const [exportType, setExportType] = useState('latest');

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Sync state with current page selections when modal opens
    useEffect(() => {
        if (isOpen) {
            if (currentCategory) setSelectedCategory(currentCategory);
            if (currentPincode) setSelectedPincodes([currentPincode]);
        }
    }, [isOpen, currentCategory, currentPincode]);

    if (!isOpen) return null;

    const handleAction = async (actionType) => {
        // Validation
        if (selectedPincodes.length === 0) {
            setError("Please select at least 1 pincode.");
            return;
        }
        if (selectedPincodes.length > 5) {
            setError("Maximum 5 pincodes allowed.");
            return;
        }

        if (actionType === 'email' && !email) {
            setError("Email address is required for sending email.");
            return;
        }

        // Validate email format
        if (actionType === 'email' && email) {
            if (!validateEmail(email)) {
                setError("Please enter a valid email address.");
                return;
            }
        }

        setLoading(true);
        setError(null);
        setSuccess(false);
        setProgress(0);

        // Simulate progress for UX
        const duration = 2000; // Estimated time
        const interval = 100;
        const steps = duration / interval;
        const increment = 90 / steps;

        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return 90;
                }
                return prev + increment;
            });
        }, interval);

        try {
            // Logic:
            // Download -> Send no email
            // Email button -> Sends email. 

            const payloadEmail = actionType === 'email' ? email : '';

            const response = await fetch('/api/export-category-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: payloadEmail,
                    exportType,
                    platforms: selectedPlatform === 'all' ? ['all'] : [selectedPlatform],
                    categories: selectedCategory === 'all' ? ['all'] : [selectedCategory],
                    pincodes: selectedPincodes.length > 0 ? selectedPincodes : ['all'],
                    products: ['all']
                })
            });

            clearInterval(progressInterval); // Stop simulation

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Export failed');
            }

            setProgress(100);

            // If Download Action, process the blob
            if (actionType === 'download') {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const disposition = response.headers.get('Content-Disposition');
                let filename = `category_export_${Date.now()}.xlsx`;
                if (disposition && disposition.indexOf('attachment') !== -1) {
                    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                    if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
                }
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                setSuccess("Download started!");
            } else {
                setSuccess("Email sent successfully!");
            }

            setTimeout(() => {
                if (actionType === 'email') onClose();
                setSuccess(false);
                setProgress(0);
            }, 3000);

        } catch (err) {
            clearInterval(progressInterval);
            setProgress(0);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cn(
            "fixed inset-0 bg-black/40 flex items-center justify-center z-[200] backdrop-blur-[4px] transition-all duration-300",
            isSidebarOpen ? "xl:ml-64" : "xl:ml-0"
        )} onClick={onClose}>
            <div className="bg-white rounded-xl overflow-hidden w-[90%] max-w-[600px] max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="flex-none p-5 bg-white border-b border-neutral-200 flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900 mb-1">Export Data</h2>
                        <p className="text-sm text-neutral-500">
                            Generate an Excel report
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 bg-gray-50">

                    <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm mb-4">
                        {/* Email Input */}
                        <div className="mb-0">
                            <label className="block mb-2 text-sm font-semibold text-neutral-900">
                                Email Address <span className="text-neutral-400 font-normal">(Required for Email)</span>
                            </label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-md border border-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors placeholder:text-neutral-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filters Container */}
                    <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm mb-4">

                        {/* Grid for Dropdowns */}
                        <div className="grid gap-3">
                            {/* Export Type */}
                            <div>
                                <label className="block mb-1.5 text-sm font-medium text-neutral-600">Export Type</label>
                                <div className="w-full px-3 py-2.5 rounded-md border border-neutral-200 text-sm bg-neutral-50 text-neutral-700 flex items-center justify-between">
                                    <span className="font-medium">Latest Snapshot</span>
                                    {latestSnapshotTime && (
                                        <span className="text-xs text-neutral-400 ml-2">
                                            {new Date(latestSnapshotTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            {' · '}
                                            {new Date(latestSnapshotTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Platform */}
                            <div>
                                <label className="block mb-1.5 text-sm font-medium text-neutral-600">Platform</label>
                                <select
                                    value={selectedPlatform}
                                    onChange={(e) => setSelectedPlatform(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-md border border-neutral-200 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 cursor-pointer"
                                >
                                    {/* <option value="all">All Platforms</option> */}
                                    {availablePlatforms.map(p => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Category & Pincode Row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1.5 text-sm font-medium text-neutral-600">Category</label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-md border border-neutral-200 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 cursor-pointer"
                                    >
                                        {/* Remove All option as per request */}
                                        {categoryOptions.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-sm font-medium text-neutral-600">
                                        Pincode <span className="text-xs text-neutral-400 font-normal">(Max 5)</span>
                                    </label>
                                    <MultiSelectDropdown
                                        value={selectedPincodes}
                                        onChange={(newValues) => {
                                            if (newValues.length <= 5) {
                                                setSelectedPincodes(newValues);
                                            } else {
                                                // Ideally show toast, but for now just block
                                                // We can use the existing error state or a temporary toast if available in this scope?
                                                // We don't have a toast function passed here except internal error? 
                                                // Actually we can set error temporarily or just ignore.
                                                // Let's just ignore the addition if > 5.
                                            }
                                        }}
                                        options={pincodeOptions}
                                        placeholder="Select Pincodes"
                                        position="top"
                                    />
                                    {selectedPincodes.length > 5 && <p className="text-xs text-red-500 mt-1">Maximum 5 pincodes allowed.</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {loading && (
                        <div className="mb-6">
                            <div className="flex justify-between text-xs font-medium text-neutral-500 mb-2">
                                <span>Exporting...</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-neutral-900 transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Footer actions */}
                </div>
                <div className="flex-none flex gap-3 p-5 bg-white border-t border-neutral-200">
                    {/* Cancel */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-md border border-neutral-200 bg-white text-neutral-600 text-sm font-medium hover:bg-neutral-50 hover:text-neutral-900 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>

                    <div className="flex-1 flex gap-2">
                        {/* Email Button */}
                        <button
                            type="button"
                            onClick={() => handleAction('email')}
                            disabled={loading}
                            className={cn(
                                "flex-1 px-4 py-2.5 rounded-md border border-neutral-900 bg-neutral-900 text-white text-sm font-medium flex items-center justify-center gap-2 transition-all hover:bg-black hover:shadow-md cursor-pointer",
                                loading && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {loading && (email) ? ( // Crude loading check logic? Better to maybe separate loading states or just generic spinner
                                'Sending...'
                            ) : (
                                <>
                                    <Mail size={16} /> Email
                                </>
                            )}
                        </button>

                        {/* Download Button */}
                        <button
                            type="button"
                            onClick={() => handleAction('download')}
                            disabled={loading}
                            className={cn(
                                "flex-1 px-4 py-2.5 rounded-md border border-neutral-200 bg-white text-neutral-900 text-sm font-medium flex items-center justify-center gap-2 transition-all hover:bg-gray-50 hover:border-neutral-300 cursor-pointer",
                                loading && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Download size={16} /> Download
                        </button>
                    </div>
                </div>

                {/* Floating Notifications */}
                <div className="fixed top-10 right-10 z-[250] flex flex-col gap-3">
                    {success && (
                        <div className="p-3 bg-green-50 text-green-700 rounded-lg shadow-lg text-sm flex items-center gap-2 border border-green-200 animate-in fade-in slide-in-from-top-2">
                            <CheckCircle size={16} />
                            {success}
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg shadow-lg text-sm flex items-center gap-2 border border-red-200 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
