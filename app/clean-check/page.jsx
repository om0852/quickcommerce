"use client"
import React, { useState, useEffect } from 'react';
import { Search, Loader2, Trash2, Unlink, ExternalLink, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/SidebarContext';
import { SidebarOpenIcon, SidebarCloseIcon } from '@/components/SidebarIcons';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

export default function CleanCheckPage() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [regroupingId, setRegroupingId] = useState(null);
    const { isSidebarOpen, toggleSidebar } = useSidebar();
    
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

    const fetchProblematicGroups = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/grouping/problematic');
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch groups');
            setGroups(data.groups);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProblematicGroups();
    }, []);

    const showToast = (message, severity = 'success') => {
        setToast({ open: true, message, severity });
    };

    const handleRegroup = async (product, group) => {
        if (!confirm(`Are you sure you want to extract "${product.details?.productName || product.productId}" and its variants into a new separate group?`)) return;

        setRegroupingId(product.productId);
        try {
            const res = await fetch('/api/grouping/regroup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product.productId,
                    platform: product.platform,
                    category: group.category,
                    pincode: product.details?.pincode || '201303'
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast(data.message, 'success');
            // fetchProblematicGroups(); // Refresh the list
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setRegroupingId(null);
        }
    };

    const handleCloseToast = () => {
        setToast(prev => ({ ...prev, open: false }));
    };

    return (
        <div className="min-h-screen bg-[#fafafa] font-sans text-neutral-900 flex flex-col">
            {/* Header */}
            <div className="flex-none bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm z-20 min-h-[64px]">
                <div className="flex items-center gap-4">
                    {!isSidebarOpen && (
                        <button 
                            onClick={toggleSidebar}
                            className="p-2 -ml-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors animate-in fade-in"
                        >
                            <SidebarOpenIcon size={24} />
                        </button>
                    )}
                    <h1 className="text-xl font-bold tracking-tight text-neutral-900">Clean Check</h1>
                </div>
                <div className="hidden md:flex items-center gap-2 text-sm bg-rose-50 text-rose-600 rounded-lg px-3 py-1 border border-rose-100">
                    <Unlink size={14} className="animate-pulse" />
                    <span className="font-bold">Problematic Groups Analysis</span>
                </div>
            </div>

            <div className="flex-1 p-4 md:p-8">
                <div className="mb-8 max-w-[1400px] mx-auto">
                    <h2 className="text-2xl font-bold text-neutral-900">Remaining Issues</h2>
                    <p className="text-neutral-500 mt-1">Groups containing products with different Base IDs. Extracts products with the same Base ID into new groups.</p>
                </div>

                {loading ? (
                    <div className="max-w-[1400px] mx-auto py-20 flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin text-neutral-900 mb-4" size={40} />
                        <p className="text-neutral-500 font-medium tracking-wide">Analyzing grouping structure...</p>
                    </div>
                ) : error ? (
                    <div className="max-w-[1400px] mx-auto p-6 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
                        Error: {error}
                    </div>
                ) : groups.length === 0 ? (
                    <div className="max-w-[1400px] mx-auto p-20 text-center bg-white rounded-2xl border border-neutral-200 border-dashed">
                        <div className="text-5xl mb-4">✨</div>
                        <h3 className="text-lg font-bold text-neutral-900">All groups are clean!</h3>
                        <p className="text-neutral-500">No problematic groups found in the analysis file.</p>
                    </div>
                ) : (
                    <div className="max-w-[1400px] mx-auto space-y-6">
                        {groups.map((group) => (
                            <div key={group.groupingId} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                {/* Group Header */}
                                <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-lg border border-neutral-200 bg-white p-1 overflow-hidden flex-shrink-0">
                                            {group.primaryImage && group.primaryImage !== 'N/A' ? (
                                                <img src={group.primaryImage} alt={group.primaryName} className="w-full h-full object-contain" />
                                            ) : (
                                                <div className="w-full h-full bg-neutral-100 flex items-center justify-center text-[10px] text-neutral-400">No Image</div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-neutral-900">{group.primaryName}</h3>
                                            <p className="text-xs text-neutral-500 mt-0.5">ID: <span className="font-mono text-neutral-700">{group.groupingId}</span></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold px-2 py-1 bg-neutral-900 text-white rounded-full uppercase tracking-wider">
                                            {group.category}
                                        </span>
                                        <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full">
                                            {group.products.length} Products
                                        </span>
                                        {group.primaryWeight && (
                                            <span className="text-[10px] font-bold px-2 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full">
                                                {group.primaryWeight}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Products Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-white border-b border-neutral-100">
                                                <th className="px-6 py-3 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Platform</th>
                                                <th className="px-6 py-3 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Product Name / ID</th>
                                                <th className="px-6 py-3 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Weight</th>
                                                <th className="px-6 py-3 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Qty</th>
                                                <th className="px-6 py-3 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-center">Info</th>
                                                <th className="px-6 py-3 text-right text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100">
                                            {(() => {
                                                // Platform priority for sorting
                                                const priority = { 'jiomart': 1, 'blinkit': 2, 'zepto': 3, 'dmart': 4, 'flipkartMinutes': 5, 'instamart': 6 };
                                                
                                                // Sort products based on priority
                                                const sortedProducts = [...group.products].sort((a, b) => {
                                                    const pA = priority[a.platform] || 99;
                                                    const pB = priority[b.platform] || 99;
                                                    return pA - pB;
                                                });

                                                // Group internal analysis for conflicts
                                                const platformBaseIds = {};
                                                group.products.forEach(p => {
                                                    if (!platformBaseIds[p.platform]) platformBaseIds[p.platform] = new Set();
                                                    if (p.baseId) platformBaseIds[p.platform].add(p.baseId);
                                                });

                                                const platformConflicts = {};
                                                Object.keys(platformBaseIds).forEach(plat => {
                                                    if (platformBaseIds[plat].size > 1) {
                                                        platformConflicts[plat] = true;
                                                    }
                                                });

                                                return sortedProducts.map((p, idx) => {
                                                    const hasConflict = platformConflicts[p.platform];
                                                    
                                                    return (
                                                        <tr key={idx} className="hover:bg-neutral-50/50 transition-colors group/row">
                                                            <td className="px-6 py-4">
                                                                <span className={cn(
                                                                    "text-xs font-bold uppercase py-1 px-2 rounded border transition-colors",
                                                                    hasConflict ? "bg-rose-600 text-white border-rose-700 shadow-sm" : "bg-neutral-100 text-neutral-600 border-neutral-200"
                                                                )}>
                                                                    {p.platform === 'flipkartMinutes' ? 'Flipkart' : p.platform}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    {p.details?.productImage && (
                                                                        <img src={p.details.productImage} className="h-8 w-8 object-contain rounded border border-neutral-100" />
                                                                    )}
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="text-sm font-medium text-neutral-900 truncate max-w-md">
                                                                                {p.details?.productName || 'Unknown Product'}
                                                                            </p>
                                                                            {p.details?.productUrl && (
                                                                                <a 
                                                                                    href={p.details.productUrl} 
                                                                                    target="_blank" 
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-neutral-400 hover:text-blue-600 transition-colors"
                                                                                    title="Visit Product Page"
                                                                                >
                                                                                    <ExternalLink size={14} />
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                        <p className={cn(
                                                                            "text-[10px] font-mono mt-0.5",
                                                                            hasConflict ? "text-rose-600 font-bold" : "text-neutral-400"
                                                                        )}>
                                                                            {p.productId}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-xs text-neutral-600 font-medium">
                                                                    {p.details?.productWeight || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-xs text-neutral-600 font-medium">
                                                                    {p.details?.quantity || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {p.details ? (
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <span className="text-sm font-bold text-neutral-900">₹{p.details.currentPrice}</span>
                                                                        <span className="text-[9px] text-neutral-400 font-medium">Scraped: {new Date(p.details.scrapedAt).toLocaleDateString()}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs italic text-neutral-400">Snapshot not found</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button
                                                                    onClick={() => handleRegroup(p, group)}
                                                                    disabled={regroupingId === p.productId}
                                                                    className={cn(
                                                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all border",
                                                                        hasConflict 
                                                                            ? "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border-rose-100" 
                                                                            : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border-blue-100"
                                                                    )}
                                                                >
                                                                    {regroupingId === p.productId ? (
                                                                        <Loader2 size={14} className="animate-spin" />
                                                                    ) : (
                                                                        <Unlink size={14} />
                                                                    )}
                                                                    Regroup
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Simple Loading Overlay for Regrouping */}
            {regroupingId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 backdrop-blur-md transition-all animate-in fade-in">
                    <Loader2 size={48} className="text-neutral-900 animate-spin" />
                </div>
            )}

            <Snackbar 
                open={toast.open} 
                autoHideDuration={4000} 
                onClose={handleCloseToast}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%', borderRadius: '12px', fontWeight: 600 }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </div>
    );
}
