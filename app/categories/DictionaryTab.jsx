import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Package, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';

const DictionaryTab = ({ products, loading }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    const masterGroups = useMemo(() => {
        if (!products) return [];
        // Filter for master groups: not a header and isDuplicate is false
        const filtered = products.filter(p => !p.isHeader && !p.isDuplicate);
        
        // Sort A-Z by name by default
        return filtered.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }, [products]);

    const filteredGroups = useMemo(() => {
        if (!searchQuery) return masterGroups;
        const query = searchQuery.toLowerCase().trim();
        return masterGroups.filter(g => 
            (g.groupingId && g.groupingId.toLowerCase().includes(query)) ||
            (g.name && g.name.toLowerCase().includes(query))
        );
    }, [masterGroups, searchQuery]);

    // Reset to first page when search query changes
    useEffect(() => {
        setPage(0);
    }, [searchQuery]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paginatedGroups = useMemo(() => {
        return filteredGroups.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [filteredGroups, page, rowsPerPage]);

    return (
        <div className="flex flex-col gap-4 h-full">
            <Paper
                elevation={0}
                sx={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '0.75rem',
                    border: '1px solid #e5e5e5',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    overflow: 'hidden',
                    flex: 1 // Allow Paper to grow
                }}
            >
                {/* Search Bar */}
                <div className="p-4 border-b border-gray-100 bg-white">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by Group ID or Name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <TableContainer sx={{ flex: 1 }}>
                    <Table stickyHeader aria-label="dictionary table" size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: 'bold',
                                        color: '#737373',
                                        backgroundColor: '#fafafa',
                                        borderBottom: '1px solid #e5e5e5',
                                        padding: '12px 16px',
                                        width: 80
                                    }}
                                >
                                    Image
                                </TableCell>
                                <TableCell
                                    sx={{
                                        fontWeight: 'bold',
                                        color: '#737373',
                                        backgroundColor: '#fafafa',
                                        borderBottom: '1px solid #e5e5e5',
                                        padding: '12px 16px',
                                        width: 250
                                    }}
                                >
                                    Group ID
                                </TableCell>
                                <TableCell
                                    sx={{
                                        fontWeight: 'bold',
                                        color: '#737373',
                                        backgroundColor: '#fafafa',
                                        borderBottom: '1px solid #e5e5e5',
                                        padding: '12px 16px'
                                    }}
                                >
                                    Name
                                </TableCell>
                                <TableCell
                                    sx={{
                                        fontWeight: 'bold',
                                        color: '#737373',
                                        backgroundColor: '#fafafa',
                                        borderBottom: '1px solid #e5e5e5',
                                        padding: '12px 16px',
                                        width: 150
                                    }}
                                >
                                    Weight
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell sx={{ padding: '12px 16px' }}>
                                            <div className="w-10 h-10 bg-gray-100 animate-pulse rounded-md" />
                                        </TableCell>
                                        <TableCell sx={{ padding: '12px 16px' }}>
                                            <div className="h-4 w-32 bg-gray-100 animate-pulse rounded" />
                                        </TableCell>
                                        <TableCell sx={{ padding: '12px 16px' }}>
                                            <div className="h-4 w-full bg-gray-100 animate-pulse rounded" />
                                        </TableCell>
                                        <TableCell sx={{ padding: '12px 16px' }}>
                                            <div className="h-4 w-16 bg-gray-100 animate-pulse rounded" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : paginatedGroups.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ padding: '48px 24px', color: '#737373' }}>
                                        <div className="flex flex-col items-center gap-2">
                                            <Package size={32} className="text-gray-300" />
                                            <p>{searchQuery ? 'No groups found matching your search.' : 'No groups available.'}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedGroups.map((group) => (
                                    <TableRow
                                        key={group.groupingId}
                                        hover
                                        sx={{
                                            '&:last-child td, &:last-child th': { border: 0 },
                                            transition: 'background-color 0.2s ease',
                                        }}
                                    >
                                        <TableCell sx={{ padding: '8px 16px' }}>
                                            <div className="w-12 h-12 rounded-lg border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center">
                                                {(group.groupImage || group.image) && (group.groupImage || group.image) !== 'N/A' ? (
                                                    <img 
                                                        src={group.groupImage || group.image} 
                                                        alt={group.name} 
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <ImageIcon size={20} className="text-gray-300" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell 
                                            sx={{ 
                                                padding: '12px 16px',
                                                fontFamily: 'monospace',
                                                fontSize: '0.75rem',
                                                color: '#4b5563'
                                            }}
                                        >
                                            {group.groupingId}
                                        </TableCell>
                                        <TableCell 
                                            sx={{ 
                                                padding: '12px 16px',
                                                fontWeight: 500,
                                                color: '#171717'
                                            }}
                                        >
                                            {group.name || 'Unnamed Group'}
                                        </TableCell>
                                        <TableCell 
                                            sx={{ 
                                                padding: '12px 16px',
                                                color: '#6b7280'
                                            }}
                                        >
                                            {group.weight || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                
                {/* Pagination */}
                {!loading && (
                    <TablePagination
                        rowsPerPageOptions={[25, 50, 100]}
                        component="div"
                        count={filteredGroups.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        sx={{
                            borderTop: '1px solid #e5e5e5',
                            backgroundColor: '#fafafa',
                            '.MuiTablePagination-toolbar': {
                                minHeight: '48px',
                            },
                            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                fontWeight: 500
                            }
                        }}
                    />
                )}
            </Paper>
        </div>
    );
};

export default DictionaryTab;
