const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const DATA_DIR = path.join(__dirname, '../data');
const INPUT_FILE = path.join(DATA_DIR, 'categories_dataset.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'categories.xlsx');

async function generateExcel() {
    try {
        // Read dataset
        if (!fs.existsSync(INPUT_FILE)) {
            throw new Error(`Input file not found: ${INPUT_FILE}`);
        }
        const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
        const categoriesDataset = JSON.parse(rawData);

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Unified Categories');

        // Define columns
        worksheet.columns = [
            { header: 'Unified Category Name', key: 'unifiedName', width: 25 },
            { header: 'Unified Category ID', key: 'unifiedId', width: 20 },
            { header: 'Platform', key: 'platform', width: 15 },
            { header: 'Original Category', key: 'originalCategory', width: 25 },
            { header: 'Original Sub Category', key: 'subCategory', width: 25 },
            { header: 'URL', key: 'url', width: 50 },
        ];

        // Style header row
        worksheet.getRow(1).font = { bold: true };

        // Add data rows
        let rowCount = 0;
        categoriesDataset.forEach(group => {
            // Add a separator row or just flatten? 
            // Flattening is usually better for analysis.

            group.items.forEach(item => {
                worksheet.addRow({
                    unifiedName: group.name,
                    unifiedId: group.id,
                    platform: item.platform,
                    originalCategory: item.originalCategory,
                    subCategory: item.subCategory,
                    url: item.url
                });
                rowCount++;
            });
        });

        console.log(`Added ${rowCount} rows to Excel sheet.`);

        // Write to file
        await workbook.xlsx.writeFile(OUTPUT_FILE);
        console.log(`Excel file created successfully: ${OUTPUT_FILE}`);

    } catch (error) {
        console.error('Error generating Excel file:', error);
    }
}

generateExcel();
