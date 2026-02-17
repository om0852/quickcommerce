
import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import ProductTable from './ProductTable';

const BrandProductsDialog = ({
    isOpen,
    onClose,
    brandName,
    platform,
    allProducts,
    onRefresh,
    pincode,
    snapshotDate
}) => {
    if (!isOpen) return null;

    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewFirst, setShowNewFirst] = useState(false);

    // Filter products for this brand & platform
    const filteredProducts = useMemo(() => {
        let relevant = allProducts.filter(p => {
            const pBrand = p.brand && p.brand.trim() !== '' ? p.brand : 'Other';
            return pBrand === brandName;
        });

        if (platform !== 'total') {
            relevant = relevant.filter(p => p[platform]);
        }

        return relevant;
    }, [allProducts, brandName, platform]);

    const handleSort = (key, direction) => {
        setSortConfig({ key, direction });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-6xl h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">
                            {brandName === 'Other' ? 'Unbranded / Other' : brandName} {pincode && `(${pincode})`} {snapshotDate && snapshotDate}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {platform === 'total' ? 'All products' : `Products available on ${platform}`}
                            <span className="mx-2">•</span>
                            {filteredProducts.length} items
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200/50 cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Reusing ProductTable */}
                <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4">
                    <ProductTable
                        products={filteredProducts}
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        onProductClick={() => { }} // Maybe allow clicking to see details? For now empty or simple logs
                        loading={false}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        platformCounts={{}} // Not really needed for this view
                        totalPlatformCounts={{}}
                        pincode={""} // Not needed context
                        onRefresh={onRefresh}
                        showNewFirst={showNewFirst}
                        onShowNewFirstChange={setShowNewFirst}
                        isAdmin={true} // Allow edits if verified
                    />
                </div>
            </div>
        </div>
    );
};

export default BrandProductsDialog;
