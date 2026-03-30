import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Package, Loader2, Image as ImageIcon, ChevronDown, ChevronRight, LayoutList } from 'lucide-react';
import { cn } from '@/lib/utils';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Collapse from '@mui/material/Collapse';
import Box from '@mui/material/Box';

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
    return 'Uncategorized';
}

const ArticleRow = ({ articleName, groups }) => {
    const [open, setOpen] = useState(false);

    return (
        <React.Fragment>
            <TableRow 
                hover 
                onClick={() => setOpen(!open)} 
                sx={{ 
                    cursor: 'pointer',
                    '& > *': { borderBottom: 'unset' },
                    transition: 'background-color 0.2s ease',
                    backgroundColor: open ? '#f8fafc' : 'inherit'
                }}
            >
                <TableCell sx={{ padding: '12px 16px', width: 60 }}>
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                </TableCell>
                <TableCell sx={{ padding: '12px 16px', fontWeight: 600, color: '#171717', fontSize: '0.875rem' }}>
                    {articleName}
                </TableCell>
                <TableCell sx={{ padding: '12px 16px' }}>
                    <span className="bg-white text-gray-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-gray-200 shadow-sm">
                        {groups.length} Group{groups.length !== 1 ? 's' : ''}
                    </span>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0, border: 0 }} colSpan={3}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2, marginBottom: 3, border: '1px solid #e5e5e5', borderRadius: '0.5rem', overflow: 'hidden', backgroundColor: 'white', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                            <Table size="small" aria-label="groups">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#737373', backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5', padding: '12px 16px', width: 80 }}>Image</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#737373', backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5', padding: '12px 16px', width: 250 }}>Group ID</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#737373', backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5', padding: '12px 16px' }}>Name</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#737373', backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5', padding: '12px 16px', width: 150 }}>Weight</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {groups.map((group) => (
                                        <TableRow key={group.groupingId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell sx={{ padding: '8px 16px' }}>
                                                <div className="w-10 h-10 rounded overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-100">
                                                    {(group.groupImage || group.image) && (group.groupImage || group.image) !== 'N/A' ? (
                                                        <img 
                                                            src={group.groupImage || group.image} 
                                                            alt={group.name} 
                                                            className="w-full h-full object-contain mix-blend-multiply"
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <ImageIcon size={16} className="text-gray-300" />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell sx={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#4b5563' }}>
                                                {group.groupingId}
                                            </TableCell>
                                            <TableCell sx={{ padding: '12px 16px', fontWeight: 500, color: '#171717' }}>
                                                {group.name || 'Unnamed Group'}
                                            </TableCell>
                                            <TableCell sx={{ padding: '12px 16px', color: '#6b7280' }}>
                                                {group.weight || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

const DictionaryTab = ({ products, loading }) => {
    const [viewMode, setViewMode] = useState('groups'); // 'groups' | 'articles'
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
            (g.name && g.name.toLowerCase().includes(query)) ||
            (extractArticleCategory(g.name).toLowerCase().includes(query))
        );
    }, [masterGroups, searchQuery]);

    const articlesMap = useMemo(() => {
        const map = {};
        filteredGroups.forEach(group => {
            const article = extractArticleCategory(group.name);
            if (!map[article]) map[article] = [];
            map[article].push(group);
        });
        
        return Object.entries(map).sort((a, b) => {
            if (a[0] === 'Uncategorized') return 1;
            if (b[0] === 'Uncategorized') return -1;
            return a[0].localeCompare(b[0]);
        });
    }, [filteredGroups]);

    // Reset to first page when search query or view mode changes
    useEffect(() => {
        setPage(0);
    }, [searchQuery, viewMode]);

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

    const paginatedArticles = useMemo(() => {
        return articlesMap.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [articlesMap, page, rowsPerPage]);

    const totalCount = viewMode === 'groups' ? filteredGroups.length : articlesMap.length;

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
                {/* Search Bar & Toggles */}
                <div className="p-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row gap-4 items-center sm:justify-between">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg self-start sm:self-auto w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
                        <button
                            onClick={() => setViewMode('groups')}
                            className={cn(
                                "flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2",
                                viewMode === 'groups' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700 hover:bg-gray-200"
                            )}
                        >
                            <Package size={16} />
                            Groups
                        </button>
                        <button
                            onClick={() => setViewMode('articles')}
                            className={cn(
                                "flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2",
                                viewMode === 'articles' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700 hover:bg-gray-200"
                            )}
                        >
                            <LayoutList size={16} />
                            Articles
                        </button>
                    </div>

                    <div className="relative w-full max-w-md shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by Group ID, Name or Article..."
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
                            {viewMode === 'groups' ? (
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', color: '#737373', backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5', padding: '12px 16px', width: 80 }}>Image</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: '#737373', backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5', padding: '12px 16px', width: 250 }}>Group ID</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: '#737373', backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5', padding: '12px 16px' }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: '#737373', backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5', padding: '12px 16px', width: 150 }}>Weight</TableCell>
                                </TableRow>
                            ) : (
                                <TableRow>
                                    <TableCell sx={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5', width: 60 }}></TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: '#737373', backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5', padding: '12px 16px' }}>Article Category</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: '#737373', backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5', padding: '12px 16px' }}>Total Groups</TableCell>
                                </TableRow>
                            )}
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell sx={{ padding: '12px 16px' }} colSpan={viewMode === 'groups' ? 1 : 1}>
                                            <div className="w-8 h-8 bg-gray-100 animate-pulse rounded-full" />
                                        </TableCell>
                                        <TableCell sx={{ padding: '12px 16px' }}>
                                            <div className="h-4 w-32 bg-gray-100 animate-pulse rounded" />
                                        </TableCell>
                                        <TableCell sx={{ padding: '12px 16px' }} colSpan={viewMode === 'groups' ? 2 : 1}>
                                            <div className="h-4 w-full bg-gray-100 animate-pulse rounded" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : totalCount === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={viewMode === 'groups' ? 4 : 3} align="center" sx={{ padding: '48px 24px', color: '#737373' }}>
                                        <div className="flex flex-col items-center gap-2">
                                            {viewMode === 'groups' ? <Package size={32} className="text-gray-300" /> : <LayoutList size={32} className="text-gray-300" />}
                                            <p>{searchQuery ? 'No results found matching your search.' : `No ${viewMode} available.`}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : viewMode === 'groups' ? (
                                paginatedGroups.map((group) => (
                                    <TableRow
                                        key={group.groupingId}
                                        hover
                                        sx={{ '&:last-child td, &:last-child th': { border: 0 }, transition: 'background-color 0.2s ease' }}
                                    >
                                        <TableCell sx={{ padding: '8px 16px' }}>
                                            <div className="w-12 h-12 rounded-lg border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center">
                                                {(group.groupImage || group.image) && (group.groupImage || group.image) !== 'N/A' ? (
                                                    <img 
                                                        src={group.groupImage || group.image} 
                                                        alt={group.name} 
                                                        className="w-full h-full object-contain mix-blend-multiply"
                                                        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <ImageIcon size={20} className="text-gray-300" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell sx={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#4b5563' }}>
                                            {group.groupingId}
                                        </TableCell>
                                        <TableCell sx={{ padding: '12px 16px', fontWeight: 500, color: '#171717' }}>
                                            {group.name || 'Unnamed Group'}
                                        </TableCell>
                                        <TableCell sx={{ padding: '12px 16px', color: '#6b7280' }}>
                                            {group.weight || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                paginatedArticles.map(([articleName, groups]) => (
                                    <ArticleRow key={articleName} articleName={articleName} groups={groups} />
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
                        count={totalCount}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        sx={{
                            borderTop: '1px solid #e5e5e5',
                            backgroundColor: '#fafafa',
                            '.MuiTablePagination-toolbar': { minHeight: '48px' },
                            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }
                        }}
                    />
                )}
            </Paper>
        </div>
    );
};

export default DictionaryTab;
