import React, { useState, useEffect } from 'react';
import { X, Loader2, MapPin, Package, ExternalLink, Unlink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/SidebarContext';
import ProductImage from './ProductImage';

export default function GroupDetailsCrossPincodeDialog({
    isOpen,
    onClose,
    groupingId,
    primaryName,
    selectedPlatform,
    onUpdate,
    showToast,
    isAdmin = false
}) {
    const { isSidebarOpen } = useSidebar();
    const [loading, setLoading] = useState(true);
    const [removingId, setRemovingId] = useState(null);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/grouping/cross-pincode?groupingId=${groupingId}`);
            const result = await res.json();
            if (result.success) {
                setData(result);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('Failed to fetch cross-pincode data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && groupingId) {
            fetchData();
        }
    }, [isOpen, groupingId]);

    const handleRemove = async (product) => {
        if (!confirm(`Are you sure you want to remove "${product.productName}" (${product.productId}) from this group?\n\nThis will move it into its own separate group.`)) return;

        setRemovingId(product.productId);
        try {
            const res = await fetch('/api/grouping/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupingId,
                    productId: product.productId,
                    platform: product.platform
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to remove product');

            if (showToast) showToast('Product removed from group successfully!', 'success');
            
            // If there was only one product (or after filtering), maybe close the dialog
            // More robust: just re-fetch data to reflect changes
            await fetchData();
            if (onUpdate) onUpdate();

        } catch (err) {
            if (showToast) showToast(err.message, 'error');
        } finally {
            setRemovingId(null);
        }
    };

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const targetPincodes = ['400706', '400703'];

    return (
        <div className={cn(
            "fixed inset-0 z-[300] flex items-center justify-center p-4 transition-all duration-300",
            isSidebarOpen ? "xl:ml-64" : "xl:ml-0"
        )}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-4 sm:px-6 py-4 border-b border-neutral-200 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Group Image */}
                        <div className="w-12 h-12 bg-white border border-gray-200 rounded flex-none p-1 flex items-center justify-center overflow-hidden shrink-0">
                            {data?.products?.[0] ? (
                                <ProductImage product={{
                                    ...data.products[0],
                                    [data.products[0].platform.toLowerCase()]: { productImage: data.products[0].productImage },
                                    image: data.products[0].productImage
                                }} />
                            ) : (
                                <div className="text-[10px] text-gray-300">No Img</div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xl font-bold text-gray-900 truncate">{primaryName || groupingId}</h3>
                            <p className="text-sm text-gray-500 font-mono truncate max-w-md">{groupingId}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200/50 cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                            <Loader2 size={40} className="text-rose-500 animate-spin" />
                            <p className="text-gray-500 font-medium font-mono text-sm">Scanning all pincodes for products...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {data.products
                                .filter(product => !selectedPlatform || product.platform.toLowerCase() === selectedPlatform.toLowerCase())
                                .map((product, idx) => {
                                    // Map product to structure expected by ProductImage 
                                    const productForImg = {
                                        ...product,
                                        [product.platform.toLowerCase()]: { productImage: product.productImage },
                                        image: product.productImage
                                    };

                                    return (
                                        <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-white border border-gray-100 rounded flex-none p-0.5 flex items-center justify-center overflow-hidden">
                                                        <ProductImage product={productForImg} />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-neutral-900 text-white rounded">
                                                            {product.platform}
                                                        </span>
                                                        <h4 className="text-sm font-bold text-gray-800 truncate max-w-[250px] md:max-w-md">
                                                            {product.productName}
                                                        </h4>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                                                        {product.productWeight || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="p-4">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                                        <MapPin size={14} />
                                                        Availability across Pincodes
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                                        {product.pincodes.map(pc => {
                                                            const isTarget = targetPincodes.includes(pc);
                                                            const details = product.pincodeDetails[pc];
                                                            return (
                                                                <div 
                                                                    key={pc} 
                                                                    className={cn(
                                                                        "px-2 py-2 rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 text-center min-h-[85px]",
                                                                        isTarget 
                                                                            ? "bg-rose-50 border-rose-200 ring-2 ring-rose-500/20" 
                                                                            : "bg-white border-gray-100"
                                                                    )}
                                                                >
                                                                    <span className={cn(
                                                                        "text-xs font-bold font-mono tracking-tight",
                                                                        isTarget ? "text-rose-700" : "text-gray-600"
                                                                    )}>
                                                                        {pc}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-gray-900">
                                                                        ₹{details?.currentPrice?.toFixed(0) || '--'}
                                                                    </span>
                                                                    <div className="flex flex-col gap-0 mt-0.5">
                                                                        <span className="text-[8px] font-medium text-gray-400 leading-tight">
                                                                            {details?.scrapedAt ? new Date(details.scrapedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                                                                        </span>
                                                                        <span className="text-[7px] font-mono text-gray-300 leading-tight overflow-hidden text-ellipsis w-16 whitespace-nowrap" title={details?.productId}>
                                                                            {details?.productId || 'N/A'}
                                                                        </span>
                                                                    </div>
                                                                    {isTarget && (
                                                                        <span className="text-[7px] font-black uppercase text-rose-600 mt-1">CRITICAL</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {product.pincodes.length === 0 && (
                                                        <div className="py-4 text-center text-gray-400 text-xs italic">
                                                            No snapshots found for this product.
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase">Product ID</span>
                                                        <span className="text-[11px] font-mono font-medium text-gray-600 break-all">{product.productId}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => handleRemove(product)}
                                                                disabled={removingId === product.productId}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all border border-rose-100 disabled:opacity-50 cursor-pointer"
                                                            >
                                                                {removingId === product.productId ? (
                                                                    <Loader2 size={14} className="animate-spin" />
                                                                ) : (
                                                                    <Unlink size={14} />
                                                                )}
                                                                Remove
                                                            </button>
                                                        )}
                                                        {product.pincodeDetails[product.pincodes[0]]?.productUrl && (
                                                            <a 
                                                                href={product.pincodeDetails[product.pincodes[0]].productUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                                                                title="Open Link"
                                                            >
                                                                <ExternalLink size={16} />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-none px-6 py-4 border-t border-gray-200 bg-white flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-all active:scale-95 cursor-pointer"
                    >
                        Close Analysis
                    </button>
                </div>
            </div>
        </div>
    );
}
