"use client"
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

import categoriesData from '../utils/categories_with_urls.json';

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
];

const PLATFORMS = [
    { id: 'jiomart', label: 'JioMart' },
    { id: 'zepto', label: 'Zepto' },
    { id: 'blinkit', label: 'Blinkit' },
    { id: 'dmart', label: 'DMart' },
    { id: 'flipkartMinutes', label: 'Flipkart Minutes' },
    { id: 'instamart', label: 'Swiggy Instamart' },
];

// Based on user provided data:
const PINCODE_AVAILABILITY = {
    zepto: PINCODE_OPTIONS.map(p => p.value).filter(val => !['401101', '401202'].includes(val)),
    jiomart: PINCODE_OPTIONS.map(p => p.value), // ALL
    blinkit: PINCODE_OPTIONS.map(p => p.value), // ALL
    dmart: PINCODE_OPTIONS.map(p => p.value).filter(val => !['122008', '122016', '122010', '201303', '201014'].includes(val)), // Excluded as requested
    instamart: PINCODE_OPTIONS.map(p => p.value), // ALL
    flipkartMinutes: PINCODE_OPTIONS.map(p => p.value).filter(val => !['400070', '401101'].includes(val)), // Not available in 400070, 401101
};

const isPincodeAvailableForPlatform = (pincode, platformId) => {
    return PINCODE_AVAILABILITY[platformId]?.includes(pincode) || false;
};

// --- Skeleton Components ---
function SkeletonRow({ index }) {
    return (
        <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            <td className="sticky left-0 z-10 border-b border-gray-200 px-6 py-4 bg-inherit shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between w-full">
                    <div>
                        <div className="h-4 bg-gray-200 animate-pulse rounded w-32 mb-1.5" />
                        <div className="h-3 bg-gray-100 animate-pulse rounded w-16" />
                    </div>
                    <div className="h-5 w-5 bg-gray-200 animate-pulse rounded" />
                </div>
            </td>
        </tr>
    );
}

function SkeletonTable() {
    return (
        <table className="w-full text-left border-collapse">
            <thead>
                <tr>
                    <th className="sticky top-0 left-0 z-20 bg-neutral-100 border-b border-r border-gray-200 px-6 py-4 font-bold text-neutral-800 tracking-wider text-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-full">
                        Pincodes / Regions
                    </th>
                </tr>
            </thead>
            <tbody>
                {PINCODE_OPTIONS.map((_, idx) => (
                    <SkeletonRow key={idx} index={idx} />
                ))}
            </tbody>
        </table>
    );
}

