/**
 * Content Migration Script
 * Phase 4.1: Migriert bestehende Content-Dateien zum neuen Schema
 * 
 * Führt folgende Änderungen durch:
 * 1. Fügt `lang` Feld basierend auf Verzeichnisstruktur hinzu
 * 2. Konvertiert chinesische `type` Werte zu englischen
 * 3. Benennt `cover` zu `coverImage` um
 * 4. Fügt fehlende Felder mit Standardwerten hinzu
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type Mapping: Chinesisch → Englisch
const TYPE_MAPPING = {
  '影像': 'video',
  '访谈': 'interview',
  '翻山越岭': 'adventure',
  '活动图集': 'gallery'
};

/**
 * Extrahiert Frontmatter aus Markdown-Datei
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  
  const [, frontmatter, body] = match;
  const data = {};
  
  frontmatter.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;
    
    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();
    
    // Entferne Anführungszeichen
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    
    data[key] = value;
  });
  
  return { data, body };
}

/**
 * Erstellt Frontmatter aus Daten-Objekt
 */
function stringifyFrontmatter(data) {
  const lines = Object.entries(data).map(([key, value]) => {
    if (typeof value === 'string' && (value.includes(':') || value.includes('#'))) {
      return `${key}: "${value}"`;
    }
    return `${key}: ${value}`;
  });
  return lines.join('\n');
}

/**
 * Migriert eine einzelne Datei
 */
function migrateFile(filePath, lang) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = parseFrontmatter(content);
  
  if (!parsed) {
    console.warn(`⚠️  Skipping ${filePath}: No frontmatter found`);
    return false;
  }
  
  const { data, body } = parsed;
  let modified = false;
  
  // 1. Füge lang hinzu
  if (!data.lang) {
    data.lang = lang;
    modified = true;
  }
  
  // 2. Konvertiere type
  if (data.type && TYPE_MAPPING[data.type]) {
    data.type = TYPE_MAPPING[data.type];
    modified = true;
  }
  
  // 3. Benenne cover zu coverImage um
  if (data.cover && !data.coverImage) {
    data.coverImage = data.cover;
    delete data.cover;
    modified = true;
  }
  
  // 4. Füge tags hinzu wenn nicht vorhanden (nur für media/training)
  if ((filePath.includes('/media/') || filePath.includes('/training/')) && !data.tags) {
    data.tags = '[]';
    modified = true;
  }
  
  // 5. Füge category hinzu wenn nicht vorhanden (gear/training)
  if (filePath.includes('/gear/') && !data.category) {
    data.category = 'bike-build';
    modified = true;
  }
  if (filePath.includes('/training/') && !data.category) {
    data.category = 'physical';
    modified = true;
  }
  
  // 6. Füge description hinzu wenn nicht vorhanden
  if (!data.description) {
    // Verwende ersten Satz des Body als Description
    const firstSentence = body.trim().split(/[.!?]/)[0];
    if (firstSentence) {
      data.description = firstSentence.trim();
      modified = true;
    }
  }
  
  if (modified) {
    const newContent = `---\n${stringifyFrontmatter(data)}\n---\n${body}`;
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return true;
  }
  
  return false;
}

/**
 * Migriert alle Dateien in einem Verzeichnis
 */
function migrateDirectory(dir, lang) {
  const files = fs.readdirSync(dir);
  let count = 0;
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      count += migrateDirectory(filePath, lang);
    } else if (file.endsWith('.md')) {
      if (migrateFile(filePath, lang)) {
        console.log(`✅ Migrated: ${filePath}`);
        count++;
      }
    }
  });
  
  return count;
}

/**
 * Hauptfunktion
 */
function main() {
  const contentDir = path.join(__dirname, '..', 'src', 'content');
  
  console.log('🚀 Starting content migration...\n');
  
  let totalMigrated = 0;
  
  // Migriere Media
  ['de', 'en', 'zh'].forEach(lang => {
    const mediaDir = path.join(contentDir, 'media', lang);
    if (fs.existsSync(mediaDir)) {
      console.log(`\n📁 Migrating media/${lang}...`);
      totalMigrated += migrateDirectory(mediaDir, lang);
    }
  });
  
  // Migriere Gear
  ['de', 'en', 'zh'].forEach(lang => {
    const gearDir = path.join(contentDir, 'knowledge', 'gear', lang);
    if (fs.existsSync(gearDir)) {
      console.log(`\n📁 Migrating knowledge/gear/${lang}...`);
      totalMigrated += migrateDirectory(gearDir, lang);
    }
  });
  
  // Migriere Training
  ['de', 'en', 'zh'].forEach(lang => {
    const trainingDir = path.join(contentDir, 'knowledge', 'training', lang);
    if (fs.existsSync(trainingDir)) {
      console.log(`\n📁 Migrating knowledge/training/${lang}...`);
      totalMigrated += migrateDirectory(trainingDir, lang);
    }
  });
  
  // Migriere Routes
  ['de', 'en', 'zh'].forEach(lang => {
    const routesDir = path.join(contentDir, 'routes', lang);
    if (fs.existsSync(routesDir)) {
      console.log(`\n📁 Migrating routes/${lang}...`);
      totalMigrated += migrateDirectory(routesDir, lang);
    }
  });
  
  console.log(`\n✨ Migration complete! ${totalMigrated} files updated.`);
}

main();
