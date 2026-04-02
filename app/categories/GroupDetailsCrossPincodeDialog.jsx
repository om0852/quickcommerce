import React, { useState, useEffect } from 'react';
import { X, Loader2, MapPin, Package, ExternalLink, Unlink, ChevronDown, ChevronRight } from 'lucide-react';
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
    const [summaryOpen, setSummaryOpen] = useState(true);

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
                    platform: product.platform,
                    exactOnly: true  // cross-pincode: remove only this exact productId, not all variants
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
                            {data?.createdAt && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Created: {new Date(data.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            )}
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
                            {(() => {
                                const filteredProducts = data.products.filter(product => !selectedPlatform || product.platform.toLowerCase() === selectedPlatform.toLowerCase());

                                // Determine unique baseIds across all filtered products to assign colors globally within this dialog
                                const globalUniqueBaseIds = new Set();
                                filteredProducts.forEach(product => {
                                    if (product.productId) {
                                        const baseId = product.productId.includes('__') ? product.productId.split('__')[0] : product.productId;
                                        globalUniqueBaseIds.add(baseId);
                                    }
                                });

                                // Provide a wide palette of badge colors for distinguishing many items
                                const colorPalette = [
                                    'text-blue-700 bg-blue-100 border border-blue-200',
                                    'text-emerald-700 bg-emerald-100 border border-emerald-200',
                                    'text-amber-700 bg-amber-100 border border-amber-200',
                                    'text-purple-700 bg-purple-100 border border-purple-200',
                                    'text-rose-700 bg-rose-100 border border-rose-200',
                                    'text-cyan-700 bg-cyan-100 border border-cyan-200',
                                    'text-indigo-700 bg-indigo-100 border border-indigo-200',
                                    'text-pink-700 bg-pink-100 border border-pink-200',
                                    'text-orange-700 bg-orange-100 border border-orange-200',
                                    'text-teal-700 bg-teal-100 border border-teal-200',
                                    'text-fuchsia-700 bg-fuchsia-100 border border-fuchsia-200',
                                    'text-lime-700 bg-lime-100 border border-lime-200'
                                ];

                                const dotColors = [
                                    'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500',
                                    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
                                    'bg-orange-500', 'bg-teal-500', 'bg-fuchsia-500', 'bg-lime-500'
                                ];

                                const globalBaseIdColorMap = {};
                                const globalBaseIdDotMap = {};
                                let colorIdx = 0;
                                Array.from(globalUniqueBaseIds).forEach(baseId => {
                                    globalBaseIdColorMap[baseId] = colorPalette[colorIdx % colorPalette.length];
                                    globalBaseIdDotMap[baseId] = dotColors[colorIdx % dotColors.length];
                                    colorIdx++;
                                });

                                return (
                                    <>
                                        {/* ─── Summary Card */}
                                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                            <button
                                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors select-none"
                                                onClick={() => setSummaryOpen(prev => !prev)}
                                            >
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Summary</span>
                                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
                                                        {globalUniqueBaseIds.size} base ID{globalUniqueBaseIds.size !== 1 ? 's' : ''}
                                                    </span>
                                                    {/* Mini dot preview when collapsed */}
                                                    {!summaryOpen && (
                                                        <div className="flex items-center gap-1 ml-1">
                                                            {Array.from(globalUniqueBaseIds).map(baseId => (
                                                                <span
                                                                    key={baseId}
                                                                    className={`w-3 h-3 rounded-full inline-block ${globalBaseIdDotMap[baseId]}`}
                                                                    title={baseId}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {summaryOpen
                                                    ? <ChevronDown size={14} className="text-gray-400 shrink-0" />
                                                    : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
                                            </button>
                                            {summaryOpen && (
                                                <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-3 mb-2">Base IDs</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {Array.from(globalUniqueBaseIds).map(baseId => (
                                                            <span
                                                                key={baseId}
                                                                className={cn(
                                                                    'flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-mono font-semibold',
                                                                    globalBaseIdColorMap[baseId]
                                                                )}
                                                            >
                                                                <span className={`w-2 h-2 rounded-full shrink-0 ${globalBaseIdDotMap[baseId]}`} />
                                                                {baseId}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* ─── Product Cards */}
                                        {filteredProducts.map((product, idx) => {
                                            // Map product to structure expected by ProductImage 
                                            const productForImg = {
                                                ...product,
                                                [product.platform.toLowerCase()]: { productImage: product.productImage },
                                                image: product.productImage
                                            };

                                            const productBaseId = product.productId?.includes('__') ? product.productId.split('__')[0] : product.productId;
                                            const productBaseIdClass = globalBaseIdColorMap[productBaseId] || 'text-gray-600 bg-gray-50 border-gray-200';

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
                                                            {/* Dot indicator matching base ID color */}
                                                            <span
                                                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${globalBaseIdDotMap[productBaseId] || 'bg-gray-300'}`}
                                                                title={`Base ID: ${productBaseId}`}
                                                            />
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
                                                                    const details = product.pincodeDetails[pc];

                                                                    return (
                                                                        <div
                                                                            key={pc}
                                                                            className="px-2 py-2 rounded-lg border border-gray-100 bg-white transition-all flex flex-col items-center justify-center gap-0.5 text-center min-h-[85px]"
                                                                        >
                                                                            <span className="text-xs font-bold font-mono tracking-tight text-gray-700">
                                                                                {pc}
                                                                            </span>
                                                                            <span className="text-[10px] font-bold text-gray-900">
                                                                                ₹{details?.currentPrice?.toFixed(0) || '--'}
                                                                            </span>
                                                                            <div className="flex flex-col gap-0 mt-0.5 w-full items-center">
                                                                                {details?.scrapedAt ? (
                                                                                    <>
                                                                                        <span className="text-[8px] font-medium text-gray-400 leading-tight">
                                                                                            {new Date(details.scrapedAt).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                                                                                        </span>
                                                                                        <span className="text-[8px] font-medium text-gray-400 leading-tight">
                                                                                            {new Date(details.scrapedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                        </span>
                                                                                    </>
                                                                                ) : (
                                                                                    <span className="text-[8px] font-medium text-gray-400 leading-tight">--</span>
                                                                                )}
                                                                                <span className="mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold font-mono leading-tight overflow-hidden text-ellipsis w-[4.5rem] whitespace-nowrap inline-block text-gray-500 bg-gray-50 border border-gray-100" title={details?.productId}>
                                                                                    {details?.productId || 'N/A'}
                                                                                </span>
                                                                            </div>
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
                                                            <div className="flex flex-col items-start gap-1">
                                                                <span className="text-[10px] text-gray-400 font-bold uppercase">Product ID</span>
                                                                <span className={cn(
                                                                    'px-2 py-1 text-[11px] font-mono font-bold break-all rounded-md border',
                                                                    productBaseIdClass
                                                                )}>
                                                                    {product.productId}
                                                                </span>
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
                                    </>
                                );
                            })()}
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
