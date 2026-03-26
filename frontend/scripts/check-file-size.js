
const fs = require('fs');
const path = require('path');

const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const SEARCH_DIRS = [
    path.join(__dirname, '../public/images'),
    path.join(__dirname, '../src/content') // In case images are co-located
];

let hasError = false;

function scanDirectory(dir) {
    if (!fs.existsSync(dir)) {
        return;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            scanDirectory(filePath);
        } else {
            const ext = path.extname(file).toLowerCase();
            // Check for common image extensions
            if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) {
                if (stats.size > MAX_SIZE_BYTES) {
                    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                    console.error(`[ERROR] File too large: ${filePath}`);
                    console.error(`        Size: ${sizeMB} MB (Limit: ${MAX_SIZE_MB} MB)`);
                    hasError = true;
                }
            }
        }
    });
}

console.log(`Scanning for images larger than ${MAX_SIZE_MB} MB...`);
SEARCH_DIRS.forEach(dir => scanDirectory(dir));

if (hasError) {
    console.error('\n❌ Image size check failed. Please compress large images.');
    process.exit(1);
} else {
    console.log('\n✅ Image size check passed.');
    process.exit(0);
}
