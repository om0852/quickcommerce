import React, { useEffect } from 'react';
import { X, ExternalLink, Loader2, Copy, Check, Pencil } from 'lucide-react';
import ProductEditDialog from './ProductEditDialog';
import ProductImage from './ProductImage';
import { useSidebar } from '@/components/SidebarContext';
import { cn } from '@/lib/utils';

const JIO_ARTICLE_CATEGORIES = [
  "APPLE FUJI", "APPLE RED DELICIOUS", "APPLE GRANNY SMITH", "APPLE GOLDEN IMPORTE", 
  "APPLE ROYAL GALA", "APPLE INORED EPLI", "APPLE QUEEN", "APPLE KINNAUR", "APPLE SHIMLA", 
  "MOSAMBI", "ORANGE INDIAN", "KINNOW", "CITRUS OTHERS", "IMPORTED OTHERS", "STRAWBERRY", 
  "AVOCADO INDIAN", "LITCHI", "PLUM INDIAN", "MINOR FRUIT OTHERS", "EXOTIC FRUITS INDIAN", 
  "CITRUS ORANGE IMPORT", "KIWI IMPORTED OTHERS", "PEARS IMPORTED", "PLUM IMPORTED", 
  "GRAPES IMPORTED", "GRAPES INDIAN OTHERS", "GRAPES BLACK", "GRAPES SONAKA SEEDLE", 
  "GRAPES THOMPSON SEED", "MANGO ALPHONSO", "MANGO TOTAPURI", "MANGO NEELAM", "MANGO CHAUSA", 
  "MANGO BANGANAPALLI", "MUSKMELON", "WATERMELON", "MELON OTHERS", "BANANA NENDRAN", 
  "BANANA OTHERS", "BANANA ROBUSTA", "BANANA YELLAKI", "PEARS INDIAN", "GUAVA", "PAPAYA", 
  "PINEAPPLE", "CUSTARD APPLE", "POMEGRANATE", "SAPOTA", "TENDER COCONUT GREEN", "CUT FRUITS", 
  "SWEET TAMARIND IMPOR", "APPLE IMPORTED INDIA", "APPLE KASHMIR", "APPLE INDIAN OTHERS", 
  "MANGO SINDHURA", "CHERRY RED INDIAN", "BERRY INDIAN", "MANGO OTHERS", "MANGO LANGDA", 
  "MANGO DASHERI", "MANGO KESAR", "PEACH INDIAN", "APPLE PINK LADY", "APPLE IMPORTED OTHER", 
  "BERRIES IMPORTED", "DRAGON FRUIT INDIAN", "KIWI IMPORTED ZESPRI", "DATES IMPORTED FRESH", 
  "CITRUS MANDARIN IMPO", "TENDER COCONUT GOLDE", "JUMBO GUAVA INDIAN", "AVOCADO IMPORTED", 
  "DRAGON FRUIT IMPORTE", "CITRUS IMPORTED OTHE", "DATES IMPORTED", "GRAPES", "MANGO", 
  "SEASONAL MINOR", "MELONS", "SEASONAL MAJOR", "APPLE", "PERENNIALS", "STONE FRUITS", 
  "CHERRIES & BERRIES", "PEAR", "EXOTIC FRUITS", "CITRUS", "BANANA", "WET DATES", 
  "VALUE ADDED", "GIFT PACKS", "DRIED DATES", "ONION RED", "GARLIC", "MUSHROOM", "COCONUT", 
  "POTATO OTHERS", "POTATO REGULAR", "TOMATO COUNTRY", "TOMATO HYBRID", "TOMATO OTHERS", 
  "POTATO BABY", "ONION SAMBAR", "ONION WHITE", "EXOTIC VEGETABLE OTH", "BABY CORN", "BROCCOLI", 
  "SPROUTS", "TOMATO CHERRY", "CABBAGE CHINESE", "LETTUCE ICEBERG", "AMARANTHUS", "CORIANDER", 
  "LEAFY OTHERS", "CURRY LEAVES", "METHI", "MINT LEAVES", "Spinach", "SPRING ONION", 
  "VEG OTHERS", "DRUMSTICK", "BEET ROOT", "GINGER", "RADISH WHITE", "ROOTY OTHERS", 
  "SWEET POTATO", "CABBAGE", "CAPSICUM GREEN", "CAPSICUM COLOURED", "CAULIFLOWER", 
  "GREEN PEAS", "TEMPERATE VEG OTHERS", "BEANS OTHERS", "BEANS CLUSTER", "BEANS COWPEA", 
  "BEANS FRENCH", "BRINJAL BLACK BIG", "BRINJAL OTHERS", "BRINJAL NAGPUR", "CUCUMBER WHITE", 
  "CUCUMBER MADRAS", "GOURD OTHERS", "BITTER GOURD", "BOTTLE GOURD", "COCCINIA", 
  "RIDGE GOURD", "TROPICAL VEG OTHERS", "BANANA RAW", "CARROT ORANGE", "CHILLI GREEN", 
  "LEMON", "Okra", "Pumpkin", "SUGARCANE", "GROUNDNUT", "SWEET CORN", "CUCUMBER GREEN", 
  "CUCUMBER FRENCH", "CARROT RED", "FLOWERS", "PAPAYA RAW", "SPONGE GOURD", "ONION OTHERS", 
  "POTTED HERBS", "MICROGREENS", "POTATO LOW SUGAR"
];

