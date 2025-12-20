"use client"
import React, { useState } from 'react';
import { Download, X, Calendar, Mail, Filter, CheckSquare, Square } from 'lucide-react';

export default function ExportCategoryDialog({
    isOpen,
    onClose,
    currentCategory,
    currentPincode,
    availableProducts = [],
    availablePlatforms = [],
    pincodeOptions = [],
    categoryOptions = []
}) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    // Form State
    // Form State
    const [email, setEmail] = useState('');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const maxDate = new Date().toISOString().split('T')[0];

    const [selectedPlatforms, setSelectedPlatforms] = useState(['all']);
    const [selectedCategories, setSelectedCategories] = useState([currentCategory]);
    const [selectedPincodes, setSelectedPincodes] = useState([currentPincode]);
    const [selectedProducts, setSelectedProducts] = useState(['all']);
    const [showAllProducts, setShowAllProducts] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        if (startDate === endDate) {
            setError("Start Date and End Date cannot be the same.");
            setLoading(false);
            return;
        }

        if (startDate > endDate) {
            setError("Start Date cannot be after End Date.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/export-category-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    startDate,
                    endDate,
                    platforms: selectedPlatforms.includes('all') ? ['all'] : selectedPlatforms,
                    categories: selectedCategories.includes('all') ? ['all'] : selectedCategories,
                    pincodes: selectedPincodes,
                    products: selectedProducts.includes('all') ? ['all'] : selectedProducts
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Export failed');
            }

            setSuccess("Excel file is generating and will be sent in 2 to 3 mins.");
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 3000); // Increased timeout to read message
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (item, currentList, setList, allValue = 'all') => {
        if (item === allValue) {
            setList([allValue]);
            return;
        }

        let newList = [...currentList];
        if (newList.includes(allValue)) {
            newList = [];
        }

        if (newList.includes(item)) {
            newList = newList.filter(i => i !== item);
        } else {
            newList.push(item);
        }

        if (newList.length === 0) {
            newList = [allValue];
        }

        setList(newList);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '1rem',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #e5e5e5',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    background: 'white',
                    zIndex: 10
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Export Data</h2>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Generate Excel report and send via email</p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.375rem', color: '#6b7280' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>

                    {/* Date Range */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                                Start Date
                            </label>
                            <input
                                type="date"
                                required
                                value={startDate}
                                max={maxDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #e5e5e5',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                                End Date
                            </label>
                            <input
                                type="date"
                                required
                                value={endDate}
                                max={maxDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #e5e5e5',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                            Send to Email (Required)
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input
                                type="email"
                                required
                                placeholder="enter@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 3rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #e5e5e5',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>
                    </div>

                    {/* Filters Section */}
                    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Filter size={16} /> Filters
                        </h3>

                        {/* Platforms */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Platforms</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {availablePlatforms.map(p => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => toggleSelection(p.value, selectedPlatforms, setSelectedPlatforms)}
                                        style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '9999px',
                                            border: '1px solid',
                                            borderColor: selectedPlatforms.includes(p.value) ? '#4f46e5' : '#e5e5e5',
                                            background: selectedPlatforms.includes(p.value) ? '#eef2ff' : 'white',
                                            color: selectedPlatforms.includes(p.value) ? '#4f46e5' : '#374151',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Categories */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Categories</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => toggleSelection('all', selectedCategories, setSelectedCategories)}
                                    style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '9999px',
                                        border: '1px solid',
                                        borderColor: selectedCategories.includes('all') ? '#4f46e5' : '#e5e5e5',
                                        background: selectedCategories.includes('all') ? '#eef2ff' : 'white',
                                        color: selectedCategories.includes('all') ? '#4f46e5' : '#374151',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    All
                                </button>
                                {categoryOptions.map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => toggleSelection(c.value, selectedCategories, setSelectedCategories)}
                                        style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '9999px',
                                            border: '1px solid',
                                            borderColor: selectedCategories.includes(c.value) ? '#4f46e5' : '#e5e5e5',
                                            background: selectedCategories.includes(c.value) ? '#eef2ff' : 'white',
                                            color: selectedCategories.includes(c.value) ? '#4f46e5' : '#374151',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pincodes */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Pincodes</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {pincodeOptions.map(p => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => toggleSelection(p.value, selectedPincodes, setSelectedPincodes, null)} // null because we usually want specific pincodes, but UI can support multi
                                        style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '9999px',
                                            border: '1px solid',
                                            borderColor: selectedPincodes.includes(p.value) ? '#4f46e5' : '#e5e5e5',
                                            background: selectedPincodes.includes(p.value) ? '#eef2ff' : 'white',
                                            color: selectedPincodes.includes(p.value) ? '#4f46e5' : '#374151',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {p.value}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Products (Optional: simplified as "All" or Specific logic if needed, keeping simple for now) */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Products</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedProducts(['all'])}
                                    style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '9999px',
                                        border: '1px solid',
                                        borderColor: selectedProducts.includes('all') ? '#4f46e5' : '#e5e5e5',
                                        background: selectedProducts.includes('all') ? '#eef2ff' : 'white',
                                        color: selectedProducts.includes('all') ? '#4f46e5' : '#374151',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    All Products
                                </button>
                                {(showAllProducts ? availableProducts : availableProducts.slice(0, 5)).map(product => (
                                    <button
                                        key={product.name}
                                        type="button"
                                        onClick={() => toggleSelection(product.name, selectedProducts, setSelectedProducts)}
                                        style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '9999px',
                                            border: '1px solid',
                                            borderColor: selectedProducts.includes(product.name) ? '#4f46e5' : '#e5e5e5',
                                            background: selectedProducts.includes(product.name) ? '#eef2ff' : 'white',
                                            color: selectedProducts.includes(product.name) ? '#4f46e5' : '#374151',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name}
                                    </button>
                                ))}
                                {availableProducts.length > 5 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAllProducts(!showAllProducts)}
                                        style={{
                                            padding: '0.25rem 0.75rem',
                                            border: 'none',
                                            background: 'none',
                                            fontSize: '0.75rem',
                                            color: '#4f46e5',
                                            alignSelf: 'center',
                                            cursor: 'pointer',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        {showAllProducts ? 'Show less' : `+${availableProducts.length - 5} more`}
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Footer actions */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #e5e5e5',
                                background: 'white',
                                color: '#374151',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: 'none',
                                background: loading ? '#9ca3af' : '#4f46e5',
                                color: 'white',
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {loading ? (
                                'Processing...'
                            ) : success ? (
                                'Sent!'
                            ) : (
                                <>
                                    <Download size={18} /> Export & Send
                                </>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#dc2626', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
