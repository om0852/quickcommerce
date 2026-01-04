
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'local-scraper-service', 'server.js');

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Define the block to replace
    // Note: The file might have different line ending formatting, so we'll try to match a large enough chunk or regex

    // We'll search for the specific commented out block
    const searchString = `        // [TESTING] Filter removed to scrape ALL categories
        /*
        for (const key of Object.keys(categoriesGrouped)) {
            if (!key.toLowerCase().includes('skincare')) {
                delete categoriesGrouped[key];
            }
        }
        */`;

    const replacementString = `        // [TESTING] Filter enabled for 'Bath & Body' only
        for (const key of Object.keys(categoriesGrouped)) {
            if (!key.toLowerCase().includes('bath & body')) {
                delete categoriesGrouped[key];
            }
        }`;

    // Normalize line endings for comparison if needed, but let's try direct replacement first
    // If exact match fails, we might need a regex

    if (content.includes(searchString)) {
        const newContent = content.replace(searchString, replacementString);
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Successfully updated server.js');
    } else {
        // Fallback: try to replace using a simpler marker if the exact whitespace is off
        console.log('Exact match failed, trying alternative match...');

        // Let's try to match just the inner part
        const altSearch = `if (!key.toLowerCase().includes('skincare'))`;
        if (content.includes(altSearch)) {
            // Reconstruct the file by finding the bounds.
            // This is risky. Let's just use the temp file I created as source of truth since I verified it.
            const tempPath = path.join(__dirname, 'temp_server_view.js');
            if (fs.existsSync(tempPath)) {
                let tempContent = fs.readFileSync(tempPath, 'utf8');
                let newTempContent = tempContent.replace(searchString, replacementString);
                fs.writeFileSync(filePath, newTempContent, 'utf8');
                console.log('Successfully updated server.js from temp copy');
            } else {
                console.error('Could not find temp file or match content.');
                process.exit(1);
            }
        } else {
            console.error('Content to replace not found.');
            process.exit(1);
        }
    }
} catch (err) {
    console.error('Error updating file:', err);
    process.exit(1);
}
