
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

// Node 18+ has built-in fetch.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRAPED_AT = '2026-01-09T14:30:00.000+00:00';
const PINCODES = ['400706', '400001'];
const SERVER_PORT = 5000;
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}`;

// Paths relative to this script located in /scripts
const SERVICE_DIR = path.resolve(__dirname, '../local-scraper-service');
const CATEGORIES_FILE = path.join(SERVICE_DIR, 'utils', 'categories_with_urls.json');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function startServer() {
    console.log('Starting server from:', SERVICE_DIR);
    const serverProcess = spawn('node', ['server.js'], {
        cwd: SERVICE_DIR,
        detached: false,
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, PORT: SERVER_PORT.toString() }
    });

    // Wait for server to initialize
    await sleep(10000);
    console.log('Server process spawned. Assuming ready.');
    return serverProcess;
}

async function runScraper() {
    let serverProcess = null;
    let externalServer = false;

    // Check if server is already running
    try {
        await fetch(`${SERVER_URL}/`);
        console.log('Using existing server.');
        externalServer = true;
    } catch (e) {
        console.log('No existing server found (or connection refused). Spawning new one.');
        serverProcess = await startServer();
    }

    try {
        if (!fs.existsSync(CATEGORIES_FILE)) {
            throw new Error(`Categories file not found at ${CATEGORIES_FILE}`);
        }
        const categoriesData = JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8'));

        console.log(`Loaded categories data.`);

        let foundAny = false;

        // Iterate over all root categories
        for (const [rootCategoryName, platforms] of Object.entries(categoriesData)) {
            // The key in JSON is 'flipkart'
            const flipkartUrls = platforms.flipkart;

            if (!flipkartUrls || !Array.isArray(flipkartUrls)) {
                continue;
            }

            foundAny = true;
            console.log(`Found ${flipkartUrls.length} Flipkart URLs in '${rootCategoryName}'`);

            for (const item of flipkartUrls) {
                const targetUrl = item.url;

                for (const pincode of PINCODES) {
                    console.log(`Scraping URL: ${targetUrl} for pincode: ${pincode}`);

                    const payload = {
                        url: targetUrl,
                        platform: 'flipkartMinutes', // Assuming server expects this
                        pincode: pincode,
                        scrapedAt: SCRAPED_AT,
                        categoryName: item.name || rootCategoryName,
                        officialCategory: item.officialCategory || rootCategoryName,
                        officialSubCategory: item.officialSubCategory
                    };

                    try {
                        const response = await fetch(`${SERVER_URL}/scrape`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });

                        const text = await response.text();
                        try {
                            const data = JSON.parse(text);
                            console.log(`Status: ${response.status}`, data);
                        } catch (e) {
                            console.log(`Status: ${response.status} Response: ${text}`);
                        }

                    } catch (err) {
                        console.error(`Failed to scrape ${targetUrl}:`, err.message);
                    }
                }
            }
        }

        if (!foundAny) {
            console.error('No flipkart categories found in any root category.');
        }

    } catch (error) {
        console.error('Error in scraper script:', error);
    } finally {
        if (serverProcess && !externalServer) {
            console.log('Stopping server...');
            if (process.platform === 'win32') {
                spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
            } else {
                serverProcess.kill();
            }
        }
    }
}

runScraper();