function extractArticleCategory(productName) {
    if (!productName) return '-';
    const normalizedName = productName.toUpperCase();
    const sortedCategories = [...JIO_ARTICLE_CATEGORIES].sort((a, b) => b.length - a.length);
    for (const cat of sortedCategories) {
        if (normalizedName.includes(cat.toUpperCase())) {
            return cat;
        }
    }
    return '-';
}

function extractPricePerUnit(price, weightStr) {
    if (!price || !weightStr || weightStr === 'N/A' || weightStr === '-') return '-';
    
    const str = String(weightStr).toLowerCase().replace(/,/g, '').trim();
    
    // 1. Check for multiplier (e.g. "4 x 100 g")
    const multiMatch = str.match(/(\d+)\s*(?:x|\*|×|-)\s*([\d.]+)\s*([a-z]+)/);
    let value = null;
    let unit = null;

    if (multiMatch) {
       const multiplier = parseInt(multiMatch[1], 10);
       value = parseFloat(multiMatch[2]) * multiplier;
       unit = multiMatch[3];
    } else {
       // 2. Check for standard format (e.g. "500 g", "1.5 kg")
       const standardMatch = str.match(/^([\d.]+)\s*([a-z]+)/);
       if (standardMatch) {
           value = parseFloat(standardMatch[1]);
           unit = standardMatch[2];
       } else {
           // 3. Check for standalone pieces
           if (str.includes('pc') || str.includes('piece')) return `₹${Number(price).toFixed(2)}/pc`;
           return '-';
       }
    }

    if (isNaN(value) || value <= 0) return '-';

    // Normalize units
    if (unit === 'kg' || unit === 'kgs') {
        value = value * 1000;
        unit = 'g';
    } else if (unit === 'l' || unit === 'lit' || unit === 'litre' || unit === 'litres') {
        value = value * 1000;
        unit = 'ml';
    } else if (unit === 'gm' || unit === 'gms') {
        unit = 'g';
    } else if (unit === 'pc' || unit === 'pcs' || unit === 'piece' || unit === 'pieces') {
        unit = 'pc';
    } else if (unit === 'unit' || unit === 'units') {
        unit = 'unit';
    } else if (unit === 'pack' || unit === 'packs') {
        unit = 'pack';
    } else if (unit === 'ml') {
        unit = 'ml';
    } else if (unit === 'g') {
        unit = 'g';
    }

    const pricePerUnit = price / value;
    
    if (pricePerUnit < 0.01) {
       return `₹${pricePerUnit.toFixed(4)}/${unit}`;
    }
    return `₹${pricePerUnit.toFixed(2)}/${unit}`;
}

