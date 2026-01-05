import React from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';

function ProductDetailsDialog({
    isOpen,
    onClose,
    category,
    pincode,
    platformFilter,
    historyData,
    historyLoading,
    stockData,
    selectedProduct
}) {
    if (!isOpen || !selectedProduct) return null;

    const platforms = ['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'];
    const availablePlatforms = platforms.filter(p => selectedProduct[p]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Dialog Content */}
            <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900">{selectedProduct.name}</h2>
                        <div className="flex gap-2 text-xs text-neutral-500 mt-1">
                            <span>{category}</span>
                            <span>•</span>
                            <span>{pincode}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#fafafa]">

                    {/* Platform Details Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {availablePlatforms.map(platform => {
                            const data = selectedProduct[platform];
                            return (
                                <div key={platform} className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-bold uppercase tracking-wider text-neutral-700">{platform}</span>
                                        {data.productUrl && (
                                            <a
                                                href={data.productUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                                title="View on Platform"
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                        )}
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-neutral-500">Price:</span>
                                            <span className="font-semibold">₹{data.currentPrice}</span>
                                        </div>
                                        {data.originalPrice && data.originalPrice > data.currentPrice && (
                                            <div className="flex justify-between">
                                                <span className="text-neutral-500">Original:</span>
                                                <span className="line-through text-neutral-400">₹{data.originalPrice}</span>
                                            </div>
                                        )}
                                        {data.discountPercentage > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-neutral-500">Discount:</span>
                                                <span className="text-green-600 font-medium">{data.discountPercentage}% Off</span>
                                            </div>
                                        )}

                                        {data.officialCategory && (
                                            <div className="pt-2 border-t border-neutral-100 mt-2">
                                                <div className="text-xs text-neutral-400 mb-0.5">Category</div>
                                                <div className="font-medium truncate" title={data.officialCategory}>{data.officialCategory}</div>
                                                {data.officialSubCategory && (
                                                    <div className="text-xs text-neutral-500 truncate" title={data.officialSubCategory}>{data.officialSubCategory}</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>
        </div>
    );
}

export default ProductDetailsDialog;
