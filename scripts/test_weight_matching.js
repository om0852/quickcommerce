
// Import logic (we'll copy-paste or import if possible, but copy-paste is safer for standalone test without modifying export)
// Actually we can import the module if it's .mjs

import { mergeProductsAcrossPlatforms } from './temp_productMatching.mjs';

// We need to access weightsMatch which is internal. 
// For testing, I'll copy the logic here to verify my meaningful changes, 
// OR I can test via mergeProductsAcrossPlatforms by mocking products.

// Let's modify the file to export weightsMatch for testing if possible, 
// OR just copy the function here to reproduce the regex issue.

const normalizeWeight = (weight) => {
    if (!weight) return '';
    let w = String(weight).toLowerCase();

    // transform "pack of N" to "xN"
    w = w.replace(/pack\s+of\s+(\d+)/g, 'x$1');

    return w.replace(/\s+/g, '')
        .replace(/pack/g, '')
        .replace(/\(|\)/g, '')
        // Standardize units
        .replace('ltr', 'l')
        .replace('litre', 'l')
        .replace('litres', 'l')
        .replace('gms', 'g')
        .replace('gm', 'g')
        .replace('kgs', 'kg');
};

const weightsMatch = (weight1, weight2) => {
    // RELAXED: If weight is missing in either, assume compatibility to rely on name matching
    if (!weight1 || !weight2) return true;

    // If both exist, we check strictness
    const w1 = normalizeWeight(weight1);
    const w2 = normalizeWeight(weight2);

    if (w1 === w2) return true;

    const parseWeight = (w) => {
        // Special handle for "NxWeight" format (e.g. 3x100g)
        const multMatch = w.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)([a-z]+)(.*)$/);
        if (multMatch) {
            let count = parseFloat(multMatch[1]);
            let baseVal = parseFloat(multMatch[2]);
            let unit = multMatch[3];
            // multiply
            return { val: count * baseVal, unit };
        }

        // Capture value, unit, and any trailing chars (extra)
        const match = w.match(/^(\d+(?:\.\d+)?)([a-z]+)(.*)$/);
        if (match) {
            let val = parseFloat(match[1]);
            let unit = match[2];
            let extra = match[3];

            // Check for multiplier in 'extra' part
            // e.g. "x3", "*3"
            const mult = extra.match(/[\*x](\d+)/);
            if (mult) {
                val *= parseInt(mult[1]);
            }
            return { val, unit };
        }
        return null;
    };

    const p1 = parseWeight(w1);
    const p2 = parseWeight(w2);

    if (p1 && p2) {
        if (p1.unit === p2.unit) return Math.abs(p1.val - p2.val) < 0.1; // Allow small float diff
        if (p1.unit === 'kg' && p2.unit === 'g') return Math.abs(p1.val * 1000 - p2.val) < 0.1;
        if (p1.unit === 'g' && p2.unit === 'kg') return Math.abs(p1.val - p2.val * 1000) < 0.1;
        if (p1.unit === 'l' && p2.unit === 'ml') return Math.abs(p1.val * 1000 - p2.val) < 0.1;
        if (p1.unit === 'ml' && p2.unit === 'l') return Math.abs(p1.val - p2.val * 1000) < 0.1;
    }

    return false;
};


// Test Cases
const cases = [
    { w1: '1000g', w2: '1 kg', expected: true },
    { w1: '1000g', w2: '1 kg x 3', expected: false },
    { w1: '1 kg', w2: '1 kg x 3', expected: false },
    { w1: '500 ml', w2: '0.5 l', expected: true },
    { w1: '200g', w2: '200g Pack of 2', expected: false },
    { w1: '300g', w2: '3 x 100g', expected: true },
    { w1: '1 l', w2: '2 x 500 ml', expected: true }
];

console.log('--- Testing Current Logic ---');
let failures = 0;
for (const c of cases) {
    const result = weightsMatch(c.w1, c.w2);
    const pass = result === c.expected;
    console.log(`'${c.w1}' vs '${c.w2}' -> Got: ${result}, Expected: ${c.expected} [${pass ? 'PASS' : 'FAIL'}]`);
    if (!pass) failures++;
}

if (failures > 0) {
    console.log(`\n❌ Found ${failures} failures. Logic needs fixing.`);
} else {
    console.log('\n✅ All tests passed (Logic is already correct? Check expectations).');
}