// --- Main Content ---
function OverviewContent() {
    const CATEGORY_OPTIONS = useMemo(() => {
        const allItems = Object.values(categoriesData).flat();
        const uniqueCategories = [...new Set(allItems.map(item => item.masterCategory).filter(Boolean))].sort();

        const prioritized = 'Fruits & Vegetables';
        if (uniqueCategories.includes(prioritized)) {
            const index = uniqueCategories.indexOf(prioritized);
            uniqueCategories.splice(index, 1);
            uniqueCategories.unshift(prioritized);
        }

        return uniqueCategories;
    }, []);

    const [expandedPincode, setExpandedPincode] = useState(null);
    const [matrixDataByPincode, setMatrixDataByPincode] = useState({});
    const [loadingPincode, setLoadingPincode] = useState({});
    const [error, setError] = useState(null);

    const fetchOverviewDataForPincode = async (pincodeStr) => {
        if (!pincodeStr) return;

        setLoadingPincode(prev => ({ ...prev, [pincodeStr]: true }));
        setError(null);
        try {
            const url = `/api/overview?pincode=${encodeURIComponent(pincodeStr)}`;
            const res = await fetch(url);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to fetch matrix data');

            setMatrixDataByPincode(prev => ({
                ...prev,
                [pincodeStr]: data.data || []
            }));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingPincode(prev => ({ ...prev, [pincodeStr]: false }));
        }
    };

    const handleToggleExpand = (pincodeStr) => {
        if (expandedPincode === pincodeStr) {
            setExpandedPincode(null);
        } else {
            setExpandedPincode(pincodeStr);
            if (!matrixDataByPincode[pincodeStr]) {
                fetchOverviewDataForPincode(pincodeStr);
            }
        }
    };

    const getCellData = (pincodeStr, cat, plat) => {
        const dataForPin = matrixDataByPincode[pincodeStr] || [];
        const found = dataForPin.find(d =>
            d.category === cat &&
            d.platform?.toLowerCase() === plat.toLowerCase()
        );
        return found || null;
    };

    const handleGlobalRefresh = () => {
        if (expandedPincode) {
            fetchOverviewDataForPincode(expandedPincode);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-neutral-900">
            {/* Header */}
            <div className="flex-none bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold tracking-tight text-neutral-900">System Overview</h1>
                    <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 rounded-lg px-2 py-1 border border-blue-200">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="font-medium">Latest Scrape Data</span>
                    </div>
                </div>
                <button
                    onClick={handleGlobalRefresh}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all cursor-pointer border border-gray-200 bg-white shadow-sm"
                    title="Refresh Data"
                >
                    <RefreshCw size={16} className={(expandedPincode && loadingPincode[expandedPincode]) ? "animate-spin text-blue-600" : ""} />
                    Refresh
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col w-full max-w-[1920px] mx-auto p-6 gap-6">

                {/* Main List */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 border-b border-red-100 flex items-center gap-3">
                            <span className="font-bold">Error:</span> {error}
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="sticky top-0 left-0 z-20 bg-neutral-100 border-b border-r border-gray-200 px-6 py-4 font-bold text-neutral-800 tracking-wider text-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-full">
                                        Pincodes / Regions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {PINCODE_OPTIONS.map((pinOption, idx) => {
                                    const isExpanded = expandedPincode === pinOption.value;
                                    const isLoadingThisPincode = loadingPincode[pinOption.value];

                                    return (
                                        <React.Fragment key={pinOption.value}>
                                            {/* Pincode Row Header */}
                                            <tr
                                                className={`cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/50' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100')}`}
                                                onClick={() => handleToggleExpand(pinOption.value)}
                                            >
                                                <td className="sticky left-0 z-10 border-b border-gray-200 px-6 py-4 font-semibold text-neutral-800 bg-inherit flex items-center justify-between">
                                                    <div>
                                                        <div className="text-base">{pinOption.label}</div>
                                                        <div className="text-xs text-neutral-400 font-mono mt-0.5">{pinOption.value}</div>
                                                    </div>
                                                    <div className="text-gray-400">
                                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded Content: Category x Platform Matrix */}
                                            {isExpanded && (
                                                <tr>
                                                    <td className="p-0 border-b border-gray-200 bg-gray-50">
                                                        {isLoadingThisPincode ? (
                                                            <div className="p-8 flex justify-center items-center">
                                                                <Loader2 className="animate-spin text-gray-400" size={32} />
                                                            </div>
                                                        ) : (
                                                            <div className="overflow-x-auto border-l-4 border-blue-400">
                                                                <table className="w-full text-left border-collapse">
                                                                    <thead>
                                                                        <tr>
                                                                            <th className="sticky top-0 left-0 z-20 bg-neutral-100 border-b border-r border-gray-200 px-6 py-3 font-bold text-neutral-700 tracking-wider text-xs shadow-[1px_0_3px_-1px_rgba(0,0,0,0.1)] min-w-[200px]">
                                                                                Category
                                                                            </th>
                                                                            {PLATFORMS.map(p => (
                                                                                <th key={p.id} className="sticky top-0 z-10 bg-neutral-50 border-b border-gray-200 px-6 py-3 font-bold text-neutral-500 tracking-wider text-xs text-center min-w-[140px]">
                                                                                    {p.label}
                                                                                </th>
                                                                            ))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {CATEGORY_OPTIONS.map((cat, catIdx) => (
                                                                            <tr key={cat} className={catIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50 whitespace-nowrap'}>
                                                                                <td className="sticky left-0 z-10 border-r border-gray-200 px-6 py-3 font-medium text-neutral-700 shadow-[1px_0_3px_-1px_rgba(0,0,0,0.05)] bg-inherit">
                                                                                    {cat}
                                                                                </td>

                                                                                {PLATFORMS.map(plat => {
                                                                                    const isAvailable = isPincodeAvailableForPlatform(pinOption.value, plat.id);
                                                                                    const cellData = getCellData(pinOption.value, cat, plat.id);
                                                                                    const count = cellData ? cellData.count : 0;
                                                                                    const hasData = count > 0;

                                                                                    let dateStr = '';
                                                                                    if (hasData && cellData?.latestScrapedAt) {
                                                                                        const d = new Date(cellData.latestScrapedAt);
                                                                                        dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                                                                                    }

                                                                                    return (
                                                                                        <td key={plat.id} className="border-b border-gray-100 px-6 py-3 text-center align-top">
                                                                                            <div className="flex flex-col items-center justify-center min-h-[48px]">
                                                                                                {hasData ? (
                                                                                                    <>
                                                                                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-green-50 text-green-700 font-bold rounded-full text-xs border border-green-200 mb-1.5">
                                                                                                            <span>Yes</span>
                                                                                                            <span className="opacity-70 text-[10px] font-semibold">({count})</span>
                                                                                                        </div>
                                                                                                        <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{dateStr}</span>
                                                                                                    </>
                                                                                                ) : isAvailable ? (
                                                                                                    <div className="inline-flex items-center px-2.5 py-0.5 bg-yellow-50 text-yellow-700 font-bold rounded-full text-xs border border-yellow-200 shadow-sm">
                                                                                                        Not Scraped
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div className="inline-flex items-center px-2.5 py-0.5 bg-red-50 text-red-600 font-bold rounded-full text-xs border border-red-200 shadow-sm">
                                                                                                        U/S
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </td>
                                                                                    );
                                                                                })}
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default function OverviewPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
                <div className="flex-none bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                    <div className="h-6 bg-gray-200 animate-pulse rounded w-40" />
                </div>
                <div className="flex-1 flex flex-col w-full max-w-[1920px] mx-auto p-6 gap-6">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <SkeletonTable />
                        </div>
                    </div>
                </div>
            </div>
        }>
            <OverviewContent />
        </Suspense>
    );
}
