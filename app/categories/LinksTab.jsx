import React, { useState, useMemo } from 'react';
import { Search, ExternalLink, Link as LinkIcon, X } from 'lucide-react';


const LinksTab = ({ data, selectedCategory, platformFilter }) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Flatten data
    const flatData = useMemo(() => {
        if (!data) return [];

        const flattened = [];
        Object.entries(data).forEach(([platform, items]) => {
            items.forEach(item => {
                flattened.push({
                    platform,
                    ...item
                });
            });
        });
        return flattened;
    }, [data]);

    // Filter data
    const filteredData = useMemo(() => {
        return flatData.filter(item => {
            // Category filter
            if (selectedCategory && item.masterCategory !== selectedCategory) {
                return false;
            }

            // Platform filter
            if (platformFilter !== 'all' && item.platform.toLowerCase() !== platformFilter.toLowerCase()) {
                return false;
            }

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    item.masterCategory?.toLowerCase().includes(query) ||
                    item.officialCategory?.toLowerCase().includes(query) ||
                    item.officialCategory?.toLowerCase().includes(query) || // Handle typo in JSON if exists
                    item.officialSubCategory?.toLowerCase().includes(query) ||
                    item.officialSubCategory?.toLowerCase().includes(query) ||
                    item.platform.toLowerCase().includes(query)
                );
            }

            return true;
        });
    }, [flatData, searchQuery, platformFilter, selectedCategory]);



    return (
        <div className="flex flex-col gap-4 h-full">


            {/* Table */}
            <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 font-medium border-b border-gray-200" style={{ minWidth: '250px' }}>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 shadow-sm"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-3 font-medium border-b border-gray-200">Admin Category</th>
                                <th className="px-6 py-3 font-medium border-b border-gray-200">Official Category</th>
                                <th className="px-6 py-3 font-medium border-b border-gray-200">Official SubCategory</th>
                                <th className="px-6 py-3 font-medium border-b border-gray-200 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredData.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-neutral-900 capitalize">
                                        {item.platform}
                                    </td>
                                    <td className="px-6 py-3 text-gray-600">
                                        {item.masterCategory}
                                    </td>
                                    <td className="px-6 py-3 text-gray-600">
                                        {item.officialCategory || item.officialCategory || '-'}
                                    </td>
                                    <td className="px-6 py-3 text-gray-600">
                                        {item.officialSubCategory || item.officialSubCategory || '-'}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                        >
                                            Visit <ExternalLink size={14} />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <LinkIcon size={32} className="text-gray-300" />
                                            <p>No links found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LinksTab;
