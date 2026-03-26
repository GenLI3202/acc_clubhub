
import fs from 'fs';
import path from 'path';

// Adjust path relative to where script is run (project root)
const contentDir = path.resolve('src/content');

// Mappings for standardization
const MAPPINGS = {
    // Media Types
    media: {
        field: 'type',
        map: {
            '翻山越岭': 'adventure',
            '影像': 'video',
            '访谈': 'interview',
            '图集': 'gallery',
            'Bergabenteuer': 'adventure',
            'Abenteuer': 'adventure',
            'Video': 'video',
            'Interview': 'interview',
            'Gallery': 'gallery',
            'Adventure': 'adventure'
        }
    },
    // Gear Categories
    gear: {
        field: 'category',
        map: {
            '单车组装': 'bike-build',
            '电子设备': 'electronics',
            '骑行服饰': 'apparel',
            '维修保养': 'maintenance',
            'Bike Build': 'bike-build',
            'Electronics': 'electronics',
            'Apparel': 'apparel',
            'Maintenance': 'maintenance'
        }
    },
    // Training Categories
    training: {
        field: 'category',
        map: {
            '体能训练': 'physical',
            '训练规划': 'planning',
            '健康恢复': 'wellness',
            '数据分析': 'analytics',
            'Physical': 'physical',
            'Planning': 'planning',
            'Wellness': 'wellness',
            'Analytics': 'analytics'
        }
    }
};

function processFile(filePath, collectionName) {
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Fix Collection-specific fields
    if (MAPPINGS[collectionName]) {
        const { field, map } = MAPPINGS[collectionName];
        const regex = new RegExp(`^${field}:\\s*(.+)$`, 'm');

        content = content.replace(regex, (match, value) => {
            const trimmed = value.trim();
            // If it's already a standard key (lowercase), leave it
            // Check if values in map include this key
            const isAlreadyStandard = Object.values(map).includes(trimmed);
            if (isAlreadyStandard) return match;

            const standardKey = map[trimmed] || map[trimmed.replace(/['"]/g, '')]; // Try removing quotes

            if (standardKey) {
                console.log(`[${collectionName}] ${path.basename(filePath)}: ${trimmed} -> ${standardKey}`);
                modified = true;
                return `${field}: ${standardKey}`;
            }
            return match;
        });
    }

    // 2. Standardize Authors (All collections)
    content = content.replace(/^author:\s*(.+)$/m, (match, value) => {
        const trimmed = value.trim();
        const slug = trimmed.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '');

        if (slug !== trimmed) {
            console.log(`[Author] ${path.basename(filePath)}: ${trimmed} -> ${slug}`);
            modified = true;
            return `author: ${slug}`;
        }
        return match;
    });

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

function traverse(dir, collectionName) {
    if (!fs.existsSync(dir)) {
        console.warn(`Directory not found: ${dir}`);
        return;
    }
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath, collectionName);
        } else if (file.endsWith('.md')) {
            processFile(fullPath, collectionName);
        }
    });
}

console.log('Starting Content Standardization...');
traverse(path.join(contentDir, 'media'), 'media');
traverse(path.join(contentDir, 'knowledge/gear'), 'gear'); // Corrected path
traverse(path.join(contentDir, 'knowledge/training'), 'training'); // Corrected path
console.log('Done.');
