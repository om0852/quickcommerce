"use client"
import React, { useState } from 'react';
import { Download, X, Mail, CheckCircle, AlertCircle } from 'lucide-react';

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
    const [email, setEmail] = useState('');

    // Dropdown States - defaulting to first option or specific values if needed
    const [selectedPlatform, setSelectedPlatform] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState(currentCategory || 'all');
    const [selectedPincode, setSelectedPincode] = useState(currentPincode || (pincodeOptions[0]?.value) || '');
    const [exportType, setExportType] = useState('latest');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await fetch('/api/export-category-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    exportType,
                    // Sending arrays to match expected backend format even though UI is single select
                    platforms: selectedPlatform === 'all' ? ['all'] : [selectedPlatform],
                    categories: selectedCategory === 'all' ? ['all'] : [selectedCategory],
                    pincodes: [selectedPincode],
                    products: ['all'] // Removed from UI, default to all
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Export failed');
            }

            setSuccess(data.message || "Excel file has been sent to your email!");
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
            transition: 'opacity 0.2s ease'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                width: '90%',
                maxWidth: '480px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                border: '1px solid #e5e5e5',
                animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <style jsx>{`
                    @keyframes scaleUp {
                        from { transform: scale(0.98); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                    .input-focus:focus {
                        outline: none;
                        border-color: #171717;
                        ring: 1px solid #171717;
                    }
                `}</style>

                {/* Header - Clean B&W */}
                <div style={{
                    padding: '1.5rem',
                    background: 'white',
                    borderBottom: '1px solid #f3f4f6',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#171717' }}>Export Data</h2>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#737373' }}>
                            Generate an Excel report
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'white',
                            border: '1px solid #e5e5e5',
                            cursor: 'pointer',
                            padding: '0.375rem',
                            borderRadius: '0.375rem',
                            color: '#737373',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#171717';
                            e.currentTarget.style.borderColor = '#171717';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#737373';
                            e.currentTarget.style.borderColor = '#e5e5e5';
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>

                    {/* Email Input */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717' }}>
                            Email Address <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#737373' }} />
                            <input
                                type="email"
                                required
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-focus"
                                style={{
                                    width: '100%',
                                    padding: '0.625rem 1rem 0.625rem 2.5rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #e5e5e5',
                                    fontSize: '0.875rem',
                                    backgroundColor: 'white',
                                    color: '#171717',
                                    transition: 'border-color 0.2s'
                                }}
                            />
                        </div>
                    </div>

                    {/* Filters Container */}
                    <div style={{
                        marginBottom: '2rem',
                    }}>

                        {/* Grid for Dropdowns */}
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {/* Export Type */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#404040' }}>Export Type</label>
                                <select
                                    value={exportType}
                                    onChange={(e) => setExportType(e.target.value)}
                                    className="input-focus"
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem',
                                        borderRadius: '0.375rem',
                                        border: '1px solid #e5e5e5',
                                        fontSize: '0.875rem',
                                        backgroundColor: 'white',
                                        color: '#171717',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <option value="latest">Latest Snapshot Only</option>
                                    <option value="unique">Unique Products (Last 7 Days)</option>
                                </select>
                            </div>

                            {/* Platform */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#404040' }}>Platform</label>
                                <select
                                    value={selectedPlatform}
                                    onChange={(e) => setSelectedPlatform(e.target.value)}
                                    className="input-focus"
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem',
                                        borderRadius: '0.375rem',
                                        border: '1px solid #e5e5e5',
                                        fontSize: '0.875rem',
                                        backgroundColor: 'white',
                                        color: '#171717',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <option value="all">All Platforms</option>
                                    {availablePlatforms.map(p => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Category & Pincode Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#404040' }}>Category</label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="input-focus"
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem',
                                            borderRadius: '0.375rem',
                                            border: '1px solid #e5e5e5',
                                            fontSize: '0.875rem',
                                            backgroundColor: 'white',
                                            color: '#171717',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <option value="all">All</option>
                                        {categoryOptions.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#404040' }}>Pincode</label>
                                    <select
                                        value={selectedPincode}
                                        onChange={(e) => setSelectedPincode(e.target.value)}
                                        className="input-focus"
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem',
                                            borderRadius: '0.375rem',
                                            border: '1px solid #e5e5e5',
                                            fontSize: '0.875rem',
                                            backgroundColor: 'white',
                                            color: '#171717',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {pincodeOptions.map(p => (
                                            <option key={p.value} value={p.value}>{p.value}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer actions */}
                    <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '0.625rem',
                                borderRadius: '0.375rem',
                                border: '1px solid #e5e5e5',
                                background: 'white',
                                color: '#404040',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '0.875rem'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f9fafb';
                                e.currentTarget.style.color = '#171717';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.color = '#404040';
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '0.625rem',
                                borderRadius: '0.375rem',
                                border: '1px solid #171717',
                                background: loading ? '#a3a3a3' : '#171717',
                                color: 'white',
                                fontWeight: 500,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#000000')}
                            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#171717')}
                        >
                            {loading ? (
                                'Processing...'
                            ) : success ? (
                                <>
                                    <CheckCircle size={16} /> Sent!
                                </>
                            ) : (
                                <>
                                    <Download size={16} /> Export
                                </>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div style={{ marginTop: '1.5rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '0.375rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem' }}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
