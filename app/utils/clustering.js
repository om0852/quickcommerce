import { PLATFORMS } from '@/app/constants/platforms';

export function clusterSimilarProducts(products) {
    // Strip __category-suffix and trailing -a/b to get the canonical base ID
    const getBaseId = (productId) =>
        productId.split('__')[0].replace(/-[a-z]$/i, '');

    const n = products.length;

    // Union-Find to cluster products sharing the same (platform, baseId)
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (i) => {
        while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
        return i;
    };
    const union = (i, j) => {
        const pi = find(i), pj = find(j);
        if (pi !== pj) parent[pi] = pj;
    };

    // Map "platform:baseId" -> first index seen; union when same base ID found
    const baseIdMap = {};
    products.forEach((p, i) => {
        PLATFORMS.forEach(plat => {
            const pid = p[plat]?.productId;
            if (pid) {
                const key = `${plat}:${getBaseId(pid)}`;
                if (baseIdMap[key] !== undefined) {
                    union(i, baseIdMap[key]);
                } else {
                    baseIdMap[key] = i;
                }
            }
        });
    });

    // Group by Union-Find root
    const groups = {};
    products.forEach((p, i) => {
        const root = find(i);
        if (!groups[root]) groups[root] = [];
        groups[root].push(p);
    });

    const getPlatformCount = (p) => PLATFORMS.filter(plat => p[plat]).length;
    const getMinRank = (p) => {
        let min = Infinity;
        PLATFORMS.forEach(key => {
            if (p[key]?.ranking !== undefined && p[key]?.ranking !== null) {
                const num = Number(p[key].ranking);
                if (!isNaN(num) && num < min) min = num;
            }
        });
        return min;
    };

    const deduplicatedResult = [];
    Object.values(groups).forEach(group => {
        if (group.length === 1) {
            deduplicatedResult.push(group[0]);
            return;
        }

        // Criteria: 0. isHeader, 1. !isDuplicate, 2. Most platforms, 3. Lowest rank
        let bestRow = group[0];
        let maxPlatforms = getPlatformCount(group[0]);
        let minRank = getMinRank(group[0]);

        for (let i = 1; i < group.length; i++) {
            const row = group[i];

            // 0. isHeader takes absolute precedence
            if (bestRow.isHeader && !row.isHeader) continue;
            if (row.isHeader && !bestRow.isHeader) {
                bestRow = row;
                maxPlatforms = getPlatformCount(row);
                minRank = getMinRank(row);
                continue;
            }

            // 1. !isDuplicate takes precedence over isDuplicate (master group vs standalone)
            if (!bestRow.isDuplicate && row.isDuplicate) continue;
            if (!row.isDuplicate && bestRow.isDuplicate) {
                bestRow = row;
                maxPlatforms = getPlatformCount(row);
                minRank = getMinRank(row);
                continue;
            }

            const platforms = getPlatformCount(row);
            const rank = getMinRank(row);

            if (platforms > maxPlatforms) {
                maxPlatforms = platforms;
                minRank = rank;
                bestRow = row;
            } else if (platforms === maxPlatforms && rank < minRank) {
                minRank = rank;
                bestRow = row;
            }
        }

        deduplicatedResult.push(bestRow);
    });

    return deduplicatedResult;
}
