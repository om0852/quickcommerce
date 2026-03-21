'use client';

import { useState, useEffect } from 'react';
import { X, Search, Loader2, Database, MapPin, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

const PLATFORMS = ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'];
const PLATFORM_LABELS = {
    zepto: 'Zepto',
    blinkit: 'Blinkit',
    jiomart: 'JioMart',
    dmart: 'DMart',
    flipkartMinutes: 'Flipkart',
    instamart: 'Instamart',
};
const PLATFORM_COLORS = {
    zepto: 'bg-purple-100 text-purple-800 border-purple-200',
    blinkit: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    jiomart: 'bg-blue-100 text-blue-800 border-blue-200',
    dmart: 'bg-red-100 text-red-800 border-red-200',
    flipkartMinutes: 'bg-sky-100 text-sky-800 border-sky-200',
    instamart: 'bg-orange-100 text-orange-800 border-orange-200',
};

function formatDate(d) {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function PriceTag({ price, originalPrice, isOutOfStock }) {
    return (
        <div className="flex flex-col items-end gap-0.5">
            {price != null || price === 0 ? (
                <span className="font-bold text-neutral-900">₹{Number(price).toFixed(0)}</span>
            ) : (
                <span className="text-neutral-400 text-sm">—</span>
            )}
            {originalPrice && originalPrice > price && (
                <span className="text-xs text-neutral-400 line-through">₹{Number(originalPrice).toFixed(0)}</span>
            )}
            {isOutOfStock && (
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">OOS</span>
            )}
        </div>
    );
}

function GroupResult({ data }) {
    const { group, results, totalPincodes, totalSnapshots } = data;
    const pincodes = Object.keys(results).sort();
    const [expandedPin, setExpandedPin] = useState(null);

    const activePlatforms = PLATFORMS.filter(p =>
        pincodes.some(pin => results[pin]?.[p]?.length > 0)
    );

    const togglePin = (pin) => setExpandedPin(prev => prev === pin ? null : pin);

    return (
        <div className="space-y-3">
            <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100">
                    <div className="p-1.5 bg-blue-50 rounded-lg shrink-0">
                        <Database size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm font-bold text-neutral-900 truncate">{group.name || '—'}</h2>
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 font-mono hidden sm:inline">{group.groupingId}</span>
                        </div>
                        <div className="flex gap-3 mt-0.5 text-[11px] text-neutral-400 flex-wrap">
                            {group.weight && <span>{group.weight}</span>}
                            {group.brand && <span>· {group.brand}</span>}
                            {group.category && <span>· {group.category}</span>}
                        </div>
                    </div>
                    <div className="flex gap-5 text-center shrink-0 border-l border-neutral-100 pl-4 ml-2">
                        <div>
                            <div className="text-base font-bold text-neutral-900 leading-none">{totalPincodes}</div>
                            <div className="text-[10px] text-neutral-400 mt-0.5">Pincodes</div>
                        </div>
                        <div>
                            <div className="text-base font-bold text-neutral-900 leading-none">{totalSnapshots}</div>
                            <div className="text-[10px] text-neutral-400 mt-0.5">Snapshots</div>
                        </div>
                    </div>
                </div>

                {pincodes.length === 0 ? (
                    <div className="text-center py-10 text-neutral-400 text-sm">No snapshot data found for this group across any pincode</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-neutral-50 border-b border-neutral-200">
                                    <th className="text-left px-4 py-3 font-semibold text-neutral-600 whitespace-nowrap sticky left-0 bg-neutral-50 z-10 min-w-[140px]">
                                        Pincode
                                    </th>
                                    {activePlatforms.map(p => (
                                        <th key={p} className="text-center px-4 py-3 font-semibold whitespace-nowrap min-w-[160px]">
                                            <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${PLATFORM_COLORS[p]}`}>
                                                {PLATFORM_LABELS[p]}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {pincodes.map(pincode => {
                                    const isExpanded = expandedPin === pincode;
                                    const hasVariants = activePlatforms.some(p => (results[pincode]?.[p]?.length || 0) > 1);

                                    return (
                                        <>
                                            <tr
                                                key={pincode}
                                                onClick={() => togglePin(pincode)}
                                                className={`border-t border-neutral-100 transition-colors cursor-pointer select-none ${isExpanded ? 'bg-blue-50' : 'hover:bg-neutral-50'}`}
                                            >
                                                <td className={`px-4 py-3 sticky left-0 z-10 ${isExpanded ? 'bg-blue-50' : 'bg-white hover:bg-neutral-50'}`}>
                                                    <div className="flex items-center gap-1.5">
                                                        {isExpanded
                                                            ? <ChevronDown size={13} className="text-blue-500 shrink-0" />
                                                            : <ChevronRight size={13} className={`shrink-0 ${hasVariants ? 'text-neutral-400' : 'text-neutral-200'}`} />
                                                        }
                                                        <MapPin size={11} className="text-neutral-400 shrink-0" />
                                                        <span className="font-mono font-semibold text-neutral-700">{pincode}</span>
                                                    </div>
                                                </td>
                                                {activePlatforms.map(plat => {
                                                    const snaps = results[pincode]?.[plat] || [];
                                                    const snap = snaps[0];
                                                    return (
                                                        <td key={plat} className="px-4 py-3 text-center align-top">
                                                            {snap ? (
                                                                <div className="flex flex-col items-center gap-0.5">
                                                                    <PriceTag price={snap.currentPrice} originalPrice={snap.originalPrice} isOutOfStock={snap.isOutOfStock} />
                                                                    {snap.productWeight && <span className="text-[10px] text-neutral-400">{snap.productWeight}</span>}
                                                                    <span className="text-[10px] text-neutral-400 mt-0.5">{formatDate(snap.scrapedAt)}</span>
                                                                    {snaps.length > 1 && (
                                                                        <span className="text-[10px] text-blue-500 font-medium">+{snaps.length - 1} variant(s)</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-neutral-300 text-sm">—</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>

                                            {isExpanded && (
                                                <tr key={`${pincode}-expanded`} className="bg-blue-50/40">
                                                    <td colSpan={activePlatforms.length + 1} className="px-0 py-0">
                                                        <div className="mx-4 mb-4 mt-1 rounded-lg border border-blue-100 overflow-hidden shadow-inner">
                                                            <div className="px-3 py-2 bg-blue-100/60 border-b border-blue-100 text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                                                                <MapPin size={11} />
                                                                All variants for pincode {pincode}
                                                            </div>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-xs">
                                                                    <thead>
                                                                        <tr className="bg-white border-b border-blue-50">
                                                                            <th className="text-left px-3 py-2 font-semibold text-neutral-500">Platform</th>
                                                                            <th className="text-left px-3 py-2 font-semibold text-neutral-500">Product ID</th>
                                                                            <th className="text-left px-3 py-2 font-semibold text-neutral-500">Name</th>
                                                                            <th className="text-left px-3 py-2 font-semibold text-neutral-500">Weight</th>
                                                                            <th className="text-right px-3 py-2 font-semibold text-neutral-500">Price</th>
                                                                            <th className="text-right px-3 py-2 font-semibold text-neutral-500">Orig.</th>
                                                                            <th className="text-right px-3 py-2 font-semibold text-neutral-500">Rank</th>
                                                                            <th className="text-right px-3 py-2 font-semibold text-neutral-500">Stock</th>
                                                                            <th className="text-right px-3 py-2 font-semibold text-neutral-500">Scraped At</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-blue-50">
                                                                        {activePlatforms.flatMap(plat => {
                                                                            const snaps = results[pincode]?.[plat] || [];
                                                                            return snaps.map((snap, vi) => (
                                                                                <tr key={`${plat}-${vi}`} className="hover:bg-white transition-colors">
                                                                                    <td className="px-3 py-2">
                                                                                        {vi === 0 ? (
                                                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${PLATFORM_COLORS[plat] || 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>
                                                                                                {PLATFORM_LABELS[plat] || plat}
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="text-neutral-300 pl-1">↳</span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 font-mono text-neutral-600 max-w-[160px] truncate" title={snap.productId}>{snap.productId}</td>
                                                                                    <td className="px-3 py-2 text-neutral-700 max-w-[200px] truncate" title={snap.productName}>{snap.productName}</td>
                                                                                    <td className="px-3 py-2 text-neutral-500">{snap.productWeight || '—'}</td>
                                                                                    <td className="px-3 py-2 text-right font-bold text-neutral-900">
                                                                                        {snap.currentPrice != null ? `₹${Number(snap.currentPrice).toFixed(0)}` : '—'}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-right text-neutral-400 line-through">
                                                                                        {snap.originalPrice && snap.originalPrice > snap.currentPrice
                                                                                            ? `₹${Number(snap.originalPrice).toFixed(0)}`
                                                                                            : '—'}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-right text-neutral-600">{snap.ranking ?? '—'}</td>
                                                                                    <td className="px-3 py-2 text-right">
                                                                                        {snap.isOutOfStock
                                                                                            ? <span className="text-rose-500 font-semibold">OOS</span>
                                                                                            : <span className="text-emerald-600 font-semibold">In Stock</span>
                                                                                        }
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-right text-neutral-400 whitespace-nowrap">{formatDate(snap.scrapedAt)}</td>
                                                                                </tr>
                                                                            ));
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function GroupInfoDialog({ isOpen, onClose, product }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen || !product) return;
        const groupId = product.parentGroupId || product.groupingId;
        if (!groupId) return;

        setLoading(true);
        setResult(null);
        setError('');

        fetch(`/api/admin-search?q=${encodeURIComponent(groupId)}`)
            .then(res => res.json().then(data => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                if (!ok) setError(data.message || data.error || 'Not found');
                else setResult(data);
            })
            .catch(() => setError('Network error. Please try again.'))
            .finally(() => setLoading(false));
    }, [isOpen, product]);

    useEffect(() => {
        const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const groupId = product?.parentGroupId || product?.groupingId;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-7xl max-h-[90vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-white shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-blue-50 rounded-lg">
                            <Database size={16} className="text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-neutral-900">{product?.name || 'Group Details'}</h3>
                            {groupId && (
                                <span className="text-[10px] font-mono text-neutral-400">{groupId}</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 size={32} className="animate-spin text-blue-500" />
                            <p className="text-sm text-neutral-500">Fetching group data…</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                            <AlertTriangle size={14} />
                            {error}
                        </div>
                    )}

                    {result?.type === 'group' && <GroupResult data={result} />}

                    {!loading && !error && !result && (
                        <div className="text-center py-20 text-neutral-400">
                            <Search size={28} className="mx-auto mb-2 opacity-25" />
                            <p className="text-xs">No data available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
