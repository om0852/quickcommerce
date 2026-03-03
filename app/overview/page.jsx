"use client"
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Package, RefreshCw } from 'lucide-react';

import CustomDropdown from '@/components/CustomDropdown';
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
    { id: 'zepto', label: 'Zepto' },
    { id: 'blinkit', label: 'Blinkit' },
    { id: 'instamart', label: 'Swiggy Instamart' },
    { id: 'jiomart', label: 'JioMart' },
    { id: 'dmart', label: 'DMart' },
    { id: 'flipkartMinutes', label: 'Flipkart Minutes' },
];

function OverviewContent() {
    const searchParams = useSearchParams();

    const CATEGORY_OPTIONS = useMemo(() => {
        const allItems = Object.values(categoriesData).flat();
        const uniqueCategories = [...new Set(allItems.map(item => item.masterCategory).filter(Boolean))].sort();

        const prioritized = 'Fruits & Vegetables';
        if (uniqueCategories.includes(prioritized)) {
            const index = uniqueCategories.indexOf(prioritized);
            uniqueCategories.splice(index, 1);
            uniqueCategories.unshift(prioritized);
        }

        return uniqueCategories.map(cat => ({
            label: cat,
            value: cat
        }));
    }, []);

    const [category, setCategory] = useState(searchParams.get('category') || CATEGORY_OPTIONS[0]?.value || 'Fruits & Vegetables');
    const [snapshotDate, setSnapshotDate] = useState('');
    const [snapshotTime, setSnapshotTime] = useState('');
    const [availableSnapshots, setAvailableSnapshots] = useState([]);
    const [isLiveMode, setIsLiveMode] = useState(true);

    const [matrixData, setMatrixData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 1. Fetch Available Dates for Category
    useEffect(() => {
        const fetchDates = async () => {
            try {
                const response = await fetch(`/api/available-snapshots?category=${encodeURIComponent(category)}`);
                const data = await response.json();
                if (data.success && data.snapshots) {
                    setAvailableSnapshots(data.snapshots);
                }
            } catch (err) {
                console.error("Failed to fetch snapshot dates:", err);
            }
        };
        fetchDates();
    }, [category]);

    const uniqueDates = useMemo(() => {
        const dates = availableSnapshots.map(ts => {
            const d = new Date(ts);
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        });
        return [...new Set(dates)];
    }, [availableSnapshots]);

    // 2. Fetch Matrix Data
    const fetchOverviewData = async () => {
        setLoading(true);
        setError(null);
        try {
            let url = `/api/overview?category=${encodeURIComponent(category)}`;
            if (snapshotTime && !isLiveMode) {
                url += `&timestamp=${encodeURIComponent(snapshotTime)}`;
            }

            const res = await fetch(url);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to fetch matrix data');

            setMatrixData(data.data || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverviewData();
    }, [category, snapshotTime, isLiveMode]);

    // Format Matrix for UI rendering
    // matrixData looks like [{ pincode: '201303', platform: 'zepto', count: 154 }, ...]
    const getCellData = (pin, plat) => {
        // Compare case insensitive just in case
        const found = matrixData.find(d =>
            d.pincode === pin &&
            d.platform?.toLowerCase() === plat.toLowerCase()
        );
        return found ? found.count : 0;
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-neutral-900">
            {/* Header */}
            <div className="flex-none bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold tracking-tight text-neutral-900">System Overview</h1>
                    <div className="flex items-center gap-2 text-sm bg-gray-100 rounded-lg px-2 py-1">
                        <span className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-neutral-900 animate-pulse' : 'bg-neutral-400'} `}></span>
                        <span className="font-medium text-neutral-600">
                            {isLiveMode ? 'Live Mode' : 'Historical Snapshot'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col w-full max-w-[1920px] mx-auto p-6 gap-6">

                {/* Controls */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-64 relative z-[100]">
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
                            <CustomDropdown
                                value={category}
                                onChange={(val) => {
                                    setCategory(val);
                                    setSnapshotTime('');
                                    setSnapshotDate('');
                                    setIsLiveMode(true);
                                }}
                                options={CATEGORY_OPTIONS}
                            />
                        </div>

                        <div className="w-40 relative z-[90]">
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
                            <CustomDropdown
                                value={snapshotDate}
                                onChange={(newDate) => {
                                    setSnapshotDate(newDate);
                                    setIsLiveMode(false);

                                    const timesForDate = availableSnapshots.filter(ts => {
                                        const d = new Date(ts);
                                        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) === newDate;
                                    });

                                    if (timesForDate.length > 0) {
                                        timesForDate.sort((a, b) => new Date(b) - new Date(a));
                                        setSnapshotTime(timesForDate[0]);
                                    }
                                }}
                                options={uniqueDates.map(d => ({ value: d, label: d }))}
                                placeholder="Latest Active"
                                minimal
                            />
                        </div>
                    </div>

                    <button
                        onClick={fetchOverviewData}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all cursor-pointer bg-white border border-gray-200"
                        title="Refresh Data"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>

                {/* Matrix Table */}
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
                                    <th className="sticky top-0 left-0 z-20 bg-neutral-100 border-b border-r border-gray-200 px-6 py-4 font-bold text-neutral-800 tracking-wider text-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[200px]">
                                        Pincode / Region
                                    </th>
                                    {PLATFORMS.map(p => (
                                        <th key={p.id} className="sticky top-0 z-10 bg-neutral-50 border-b border-gray-200 px-6 py-4 font-bold text-neutral-600 tracking-wider text-sm text-center min-w-[140px]">
                                            {p.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading && matrixData.length === 0 ? (
                                    <tr>
                                        <td colSpan={PLATFORMS.length + 1} className="px-6 py-12 text-center text-neutral-400">
                                            <Loader2 size={32} className="animate-spin mx-auto mb-4 opacity-50" />
                                            <p>Analyzing cross-platform availability...</p>
                                        </td>
                                    </tr>
                                ) : (
                                    PINCODE_OPTIONS.map((pinOption, idx) => (
                                        <tr key={pinOption.value} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-50'}>
                                            <td className="sticky left-0 z-10 border-r border-gray-200 px-6 py-4 font-semibold text-neutral-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] bg-inherit">
                                                {pinOption.label}
                                                <div className="text-xs text-neutral-400 font-mono mt-0.5">{pinOption.value}</div>
                                            </td>

                                            {PLATFORMS.map(plat => {
                                                const count = getCellData(pinOption.value, plat.id);
                                                const hasData = count > 0;

                                                return (
                                                    <td key={plat.id} className="border-b border-gray-100 px-6 py-4 text-center">
                                                        {loading ? (
                                                            <div className="h-6 bg-gray-200 animate-pulse rounded w-16 mx-auto"></div>
                                                        ) : hasData ? (
                                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 font-bold rounded-full text-sm border border-green-200">
                                                                <span>Yes</span>
                                                                <span className="opacity-70 text-xs font-semibold">({count})</span>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center px-3 py-1 bg-red-50 text-red-600 font-bold rounded-full text-sm border border-red-200 shadow-sm">
                                                                U/S
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
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
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-8"><Loader2 className="animate-spin text-neutral-400" size={32} /></div>}>
            <OverviewContent />
        </Suspense>
    );
}
