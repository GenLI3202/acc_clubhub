
const fs = require('fs');
const path = require('path');

const directory = 'd:\\my_projects\\acc_clubhub\\frontend\\src\\content\\media';

const mappings = {
    '翻山越岭': 'adventure',
    '影像': 'video',
    '访谈': 'interview',
    '图集': 'gallery',
    'Bergabenteuer': 'adventure', // Guessing german
    'Abenteuer': 'adventure'
};

function processDir(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDir(fullPath);
        } else if (file.endsWith('.md')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Regex to find "type: value"
            content = content.replace(/^type:\s*(.+)$/m, (match, value) => {
                const trimmedValue = value.trim();
                const replacement = mappings[trimmedValue];
                if (replacement) {
                    console.log(`Replacing "${trimmedValue}" with "${replacement}" in ${fullPath}`);
                    modified = true;
                    return `type: ${replacement}`;
                }
                return match;
            });

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
            }
        }
    });
}

processDir(directory);
