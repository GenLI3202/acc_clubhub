/**
 * Search Index Generator
 * Phase 4.1: Global Search & Content Governance
 * 
 * Generiert statische JSON-Suchindizes für jede Sprache zur Build-Zeit.
 * Diese Indizes werden von Fuse.js für die clientseitige Suche verwendet.
 */

import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import type {
  SearchIndex,
  MediaSearchItem,
  GearSearchItem,
  TrainingSearchItem,
  RouteSearchItem,
  EventSearchItem,
  Language,
  AssetValidationResult
} from '../../types/search';

/**
 * Validiert Asset-Pfade gemäß Content Governance Guide
 * Prüft auf korrekte Namenskonventionen (kebab-case, Präfixe)
 */
function validateAssetPath(path: string, collection: string): AssetValidationResult {
  const result: AssetValidationResult = {
    valid: true,
    path,
    collection: collection as any,
    warnings: [],
    errors: []
  };

  if (!path) {
    return result; // Leere Pfade sind optional
  }

  const filename = path.split('/').pop() || '';
  
  // Erwartete Präfixe gemäß Governance Guide 1.2
  const validPrefixes: Record<string, string> = {
    media: 'media-',
    gear: 'gear-',
    training: 'train-',
    routes: 'route-',
    events: 'event-'
  };
  
  const expectedPrefix = validPrefixes[collection];
  
  // Prüfe Präfix
  if (expectedPrefix && !filename.startsWith(expectedPrefix)) {
    result.warnings.push(
      `Asset naming violation: ${filename} should start with ${expectedPrefix}`
    );
    result.valid = false;
  }
  
  // Prüfe auf verbotene Zeichen (Großbuchstaben, Leerzeichen, Klammern)
  if (/[A-Z\s()（）]/.test(filename)) {
    result.warnings.push(
      `Asset naming violation: ${filename} contains uppercase/spaces/parentheses`
    );
    result.valid = false;
  }
  
  // Prüfe auf chinesische Zeichen
  if (/[\u4e00-\u9fa5]/.test(filename)) {
    result.errors.push(
      `Asset naming violation: ${filename} contains Chinese characters`
    );
    result.valid = false;
  }
  
  return result;
}

/**
 * Generiert den Suchindex für eine bestimmte Sprache
 */
export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang as Language;
  
  if (!['de', 'en', 'zh'].includes(lang)) {
    return new Response(JSON.stringify({ error: 'Invalid language' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Sammle alle Collections für die angegebene Sprache
    const mediaCollection = await getCollection('media', ({ data }) => data.lang === lang);
    const gearCollection = await getCollection('gear', ({ data }) => data.lang === lang);
    const trainingCollection = await getCollection('training', ({ data }) => data.lang === lang);
    const routesCollection = await getCollection('routes', ({ data }) => data.lang === lang);
    const eventsCollection = await getCollection('events', ({ data }) => data.lang === lang);

    // Transformiere Media Items
    const mediaItems: MediaSearchItem[] = mediaCollection.map(item => {
      const validation = validateAssetPath(item.data.coverImage, 'media');
      if (!validation.valid) {
        console.warn(`[Search Index] Media item ${item.slug}:`, validation.warnings);
      }
      
      return {
        collection: 'media',
        slug: item.slug,
        title: item.data.title,
        description: item.data.description,
        type: item.data.type,
        tags: item.data.tags || [],
        date: item.data.date,
        coverImage: item.data.coverImage,
        lang
      };
    });

    // Transformiere Gear Items
    const gearItems: GearSearchItem[] = gearCollection.map(item => {
      if (item.data.coverImage) {
        const validation = validateAssetPath(item.data.coverImage, 'gear');
        if (!validation.valid) {
          console.warn(`[Search Index] Gear item ${item.slug}:`, validation.warnings);
        }
      }
      
      return {
        collection: 'gear',
        slug: item.slug,
        title: item.data.title,
        description: item.data.description,
        category: item.data.category,
        subcategory: item.data.subcategory,
        author: item.data.author,
        date: item.data.date,
        coverImage: item.data.coverImage,
        lang
      };
    });

    // Transformiere Training Items
    const trainingItems: TrainingSearchItem[] = trainingCollection.map(item => {
      if (item.data.coverImage) {
        const validation = validateAssetPath(item.data.coverImage, 'training');
        if (!validation.valid) {
          console.warn(`[Search Index] Training item ${item.slug}:`, validation.warnings);
        }
      }
      
      return {
        collection: 'training',
        slug: item.slug,
        title: item.data.title,
        description: item.data.description,
        category: item.data.category,
        tags: item.data.tags || [],
        author: item.data.author,
        date: item.data.date,
        coverImage: item.data.coverImage,
        lang
      };
    });

    // Transformiere Route Items
    const routeItems: RouteSearchItem[] = routesCollection.map(item => {
      if (item.data.coverImage) {
        const validation = validateAssetPath(item.data.coverImage, 'routes');
        if (!validation.valid) {
          console.warn(`[Search Index] Route item ${item.slug}:`, validation.warnings);
        }
      }
      
      return {
        collection: 'routes',
        slug: item.slug,
        name: item.data.name,
        description: item.data.description,
        region: item.data.region,
        difficulty: item.data.difficulty,
        distance: item.data.distance,
        elevation: item.data.elevation,
        surface: item.data.surface,
        gpxFile: item.data.gpxFile,
        coverImage: item.data.coverImage,
        lang
      };
    });

    // Transformiere Event Items
    const eventItems: EventSearchItem[] = eventsCollection.map(item => {
      if (item.data.coverImage) {
        const validation = validateAssetPath(item.data.coverImage, 'events');
        if (!validation.valid) {
          console.warn(`[Search Index] Event item ${item.slug}:`, validation.warnings);
        }
      }
      
      return {
        collection: 'events',
        slug: item.slug,
        title: item.data.title,
        description: item.data.description,
        location: item.data.location,
        date: item.data.date,
        eventType: item.data.eventType,
        coverImage: item.data.coverImage,
        lang
      };
    });

    // Erstelle den vollständigen Index
    const searchIndex: SearchIndex = {
      version: '1.0',
      generated: new Date().toISOString(),
      lang,
      collections: {
        media: mediaItems,
        gear: gearItems,
        training: trainingItems,
        routes: routeItems,
        events: eventItems
      }
    };

    // Statistiken für Logging
    const totalItems = 
      mediaItems.length + 
      gearItems.length + 
      trainingItems.length + 
      routeItems.length + 
      eventItems.length;

    console.log(`[Search Index] Generated index for ${lang}:`);
    console.log(`  - Media: ${mediaItems.length}`);
    console.log(`  - Gear: ${gearItems.length}`);
    console.log(`  - Training: ${trainingItems.length}`);
    console.log(`  - Routes: ${routeItems.length}`);
    console.log(`  - Events: ${eventItems.length}`);
    console.log(`  - Total: ${totalItems} items`);

    // Rückgabe als JSON
    return new Response(JSON.stringify(searchIndex, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // 1 Stunde Cache
      }
    });

  } catch (error) {
    console.error('[Search Index] Error generating index:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate search index',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * Definiert die statischen Pfade für alle unterstützten Sprachen
 */
export function getStaticPaths() {
  return [
    { params: { lang: 'de' } },
    { params: { lang: 'en' } },
    { params: { lang: 'zh' } }
  ];
}
