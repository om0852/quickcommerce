import React, { useState, useMemo, useEffect } from 'react';

const ProductImage = ({ product }) => {
    const platforms = ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'];

    // Collect all available images from all sources
    const images = useMemo(() => {
        const platformImages = platforms
            .map(p => product[p]?.productImage)
            .filter(url => url && url.length > 5);
        
        const candidates = [
            product.groupImage,
            product.primaryImage,
            product.image,
            ...platformImages
        ];

        // Filter valid URLs and remove common placeholders
        return candidates.filter(url => 
            url && 
            url.length > 5 && 
            !url.includes('defaultPlaceholder.svg') &&
            !url.toLowerCase().includes('no-image') &&
            !url.toLowerCase().includes('placeholder')
        );
    }, [product]);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [failed, setFailed] = useState(false);

    // Reset state when product or images change
    useEffect(() => {
        setCurrentImageIndex(0);
        setFailed(false);
    }, [product, images.length]);

    const handleError = () => {
        if (currentImageIndex < images.length - 1) {
            setCurrentImageIndex(prev => prev + 1);
        } else {
            setFailed(true);
        }
    };

    if (images.length === 0 || failed) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-neutral-100 text-[10px] text-neutral-400 font-medium">
                No Img
            </div>
        );
    }

    return (
        <img
            className="h-full w-full object-contain mix-blend-multiply transition-opacity duration-300"
            src={images[currentImageIndex]}
            alt={product.name || 'Product'}
            onError={handleError}
            loading="lazy"
        />
    );
};

export default ProductImage;
