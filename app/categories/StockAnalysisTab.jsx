import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

function StockAnalysisTab({ category, pincode, platform }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Custom tooltip component
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-neutral-800 text-white p-3 rounded-lg shadow-xl border border-neutral-700">
                    <p className="font-semibold mb-2 text-sm">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }} className="text-xs mt-1">
                            {entry.name}: <span className="font-bold">{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    useEffect(() => {
        setLoading(true);
        const platformParam = platform && platform !== 'all' ? `&platform=${encodeURIComponent(platform)}` : '';
        fetch(`/api/analytics?category=${encodeURIComponent(category)}&pincode=${encodeURIComponent(pincode)}${platformParam}`)
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch analytics:', err);
                setLoading(false);
            });
    }, [category, pincode, platform]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Ranking Improvements Chart */}
                <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-neutral-900 mb-1">Ranking Improvements</h2>
                        <p className="text-xs text-neutral-500">Products with improved rankings by price range</p>
                    </div>
                    <div className="h-64 bg-white rounded-lg p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data.rankingData}
                                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="name"
                                    tickFormatter={(value) => value.split(' ')[0]}
                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                    axisLine={{ stroke: '#e5e7eb' }}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                    axisLine={{ stroke: '#e5e7eb' }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    wrapperStyle={{ fontSize: '0.8125rem', paddingTop: '1rem' }}
                                    iconType="circle"
                                />
                                <Bar
                                    dataKey="rankImproved"
                                    name="Rank Improved"
                                    fill="#10b981"
                                    radius={[6, 6, 0, 0]}
                                    maxBarSize={40}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Price Point Analysis Chart */}
                <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-neutral-900 mb-1">Price Point Analysis</h2>
                        <p className="text-xs text-neutral-500">Volume distribution by price range</p>
                    </div>

                    <div className="h-64 bg-white rounded-lg p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={data.priceDistribution}
                                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                    axisLine={{ stroke: '#e5e7eb' }}
                                />
                                <YAxis
                                    dataKey="range"
                                    type="category"
                                    width={70}
                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                    axisLine={{ stroke: '#e5e7eb' }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="count"
                                    name="SKUs"
                                    fill="#6366f1"
                                    radius={[0, 6, 6, 0]}
                                    maxBarSize={24}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Stock Availability by Platform */}
                <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200 lg:col-span-2">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-neutral-900 mb-1">Platform Stock Availability</h2>
                        <p className="text-xs text-neutral-500">In-stock vs Out-of-stock items by platform</p>
                    </div>
                    <div className="h-64 bg-white rounded-lg p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data.stockAvailability}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '0.8125rem', paddingTop: '1rem' }} />
                                <Bar dataKey="inStock" name="In Stock" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} maxBarSize={40} />
                                <Bar dataKey="outOfStock" name="Out of Stock" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Stock Overview Table */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                    <div className="p-6 bg-gradient-to-br from-neutral-50 to-neutral-100 border-b border-neutral-200 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900 mb-1">Stock Overview</h2>
                            <p className="text-sm text-neutral-500">Recent stock changes and activity</p>
                        </div>
                        <span className="text-xs font-semibold px-4 py-2 bg-white text-neutral-700 rounded-full border border-neutral-200 shadow-sm">
                            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                    </div>

                    <div className="overflow-hidden border border-neutral-200 rounded-lg">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-900 text-white">
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Product Name</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Platform</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right">Price</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-center">Change</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-neutral-200">
                                {data.stockOverview.length > 0 ? (
                                    data.stockOverview.map((item, index) => {
                                        return (
                                            <tr
                                                key={index}
                                                className="hover:bg-neutral-50 transition-colors duration-150"
                                            >
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-medium text-neutral-900">
                                                        {item.name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "text-xs font-bold uppercase tracking-wide",
                                                        item.category?.toLowerCase() === 'zepto' ? 'text-purple-700' :
                                                            item.category?.toLowerCase() === 'blinkit' ? 'text-yellow-700' :
                                                                item.category?.toLowerCase() === 'jiomart' ? 'text-blue-700' :
                                                                    item.category?.toLowerCase() === 'flipkart minutes' ? 'text-blue-600' : 'text-neutral-600'
                                                    )}>
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-bold text-neutral-900">
                                                        ₹{item.price}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className={cn(
                                                        "inline-flex items-center gap-1 text-sm font-semibold",
                                                        item.stockStatus === 'positive' ? 'text-emerald-600' : 'text-rose-600'
                                                    )}>
                                                        <span>{item.stockStatus === 'positive' ? '↑' : '↓'}</span>
                                                        <span>{item.stockChange}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border",
                                                        item.stockStatus === 'positive'
                                                            ? 'bg-white border-emerald-200 text-emerald-700'
                                                            : 'bg-white border-rose-200 text-rose-700'
                                                    )}>
                                                        <span className={cn(
                                                            "w-1.5 h-1.5 rounded-full",
                                                            item.stockStatus === 'positive' ? 'bg-emerald-500' : 'bg-rose-500'
                                                        )}></span>
                                                        {item.stockStatus === 'positive' ? 'Improved' : 'Declined'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-neutral-400">
                                            <p className="text-sm">No recent activity found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default StockAnalysisTab;