function ProductDetailsDialog({
    isOpen,
    onClose,
    category,
    pincode,
    platformFilter,
    historyData,
    historyLoading,
    stockData,
    selectedProduct,
    products = [], // NEW Prop
    isAdmin = false,
    onRefresh, 
    onLocalUpdate, 
    showToast 
}) {
    const { isSidebarOpen } = useSidebar();
    const [isEditOpen, setIsEditOpen] = React.useState(false); // State for edit dialog
    const [toast, setToast] = React.useState(null);
    const [copiedId, setCopiedId] = React.useState(null);
    const [copiedArticle, setCopiedArticle] = React.useState(null);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen || !selectedProduct) return null;

    const platforms = ['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'];
    const availablePlatforms = platforms.filter(p => selectedProduct[p]);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setToast('Product ID Copied!');
        setCopiedId(text);
        setTimeout(() => {
            setToast(null);
            setCopiedId(null);
        }, 2000);
    };

    return (
        <div className={cn(
            "fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-300",
            isSidebarOpen ? "xl:ml-64" : "xl:ml-0"
        )}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Dialog Content */}
            <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-start justify-between px-4 py-3 border-b border-neutral-200 bg-white">
                    <div className="flex gap-2.5 items-center">
                        {/* Group Image Display */}
                        <div className="w-12 h-12 bg-white border border-gray-200 rounded flex-none p-1 flex items-center justify-center overflow-hidden shrink-0">
                            <ProductImage product={selectedProduct} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-lg font-bold text-neutral-900 leading-tight">{selectedProduct.name}</h2>
                                {isAdmin && (
                                    <button
                                        onClick={() => setIsEditOpen(true)}
                                        className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 rounded-full transition-colors cursor-pointer"
                                        title="Edit Product Details"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 mt-0.5">
                            <div className="flex gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">
                                <span>{category}</span>
                                <span>•</span>
                                <span>{pincode}</span>
                                <span>•</span>
                                <span className="text-neutral-500">{availablePlatforms.length} Products</span>
                            </div>
                            {selectedProduct.groupingId && (
                                <div className="flex items-center gap-2">
                                    <span className="bg-neutral-100 text-neutral-600 text-[10px] font-mono px-1.5 py-0.5 rounded border border-neutral-200">
                                        GID: {selectedProduct.groupingId}
                                    </span>
                                    <button
                                        onClick={() => handleCopy(selectedProduct.groupingId)}
                                        className={`p-1 rounded-md transition-colors flex-shrink-0 ${copiedId === selectedProduct.groupingId ? 'text-green-600 bg-green-50' : 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100'}`}
                                        title={copiedId === selectedProduct.groupingId ? "Copied!" : "Copy Group ID"}
                                    >
                                        {copiedId === selectedProduct.groupingId ? <Check size={10} /> : <Copy size={10} />}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 -mr-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 bg-gray-50">

                    {/* Platform Details Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-5">
                        {availablePlatforms.map(platform => {
                            const data = selectedProduct[platform];

                            // Calculate discount if missing
                            let displayDiscount = data.discountPercentage > 0 ? `${Math.round(data.discountPercentage)}% Off` : null;
                            if (!displayDiscount && data.originalPrice && data.currentPrice && data.originalPrice > data.currentPrice) {
                                const calculatedDiscount = Math.round(((data.originalPrice - data.currentPrice) / data.originalPrice) * 100);
                                if (calculatedDiscount > 0) {
                                    displayDiscount = `${calculatedDiscount}% Off`;
                                }
                            }

                            const inStock = !data.isOutOfStock;

                            return (
                                <div key={platform} className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                                    {/* Platform Header with Link */}
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold uppercase tracking-wider text-neutral-700">{platform}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${data.isAd ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                                Ad: {data.isAd ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                        {data.productUrl ? (
                                            <a
                                                href={data.productUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-2 py-1 rounded-full"
                                                title="View on Platform"
                                            >
                                                View <ExternalLink size={12} />
                                            </a>
                                        ) : (
                                            <span className="text-xs text-neutral-400 italic">No Link</span>
                                        )}
                                    </div>

                                    <div className="flex gap-4">
                                        {/* Image Section */}
                                        <div className="w-24 h-24 flex-shrink-0 border border-neutral-100 rounded-md p-1 bg-white">
                                            {data.productImage && data.productImage.length > 5 ? (
                                                <img
                                                    src={data.productImage}
                                                    alt={selectedProduct.name}
                                                    className="w-full h-full object-contain mix-blend-multiply"
                                                    onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-[10px] text-neutral-300">No Img</div>'; }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-300">
                                                    No Img
                                                </div>
                                            )}
                                        </div>

                                        {/* info section */}
                                        <div className="flex-1 space-y-2 text-sm">
                                            <div className="mb-2">
                                                <div className="flex flex-col gap-1 mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-gray-100 text-gray-500 text-[10px] font-mono px-1.5 py-0.5 rounded select-all cursor-text break-all" title="Product ID">
                                                            PID: {data.productId.split('__')[0].replace(/-[a-z]$/i, '')}
                                                        </span>
                                                        <button
                                                            onClick={() => handleCopy(data.productId.split('__')[0].replace(/-[a-z]$/i, ''))}
                                                            className="text-neutral-400 hover:text-neutral-600 transition-colors p-0.5 rounded cursor-pointer"
                                                            title="Copy PID"
                                                        >
                                                            {copiedId === data.productId.split('__')[0].replace(/-[a-z]$/i, '') ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                                                        </button>
                                                    </div>
                                                    {isAdmin && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-mono px-1.5 py-0.5 rounded select-all cursor-text break-all" title="Admin ID (Full Data ID)">
                                                                AID: {data.productId}
                                                            </span>
                                                            <button
                                                                onClick={() => handleCopy(data.productId)}
                                                                className="text-neutral-400 hover:text-neutral-600 transition-colors p-0.5 rounded cursor-pointer"
                                                                title="Copy AID"
                                                            >
                                                                {copiedId === data.productId ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-medium text-neutral-900 text-sm block line-clamp-2 h-10 mb-1" title={data.productName || data.name}>
                                                    {data.productName || data.name}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-neutral-500">Price:</span>
                                                <span className="font-bold text-base">₹{data.currentPrice}</span>
                                            </div>

                                            {(data.originalPrice || displayDiscount) && (
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-neutral-500">MRP:</span>
                                                    <div className="flex items-center gap-2">
                                                        {data.originalPrice && (
                                                            <span className="line-through text-neutral-400">₹{data.originalPrice}</span>
                                                        )}
                                                        {displayDiscount && (
                                                            <span className="text-green-600 font-bold">{displayDiscount}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center">
                                                <span className="text-neutral-500">Weight:</span>
                                                <span className={`text-neutral-700 font-medium text-xs ${!data.productWeight && !data.quantity ? 'italic text-neutral-400' : ''}`}>
                                                    {(data.productWeight && data.productWeight !== 'N/A') ? data.productWeight : (data.quantity || 'N/A')}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-neutral-500">Price/Unit:</span>
                                                <span className="text-blue-600 font-bold text-xs bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center justify-center">
                                                    {extractPricePerUnit(data.currentPrice, (data.productWeight && data.productWeight !== 'N/A') ? data.productWeight : data.quantity)}
                                                </span>
                                            </div>



                                            <div className="flex justify-between items-center pt-1">
                                                <span className="text-neutral-500">Stock:</span>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${inStock ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                                    {inStock ? 'In Stock' : 'Out of Stock'}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-neutral-500">Delivery:</span>
                                                <span className={`text-neutral-700 font-medium text-xs ${!data.deliveryTime ? 'italic text-neutral-400' : ''}`}>
                                                    {data.deliveryTime
                                                        ? (data.deliveryTime.match(/^\d+\s*mins?/i)?.[0] || data.deliveryTime)
                                                        : 'N/A'}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-neutral-500">Rating:</span>
                                                <span className={`text-neutral-700 font-medium text-xs ${!data.rating ? 'italic text-neutral-400' : ''}`}>
                                                    {data.rating || 'N/A'}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-neutral-500">Ranking:</span>
                                                <span className={`text-neutral-700 font-medium text-xs ${!data.ranking ? 'italic text-neutral-400' : ''}`}>
                                                    {data.ranking || 'N/A'}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-neutral-500">Brand:</span>
                                                <span className={`text-neutral-700 font-medium text-xs ${!selectedProduct.brand ? 'italic text-neutral-400' : ''}`} title={selectedProduct.brand}>
                                                    {selectedProduct.brand || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Extra Details */}
                                    {/* Extra Details */}
                                    <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2 text-xs">
                                        <div className="flex gap-2">
                                            <span className="text-neutral-400 font-medium min-w-[125px]">Combo:</span>
                                            <span className={`text-neutral-600 truncate ${!data.combo ? 'italic text-neutral-400' : ''}`} title={data.combo}>
                                                {data.combo || 'No Combo'}
                                            </span>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex gap-2">
                                                <span className="text-neutral-400 font-medium min-w-[125px]">Category:</span>
                                                <span className="text-neutral-700 truncate flex-1" title={data.officialCategory}>
                                                    {data.officialCategory || <span className="italic text-neutral-300">--</span>}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="text-neutral-400 font-medium min-w-[125px]">Subcategory:</span>
                                                <span className="text-neutral-700 flex-1 break-words" title={data.officialSubCategory}>
                                                    {data.officialSubCategory || <span className="italic text-neutral-300">--</span>}
                                                </span>
                                            </div>
                                            {platform === 'jiomart' && (
                                                <div className="flex gap-2 group/article relative">
                                                    <span className="text-neutral-400 font-medium min-w-[125px]">Article Category:</span>
                                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                        <span className="text-neutral-700 truncate" title="Extracted JioMart Article Category">
                                                            {extractArticleCategory(data.productName || data.name) !== '-' ? extractArticleCategory(data.productName || data.name) : <span className="italic text-neutral-300">--</span>}
                                                        </span>
                                                        {(() => {
                                                            const val = extractArticleCategory(data.productName || data.name);
                                                            return val !== '-' && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigator.clipboard.writeText(val);
                                                                        setCopiedArticle(val);
                                                                        setTimeout(() => setCopiedArticle(null), 2000);
                                                                    }}
                                                                    className={`p-1 rounded-md transition-all flex-shrink-0 cursor-pointer ${copiedArticle === val ? 'text-green-600 bg-green-50' : 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100'}`}
                                                                    title={copiedArticle === val ? "Copied!" : "Copy Article Category"}
                                                                >
                                                                    {copiedArticle === val ? <Check size={12} /> : <Copy size={12} />}
                                                                </button>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <span className="text-neutral-400 font-medium min-w-[125px] leading-tight mt-0.5">Other Subcategories:</span>
                                                <span className="text-neutral-500 flex-1 break-words text-[11px] leading-snug" title={(() => {
                                                    if (!products || products.length === 0) return '';
                                                    
                                                    // Remove suffixes like __fresh-vegetables or -a
                                                    const baseId = data.productId.split('__')[0].replace(/-[a-z]$/i, '');
                                                    
                                                    // Find all products on THIS platform that share the base ID
                                                    const matchingCategories = new Set();
                                                    
                                                    products.forEach(p => {
                                                        if (p[platform] && p[platform].productId) {
                                                            const iterBaseId = p[platform].productId.split('__')[0].replace(/-[a-z]$/i, '');
                                                            if (iterBaseId === baseId && p[platform].officialSubCategory && p[platform].officialSubCategory !== data.officialSubCategory) {
                                                                matchingCategories.add(p[platform].officialSubCategory);
                                                            }
                                                        }
                                                    });
                                                    
                                                    return Array.from(matchingCategories).join(', ');
                                                })()}>
                                                    {(() => {
                                                    if (!products || products.length === 0) return <span className="italic text-neutral-300">--</span>;
                                                    
                                                    // Remove suffixes like __fresh-vegetables or -a
                                                    const baseId = data.productId.split('__')[0].replace(/-[a-z]$/i, '');
                                                    
                                                    // Find all products on THIS platform that share the base ID
                                                    const matchingCategories = new Set();
                                                    
                                                    products.forEach(p => {
                                                        if (p[platform] && p[platform].productId) {
                                                            const iterBaseId = p[platform].productId.split('__')[0].replace(/-[a-z]$/i, '');
                                                            if (iterBaseId === baseId && p[platform].officialSubCategory && p[platform].officialSubCategory !== data.officialSubCategory) {
                                                                matchingCategories.add(p[platform].officialSubCategory);
                                                            }
                                                        }
                                                    });
                                                    
                                                    const result = Array.from(matchingCategories).join(', ');
                                                    return result || <span className="italic text-neutral-300">--</span>;
                                                })()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-10 right-10 bg-neutral-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium z-[150] animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
                    <Check size={16} className="text-green-400" />
                    {toast}
                </div>
            )}
            {/* Nested Edit Dialog */}
            {
                isEditOpen && (
                    <ProductEditDialog
                        isOpen={isEditOpen}
                        onClose={() => setIsEditOpen(false)}
                        product={selectedProduct}
                        onUpdate={(updatedData) => {
                            if (updatedData && onLocalUpdate) {
                                onLocalUpdate(updatedData);
                                showToast('Product updated locally', 'success');
                            } else if (onRefresh) {
                                onRefresh();
                            }
                            setIsEditOpen(false);
                        }}
                    />
                )
            }
        </div>
    );
}

export default ProductDetailsDialog;
