# Phase 4.1: Globales Such- und Filtersystem — Detaillierter Implementierungsplan

> **Version**: 1.0
> **Erstellt**: 2026-01-29
> **Status**: Bereit zur Implementierung
> **Abhängigkeiten**: Layer 3 (CMS + i18n) ✅
> **Geschätzte Dauer**: 2 Wochen

---

## 📋 Inhaltsverzeichnis

1. [Executive Summary](#executive-summary)
2. [Architektur-Übersicht](#architektur-übersicht)
3. [Content-Governance-Integration](#content-governance-integration)
4. [Technische Spezifikationen](#technische-spezifikationen)
5. [Implementierungs-Roadmap](#implementierungs-roadmap)
6. [Qualitätssicherung](#qualitätssicherung)
7. [Deployment-Strategie](#deployment-strategie)

---

## Executive Summary

### Ziele

Phase 4.1 implementiert ein **vollständig clientseitiges Such- und Filtersystem**, das:

1. **Globale Suche**: Durchsucht alle fünf Content-Bereiche (Media, Gear, Training, Routes, Events) mit Fuzzy-Matching
2. **Kontextuelle Filter**: Bietet bereichsspezifische Filteroptionen (z.B. Schwierigkeitsgrad für Routen)
3. **URL-Persistenz**: Speichert Filterzustände in URL-Parametern für Teilbarkeit
4. **Performance**: Lädt in <100ms durch statische Index-Generierung zur Build-Zeit

### Nicht-Ziele (Out of Scope)

- ❌ Server-seitige Suche oder Datenbank-Queries
- ❌ Volltextsuche in Markdown-Inhalten (nur Metadaten)
- ❌ Benutzer-spezifische Suchhistorie (benötigt Auth aus Phase 4.4)
- ❌ Erweiterte Suchoperatoren (AND/OR/NOT)

### Erfolgskriterien

| Kriterium                     | Messgröße         | Zielwert                                   |
| ----------------------------- | ------------------- | ------------------------------------------ |
| **Suchgeschwindigkeit** | Time to Interactive | < 100ms                                    |
| **Index-Größe**       | JSON Payload        | < 200KB (gzipped)                          |
| **Mobile UX**           | Lighthouse Score    | ≥ 90                                      |
| **Accessibility**       | WCAG Level          | AA                                         |
| **Browser-Support**     | Coverage            | Chrome/Firefox/Safari (letzte 2 Versionen) |

---

## Architektur-Übersicht

### System-Diagramm

```mermaid
graph TB
    subgraph "Build Time (Astro SSG)"
        A[Content Collections] --> B[Search Index Generator]
        B --> C[/api/search-index.json]
        C --> D[Static Site Output]
    end
  
    subgraph "Runtime (Client)"
        D --> E[Browser]
        E --> F[Fuse.js Engine]
        F --> G[SearchBar Component]
        F --> H[FilterPanel Component]
  
        G --> I[Search Results Dropdown]
        H --> J[Filtered Content Grid]
  
        K[URL State Manager] --> H
        H --> K
    end
  
    style C fill:#e1f5ff
    style F fill:#fff4e1
    style K fill:#ffe1f5
```

### Datenfluss

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. BUILD PHASE                                                  │
├─────────────────────────────────────────────────────────────────┤
│ Astro Content Collections API                                   │
│   ↓                                                             │
│ getCollection('media', 'gear', 'training', 'routes', 'events')  │
│   ↓                                                             │
│ Transform to Search Index Schema                                │
│   ↓                                                             │
│ Generate /api/search-index.json (per language)                  │
│   - /api/search-index.de.json                                   │
│   - /api/search-index.en.json                                   │
│   - /api/search-index.zh.json                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 2. RUNTIME PHASE                                                │
├─────────────────────────────────────────────────────────────────┤
│ User opens page                                                 │
│   ↓                                                             │
│ Lazy load search-index.{lang}.json (on first search)            │
│   ↓                                                             │
│ Initialize Fuse.js with index                                   │
│   ↓                                                             │
│ User types query → Fuse.search() → Render results               │
│                                                                 │
│ User selects filter → Update URL → Re-filter local data         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Content-Governance-Integration

### 1. Suchindex-Schema (gemäß Taxonomie)

Der generierte Suchindex muss die in `content_governance_guide_phase4_1_guide.md` definierten Taxonomien widerspiegeln:

#### Media (车影骑踪)

```typescript
interface MediaSearchItem {
  collection: 'media';
  slug: string;
  title: string;
  description: string;
  type: 'video' | 'interview' | 'adventure' | 'gallery'; // Format Type
  tags: string[]; // ['social-ride', 'alps', '2025']
  date: string; // ISO 8601
  lang: 'de' | 'en' | 'zh';
  coverImage: string; // Für Vorschau
}
```

#### Gear (器械知识)

```typescript
interface GearSearchItem {
  collection: 'gear';
  slug: string;
  title: string;
  description: string;
  category: 'bike-build' | 'electronics' | 'apparel' | 'maintenance';
  subcategory?: string; // z.B. 'frames', 'power', 'helmet'
  author: string;
  date: string;
  lang: 'de' | 'en' | 'zh';
}
```

#### Training (科学训练)

```typescript
interface TrainingSearchItem {
  collection: 'training';
  slug: string;
  title: string;
  description: string;
  category: 'physical' | 'planning' | 'wellness' | 'analytics';
  tags: string[]; // ['Endurance', 'FTP', 'Recovery']
  author: string;
  date: string;
  lang: 'de' | 'en' | 'zh';
}
```

#### Routes (骑行路线)

```typescript
interface RouteSearchItem {
  collection: 'routes';
  slug: string;
  name: string;
  description: string;
  region: 'munich-south' | 'munich-north' | 'alps-bavaria' | 'alps-austria' | 'alps-italy' | 'island-spain';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  distance: number; // km
  elevation: number; // m
  surface: 'tarmac' | 'gravel' | 'mixed';
  lang: 'de' | 'en' | 'zh';
  gpxFile?: string;
}
```

#### Events (慕城日常)

```typescript
interface EventSearchItem {
  collection: 'events';
  slug: string;
  title: string;
  description: string;
  location: string;
  date: string; // ISO 8601
  eventType: 'social-ride' | 'training-camp' | 'race' | 'workshop';
  lang: 'de' | 'en' | 'zh';
}
```

### 2. CMS-Konfiguration Updates

Um die Taxonomie zu unterstützen, müssen folgende Änderungen an `frontend/public/admin/config.yml` vorgenommen werden:

#### 2.1 Media Collection

```yaml
- name: media
  label: "车影骑踪 / Media"
  folder: "src/content/media/{{lang}}"
  create: true
  fields:
    - { label: "Type", name: "type", widget: "select", 
        options: ["video", "interview", "adventure", "gallery"],
        hint: "影像作品/骑友访谈/翻山越岭/活动图集" }
    - { label: "Tags", name: "tags", widget: "list", 
        hint: "例如: social-ride, alps, 2025" }
```

#### 2.2 Gear Collection

```yaml
- name: gear
  label: "器械知识 / Gear"
  folder: "src/content/knowledge/gear/{{lang}}"
  create: true
  fields:
    - { label: "Category", name: "category", widget: "select",
        options: ["bike-build", "electronics", "apparel", "maintenance"],
        hint: "单车选购与组装/电子与穿戴/人身装备/维修保养" }
    - { label: "Subcategory", name: "subcategory", widget: "string",
        required: false,
        hint: "例如: frames, power, helmet, tools" }
```

#### 2.3 Training Collection

```yaml
- name: training
  label: "科学训练 / Training"
  folder: "src/content/knowledge/training/{{lang}}"
  create: true
  fields:
    - { label: "Category", name: "category", widget: "select",
        options: ["physical", "planning", "wellness", "analytics"],
        hint: "体能训练/训练计划/营养与健康/数据分析" }
    - { label: "Tags", name: "tags", widget: "list",
        hint: "例如: Endurance, FTP, Recovery" }
```

#### 2.4 Routes Collection

```yaml
- name: routes
  label: "骑行路线 / Routes"
  folder: "src/content/routes/{{lang}}"
  create: true
  fields:
    - { label: "Region", name: "region", widget: "select", required: true,
        options: ["munich-south", "munich-north", "alps-bavaria", "alps-austria", "alps-italy", "island-spain"],
        hint: "慕尼黑南郊/北郊/巴伐利亚阿尔卑斯/奥地利阿尔卑斯/意大利多洛米蒂/西班牙海岛" }
    - { label: "Difficulty", name: "difficulty", widget: "select", required: true,
        options: ["easy", "medium", "hard", "expert"],
        hint: "🟢 Easy (<60km, <400m) | 🟡 Medium (60-100km, 400-1000m) | 🟠 Hard (100-150km, 1000-2000m) | 🔴 Expert (>150km, >2000m)" }
    - { label: "Distance (km)", name: "distance", widget: "number", value_type: "float" }
    - { label: "Elevation (m)", name: "elevation", widget: "number", value_type: "int" }
    - { label: "Surface", name: "surface", widget: "select",
        options: ["tarmac", "gravel", "mixed"],
        default: "tarmac" }
```

### 3. Asset-Naming-Validierung

Obwohl Phase 4.1 primär auf Suche/Filter fokussiert ist, sollten wir sicherstellen, dass die Bildpfade im Suchindex den Namenskonventionen entsprechen:

```typescript
// Validierungsfunktion für Build-Zeit
function validateAssetPath(path: string, collection: string): boolean {
  const validPrefixes = {
    media: 'media-',
    gear: 'gear-',
    training: 'train-',
    routes: 'route-',
    events: 'event-'
  };
  
  const filename = path.split('/').pop() || '';
  const expectedPrefix = validPrefixes[collection];
  
  if (!filename.startsWith(expectedPrefix)) {
    console.warn(`⚠️ Asset naming violation: ${path} should start with ${expectedPrefix}`);
    return false;
  }
  
  // Prüfe auf verbotene Zeichen
  if (/[A-Z\s()（）]/.test(filename)) {
    console.warn(`⚠️ Asset naming violation: ${path} contains uppercase/spaces/parentheses`);
    return false;
  }
  
  return true;
}
```

---

## Technische Spezifikationen

### 1. Abhängigkeiten

#### Frontend Dependencies

```json
{
  "dependencies": {
    "fuse.js": "^7.0.0"
  },
  "devDependencies": {
    "@types/fuse.js": "^7.0.0"
  }
}
```

#### Fuse.js Konfiguration

```typescript
// src/lib/search/fuseConfig.ts
import type Fuse from 'fuse.js';

export const fuseOptions: Fuse.IFuseOptions<any> = {
  keys: [
    { name: 'title', weight: 0.7 },
    { name: 'description', weight: 0.3 },
    { name: 'tags', weight: 0.2 }
  ],
  threshold: 0.4, // 0 = perfekte Übereinstimmung, 1 = alles matcht
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
  includeMatches: true, // Für Highlighting
  useExtendedSearch: false
};
```

### 2. Dateistruktur

```
frontend/src/
├── components/
│   ├── search/
│   │   ├── SearchBar.tsx              # Globale Suchleiste (Header)
│   │   ├── SearchResults.tsx          # Dropdown mit Ergebnissen
│   │   ├── SearchResultItem.tsx       # Einzelnes Suchergebnis
│   │   └── SearchHighlight.tsx        # Text-Highlighting-Komponente
│   └── filter/
│       ├── FilterPanel.tsx            # Generisches Filter-Panel
│       ├── FilterCheckbox.tsx         # Checkbox-Gruppe
│       ├── FilterRange.tsx            # Range-Slider (Distanz/Elevation)
│       ├── FilterChip.tsx             # Aktive Filter-Tags
│       └── FilterButton.tsx           # Mobile Filter-Toggle
├── lib/
│   ├── search/
│   │   ├── fuseConfig.ts              # Fuse.js Optionen
│   │   ├── searchIndex.ts             # Index-Loader & Cache
│   │   └── searchUtils.ts             # Hilfsfunktionen
│   └── filter/
│       ├── filterState.ts             # URL-State-Management
│       ├── filterUtils.ts             # Filter-Logik
│       └── filterConfig.ts            # Filter-Definitionen pro Collection
└── pages/
    └── api/
        └── search-index.[lang].json.ts # Statischer Index-Generator
```

### 3. API-Endpunkte (Statisch)

#### `/api/search-index.de.json`

```json
{
  "version": "1.0",
  "generated": "2026-01-29T10:00:00Z",
  "lang": "de",
  "collections": {
    "media": [
      {
        "collection": "media",
        "slug": "alps-summer-2025",
        "title": "Alpen Sommer Tour 2025",
        "description": "Unsere epische 7-Tage-Tour durch die Alpen...",
        "type": "adventure",
        "tags": ["alps", "2025", "multi-day"],
        "date": "2025-08-15",
        "coverImage": "/images/uploads/media-alps-2025-cover.webp"
      }
    ],
    "gear": [...],
    "training": [...],
    "routes": [...],
    "events": [...]
  }
}
```

### 4. Komponenten-Spezifikationen

#### 4.1 SearchBar.tsx

**Props:**

```typescript
interface SearchBarProps {
  lang: 'de' | 'en' | 'zh';
  placeholder?: string;
  minChars?: number; // Default: 2
}
```

**Verhalten:**

- Lazy-Load des Suchindex beim ersten Fokus
- Debounce von 300ms
- Zeigt max. 10 Ergebnisse pro Collection
- Keyboard-Navigation: ↑/↓ (Navigation), Enter (Öffnen), Esc (Schließen)
- Click-outside schließt Dropdown

**Accessibility:**

- `role="combobox"`
- `aria-expanded`, `aria-controls`
- `aria-activedescendant` für Keyboard-Navigation

#### 4.2 FilterPanel.tsx

**Props:**

```typescript
interface FilterPanelProps {
  collection: 'media' | 'gear' | 'training' | 'routes' | 'events';
  lang: 'de' | 'en' | 'zh';
  initialFilters?: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

interface FilterState {
  [key: string]: string | string[] | number | [number, number];
}
```

**Beispiel für Routes:**

```typescript
const routeFilters: FilterState = {
  difficulty: ['easy', 'medium'], // Multi-select
  region: ['munich-south'],
  distance: [0, 150], // Range
  elevation: [0, 2000]
};
```

**Verhalten:**

- Synchronisiert mit URL-Parametern
- Zeigt Anzahl der gefilterten Ergebnisse
- "Filter zurücksetzen"-Button
- Mobile: Collapsible Panel

#### 4.3 FilterRange.tsx

**Props:**

```typescript
interface FilterRangeProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  unit?: string; // 'km', 'm'
  onChange: (value: [number, number]) => void;
}
```

**UI:**

- Dual-thumb Range Slider
- Zeigt aktuelle Werte: "50 - 120 km"
- Responsive Touch-Targets (min. 44x44px)

### 5. URL-State-Management

#### Beispiel-URLs

```
# Routen: Schwierigkeitsgrad + Region
/de/routes?difficulty=easy,medium&region=munich-south

# Media: Typ + Jahr
/de/media?type=adventure&year=2025

# Gear: Kategorie + Autor
/de/knowledge/gear?category=bike-build&author=tom-mueller

# Suche (global)
/de/search?q=alpen+tour
```

#### Implementation

```typescript
// src/lib/filter/filterState.ts
import { useEffect, useState } from 'preact/hooks';

export function useFilterState(initialState: FilterState) {
  const [filters, setFilters] = useState<FilterState>(initialState);

  // Lese URL-Parameter beim Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlFilters: FilterState = {};
  
    params.forEach((value, key) => {
      if (value.includes(',')) {
        urlFilters[key] = value.split(',');
      } else {
        urlFilters[key] = value;
      }
    });
  
    setFilters({ ...initialState, ...urlFilters });
  }, []);

  // Schreibe URL-Parameter bei Änderung
  useEffect(() => {
    const params = new URLSearchParams();
  
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        params.set(key, value.join(','));
      } else if (value) {
        params.set(key, String(value));
      }
    });
  
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [filters]);

  return [filters, setFilters] as const;
}
```

---

## Implementierungs-Roadmap

### Sprint 1: Fundament (Tage 1-3)

#### Tag 1: Suchindex-Generator

**Aufgaben:**

1. [ ] `src/pages/api/search-index.[lang].json.ts` erstellen
2. [ ] Schema-Typen definieren (`src/types/search.ts`)
3. [ ] Content Collections abfragen und transformieren
4. [ ] Asset-Pfad-Validierung integrieren
5. [ ] Build-Test: Index-Dateien generieren

**Akzeptanzkriterien:**

- ✅ `/api/search-index.de.json` wird generiert
- ✅ Alle 5 Collections sind enthalten
- ✅ Index-Größe < 200KB (gzipped)
- ✅ Keine Build-Fehler

**Deliverables:**

- `src/pages/api/search-index.[lang].json.ts`
- `src/types/search.ts`

#### Tag 2: Basis-Komponenten (Optimized)

**Refinements based on Debugging:**

- **Robustness**: Error Boundary für leere/fehlerhafte Indizes.
- **Date Safety**: Sicherstellen, dass String-Dates nicht zum Crash führen.
- **Config**: `ignoreLocation: true` für bessere Description-Matches.

**Aufgaben:**

1. [ ] Dependencies installieren: `npm install fuse.js @types/fuse.js`
2. [ ] `src/lib/search/fuseConfig.ts` erstellen
    - Weighting: Title (0.7), Description (0.3), Tags (0.2)
    - Settings: `ignoreLocation: true`, `threshold: 0.4`
3. [ ] `src/lib/search/searchIndex.ts` (Smart Loader)
    - **Singleton Pattern**: Verhindert doppelte Fetches
    - **Error Boundary**: Gibt leeres Objekt zurück statt zu crashen, wenn JSON invalid ist
    - **Type Guard**: `isValidSearchIndex()` Check
4. [ ] `SearchBar.tsx` Grundgerüst
    - Lazy Load `onFocus`
    - Debounce 300ms
    - Graceful handling von leerem Index

**Akzeptanzkriterien:**

- ✅ Fuse.js initialisiert ohne Fehler (auch bei leerem Index)
- ✅ Network Tab zeigt nur 1x Request für `search-index.json`
- ✅ Keine `TypeError` bei Datums-Verarbeitung
- ✅ Suche in "Description" funktioniert zuverlässig

**Deliverables:**

- `src/components/search/SearchBar.tsx`
- `src/lib/search/fuseConfig.ts`
- `src/lib/search/searchIndex.ts`

#### Tag 3: Filter-Infrastruktur

**Aufgaben:**

1. [ ] `src/lib/filter/filterState.ts` (URL-Sync)
2. [ ] `src/lib/filter/filterConfig.ts` (Collection-Definitionen)
3. [ ] `FilterPanel.tsx` Grundgerüst
4. [ ] `FilterCheckbox.tsx` Komponente
5. [ ] Unit-Tests für URL-State-Management

**Akzeptanzkriterien:**

- ✅ URL-Parameter werden korrekt gelesen/geschrieben
- ✅ Browser-Back-Button funktioniert
- ✅ Filter-State persistiert bei Reload

**Deliverables:**

- `src/components/filter/FilterPanel.tsx`
- `src/lib/filter/*`

---

### Sprint 2: UI & Integration (Tage 4-7)

#### Tag 4: SearchBar UI-Polishing

**Aufgaben:**

1. [ ] `SearchResults.tsx` Dropdown-Komponente
2. [ ] `SearchResultItem.tsx` mit Icon-Badges
3. [ ] `SearchHighlight.tsx` für Match-Highlighting
4. [ ] Keyboard-Navigation implementieren
5. [ ] Mobile-Responsive-Design

**Akzeptanzkriterien:**

- ✅ Dropdown zeigt gruppierte Ergebnisse (nach Collection)
- ✅ Suchbegriffe sind highlighted
- ✅ Keyboard-Navigation funktioniert
- ✅ Mobile: Fullscreen-Overlay

**Deliverables:**

- `src/components/search/SearchResults.tsx`
- `src/components/search/SearchResultItem.tsx`
- `src/components/search/SearchHighlight.tsx`

#### Tag 5: Filter-Komponenten

**Aufgaben:**

1. [ ] `FilterRange.tsx` (Dual-Slider)
2. [ ] `FilterChip.tsx` (Aktive Filter)
3. [ ] `FilterButton.tsx` (Mobile Toggle)
4. [ ] Filter-Panel-Styling (Desktop/Mobile)

**Akzeptanzkriterien:**

- ✅ Range-Slider funktioniert auf Touch-Geräten
- ✅ Aktive Filter sind als Chips sichtbar
- ✅ Mobile: Filter-Panel ist collapsible

**Deliverables:**

- `src/components/filter/FilterRange.tsx`
- `src/components/filter/FilterChip.tsx`
- `src/components/filter/FilterButton.tsx`

#### Tag 6-7: Collection-Integration

**Aufgaben:**

1. [ ] `[lang]/media/index.astro` aktualisieren
    - SearchBar in Header integrieren
    - FilterPanel hinzufügen (Type, Tags, Date)
2. [ ] `[lang]/knowledge/gear/index.astro` aktualisieren
    - FilterPanel (Category, Subcategory, Author)
3. [ ] `[lang]/knowledge/training/index.astro` aktualisieren
    - FilterPanel (Category, Tags, Author)
4. [ ] `[lang]/routes/index.astro` aktualisieren
    - FilterPanel (Difficulty, Region, Distance, Elevation, Surface)
5. [ ] `[lang]/events/index.astro` aktualisieren
    - FilterPanel (Date Range, Event Type)

**Akzeptanzkriterien:**

- ✅ Alle 5 Collection-Seiten haben funktionale Filter
- ✅ Filter-State wird in URL reflektiert
- ✅ Gefilterte Ergebnisse werden korrekt angezeigt

**Deliverables:**

- Aktualisierte Collection-Index-Seiten

---

### Sprint 3: Testing & Optimierung (Tage 8-10)

#### Tag 8: E2E-Tests

**Aufgaben:**

1. [ ] Playwright-Tests für Suche schreiben
    - Globale Suche öffnen
    - Query eingeben
    - Ergebnis anklicken
2. [ ] Playwright-Tests für Filter
    - Filter auswählen
    - URL-Parameter prüfen
    - Ergebnisse validieren
3. [ ] Mobile-Tests (Viewport 375px)

**Akzeptanzkriterien:**

- ✅ Alle E2E-Tests bestehen
- ✅ Mobile-Tests bestehen

**Deliverables:**

- `e2e/search.spec.ts`
- `e2e/filter.spec.ts`

#### Tag 9: Performance-Optimierung

**Aufgaben:**

1. [ ] Lighthouse-Audit durchführen
2. [ ] Code-Splitting für Fuse.js (Dynamic Import)
3. [ ] Suchindex-Kompression prüfen
4. [ ] Lazy-Loading für Filter-Komponenten
5. [ ] Bundle-Size-Analyse

**Akzeptanzkriterien:**

- ✅ Lighthouse Performance Score ≥ 90
- ✅ First Contentful Paint < 1.5s
- ✅ Time to Interactive < 3s
- ✅ Bundle-Size-Increase < 50KB

**Deliverables:**

- Performance-Report
- Optimierte Komponenten

#### Tag 10: Accessibility-Audit

**Aufgaben:**

1. [ ] WAVE-Tool-Audit
2. [ ] Keyboard-Navigation testen (Tab, Enter, Esc)
3. [ ] Screen-Reader-Test (NVDA/VoiceOver)
4. [ ] Farbkontrast prüfen (WCAG AA)
5. [ ] ARIA-Attribute validieren

**Akzeptanzkriterien:**

- ✅ Keine WAVE-Fehler
- ✅ Alle interaktiven Elemente per Keyboard erreichbar
- ✅ Screen-Reader liest Inhalte korrekt vor
- ✅ Farbkontrast ≥ 4.5:1

**Deliverables:**

- Accessibility-Report
- Behobene A11y-Issues

---

## Qualitätssicherung

### 1. Unit-Tests

**Test-Framework:** Vitest (bereits konfiguriert)

**Test-Coverage-Ziele:**

- `src/lib/search/*`: 80%
- `src/lib/filter/*`: 80%
- Komponenten: 60% (UI-Tests sind teuer)

**Beispiel-Tests:**

```typescript
// src/lib/search/__tests__/searchIndex.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadSearchIndex, searchContent } from '../searchIndex';

describe('Search Index', () => {
  beforeEach(() => {
    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ collections: { media: [] } })
      })
    );
  });

  it('should load index only once', async () => {
    await loadSearchIndex('de');
    await loadSearchIndex('de');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should return search results', async () => {
    const results = await searchContent('alpen', 'de');
    expect(results).toBeInstanceOf(Array);
  });
});
```

### 2. E2E-Tests

**Test-Szenarien:**

```typescript
// e2e/search.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Global Search', () => {
  test('should open search dropdown on focus', async ({ page }) => {
    await page.goto('/de');
    await page.click('[data-testid="search-bar"]');
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test('should display results for query', async ({ page }) => {
    await page.goto('/de');
    await page.fill('[data-testid="search-bar"]', 'alpen');
    await page.waitForTimeout(500); // Debounce
    const results = page.locator('[data-testid="search-result-item"]');
    await expect(results).toHaveCount.greaterThan(0);
  });

  test('should navigate with keyboard', async ({ page }) => {
    await page.goto('/de');
    await page.fill('[data-testid="search-bar"]', 'tour');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/(media|routes|events)\//);
  });
});
```

```typescript
// e2e/filter.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Route Filters', () => {
  test('should filter by difficulty', async ({ page }) => {
    await page.goto('/de/routes');
    await page.check('[data-filter="difficulty"][value="easy"]');
    await expect(page).toHaveURL(/difficulty=easy/);
  
    const cards = page.locator('[data-testid="route-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should persist filters on reload', async ({ page }) => {
    await page.goto('/de/routes?difficulty=hard&region=alps-bavaria');
    await page.reload();
  
    const difficultyCheckbox = page.locator('[data-filter="difficulty"][value="hard"]');
    await expect(difficultyCheckbox).toBeChecked();
  });

  test('should clear all filters', async ({ page }) => {
    await page.goto('/de/routes?difficulty=easy,medium');
    await page.click('[data-testid="clear-filters"]');
    await expect(page).toHaveURL('/de/routes');
  });
});
```

### 3. Manuelle Test-Checkliste

**Desktop (Chrome/Firefox/Safari):**

- [ ] Globale Suche öffnet sich bei Klick
- [ ] Suchergebnisse erscheinen nach Eingabe
- [ ] Klick auf Ergebnis navigiert zur richtigen Seite
- [ ] Filter können ausgewählt werden
- [ ] URL aktualisiert sich bei Filter-Änderung
- [ ] Browser-Back-Button funktioniert
- [ ] Filter-Chips können entfernt werden
- [ ] "Alle Filter zurücksetzen" funktioniert

**Mobile (375px, 768px):**

- [ ] Suchleiste ist gut erreichbar
- [ ] Filter-Panel ist collapsible
- [ ] Touch-Slider funktionieren
- [ ] Keine horizontalen Scrollbars
- [ ] Buttons haben min. 44x44px Touch-Target

**Accessibility:**

- [ ] Tab-Navigation funktioniert
- [ ] Screen-Reader liest Labels vor
- [ ] Fokus-Indikatoren sind sichtbar
- [ ] Farbkontrast ist ausreichend

---

## Deployment-Strategie

### 1. Feature-Flag-Ansatz

Da Phase 4.1 ein großes Feature ist, empfehlen wir einen schrittweisen Rollout:

```typescript
// src/lib/featureFlags.ts
export const FEATURES = {
  GLOBAL_SEARCH: import.meta.env.PUBLIC_ENABLE_SEARCH === 'true',
  ADVANCED_FILTERS: import.meta.env.PUBLIC_ENABLE_FILTERS === 'true'
};
```

```astro
<!-- src/components/Header.astro -->
---
import { FEATURES } from '@/lib/featureFlags';
import SearchBar from '@/components/search/SearchBar';
---

{FEATURES.GLOBAL_SEARCH && (
  <SearchBar lang={lang} client:load />
)}
```

### 2. Deployment-Phasen

#### Phase A: Staging-Deployment (Tag 8)

- Deploy auf Vercel Preview Branch
- Interne Tests mit Team
- Performance-Monitoring aktivieren

#### Phase B: Beta-Rollout (Tag 9)

- Feature-Flag aktivieren für 10% der Nutzer
- Monitoring: Fehlerrate, Performance-Metriken
- Feedback sammeln

#### Phase C: Full-Rollout (Tag 10)

- Feature-Flag auf 100% setzen
- Dokumentation aktualisieren
- Ankündigung im Club

### 3. Rollback-Plan

Falls kritische Bugs auftreten:

```bash
# Option 1: Feature-Flag deaktivieren
vercel env add PUBLIC_ENABLE_SEARCH false

# Option 2: Revert auf vorherigen Commit
git revert <commit-hash>
git push origin main
```

### 4. Monitoring

**Metriken zu überwachen:**

- Search API Response Time (Ziel: <100ms)
- Search Index Load Time (Ziel: <500ms)
- Filter Interaction Rate
- Error Rate (Ziel: <0.1%)

**Tools:**

- Vercel Analytics (bereits aktiv)
- Sentry (für Error-Tracking)
- Google Analytics (für User-Behavior)

---

## Anhang

### A. CMS-Konfiguration (Vollständig)

```yaml
# frontend/public/admin/config.yml

# ... (bestehende Konfiguration) ...

collections:
  # Media Collection
  - name: media
    label: "车影骑踪 / Media"
    label_singular: "Media Item"
    folder: "src/content/media/{{lang}}"
    create: true
    slug: "{{slug}}"
    media_folder: "/public/images/uploads/media"
    public_folder: "/images/uploads/media"
    fields:
      - { label: "Language", name: "lang", widget: "hidden", default: "de" }
      - { label: "Title", name: "title", widget: "string", 
          hint: "建议格式: 2025-01-阿尔卑斯骑行" }
      - { label: "Description", name: "description", widget: "text" }
      - { label: "Type", name: "type", widget: "select", required: true,
          options: [
            { label: "影像作品 (Video)", value: "video" },
            { label: "骑友访谈 (Interview)", value: "interview" },
            { label: "翻山越岭 (Adventure)", value: "adventure" },
            { label: "活动图集 (Gallery)", value: "gallery" }
          ],
          hint: "选择内容形式" }
      - { label: "Tags", name: "tags", widget: "list", required: false,
          hint: "例如: social-ride, alps, 2025" }
      - { label: "Date", name: "date", widget: "datetime", format: "YYYY-MM-DD" }
      - { label: "Cover Image", name: "coverImage", widget: "image",
          hint: "⚠️ 请重命名为 media-xxx.webp 后上传" }
      - { label: "Body", name: "body", widget: "markdown" }

  # Gear Collection
  - name: gear
    label: "器械知识 / Gear"
    label_singular: "Gear Article"
    folder: "src/content/knowledge/gear/{{lang}}"
    create: true
    slug: "{{slug}}"
    media_folder: "/public/images/uploads/gear"
    public_folder: "/images/uploads/gear"
    fields:
      - { label: "Language", name: "lang", widget: "hidden", default: "de" }
      - { label: "Title", name: "title", widget: "string" }
      - { label: "Description", name: "description", widget: "text" }
      - { label: "Category", name: "category", widget: "select", required: true,
          options: [
            { label: "单车选购与组装", value: "bike-build" },
            { label: "电子与穿戴", value: "electronics" },
            { label: "人身装备", value: "apparel" },
            { label: "维修保养", value: "maintenance" }
          ] }
      - { label: "Subcategory", name: "subcategory", widget: "string", required: false,
          hint: "例如: frames, power, helmet, tools" }
      - { label: "Author", name: "author", widget: "string" }
      - { label: "Date", name: "date", widget: "datetime", format: "YYYY-MM-DD" }
      - { label: "Cover Image", name: "coverImage", widget: "image",
          hint: "⚠️ 请重命名为 gear-xxx.webp 后上传" }
      - { label: "Body", name: "body", widget: "markdown" }

  # Training Collection
  - name: training
    label: "科学训练 / Training"
    label_singular: "Training Article"
    folder: "src/content/knowledge/training/{{lang}}"
    create: true
    slug: "{{slug}}"
    media_folder: "/public/images/uploads/train"
    public_folder: "/images/uploads/train"
    fields:
      - { label: "Language", name: "lang", widget: "hidden", default: "de" }
      - { label: "Title", name: "title", widget: "string" }
      - { label: "Description", name: "description", widget: "text" }
      - { label: "Category", name: "category", widget: "select", required: true,
          options: [
            { label: "体能训练", value: "physical" },
            { label: "训练计划", value: "planning" },
            { label: "营养与健康", value: "wellness" },
            { label: "数据分析", value: "analytics" }
          ] }
      - { label: "Tags", name: "tags", widget: "list", required: false,
          hint: "例如: Endurance, FTP, Recovery" }
      - { label: "Author", name: "author", widget: "string" }
      - { label: "Date", name: "date", widget: "datetime", format: "YYYY-MM-DD" }
      - { label: "Cover Image", name: "coverImage", widget: "image",
          hint: "⚠️ 请重命名为 train-xxx.webp 后上传" }
      - { label: "Body", name: "body", widget: "markdown" }

  # Routes Collection
  - name: routes
    label: "骑行路线 / Routes"
    label_singular: "Route"
    folder: "src/content/routes/{{lang}}"
    create: true
    slug: "{{slug}}"
    media_folder: "/public/images/uploads/route"
    public_folder: "/images/uploads/route"
    fields:
      - { label: "Language", name: "lang", widget: "hidden", default: "de" }
      - { label: "Name", name: "name", widget: "string" }
      - { label: "Description", name: "description", widget: "text" }
      - { label: "Region", name: "region", widget: "select", required: true,
          options: [
            { label: "慕尼黑南郊", value: "munich-south" },
            { label: "慕尼黑北郊", value: "munich-north" },
            { label: "巴伐利亚阿尔卑斯", value: "alps-bavaria" },
            { label: "奥地利阿尔卑斯", value: "alps-austria" },
            { label: "意大利多洛米蒂", value: "alps-italy" },
            { label: "西班牙海岛", value: "island-spain" }
          ] }
      - { label: "Difficulty", name: "difficulty", widget: "select", required: true,
          options: [
            { label: "🟢 Easy (<60km, <400m)", value: "easy" },
            { label: "🟡 Medium (60-100km, 400-1000m)", value: "medium" },
            { label: "🟠 Hard (100-150km, 1000-2000m)", value: "hard" },
            { label: "🔴 Expert (>150km, >2000m)", value: "expert" }
          ] }
      - { label: "Distance (km)", name: "distance", widget: "number", 
          value_type: "float", min: 0, max: 500 }
      - { label: "Elevation (m)", name: "elevation", widget: "number",
          value_type: "int", min: 0, max: 5000 }
      - { label: "Surface", name: "surface", widget: "select",
          options: ["tarmac", "gravel", "mixed"],
          default: "tarmac" }
      - { label: "GPX File", name: "gpxFile", widget: "file", required: false,
          hint: "上传 .gpx 文件" }
      - { label: "Cover Image", name: "coverImage", widget: "image",
          hint: "⚠️ 请重命名为 route-xxx.webp 后上传" }
      - { label: "Body", name: "body", widget: "markdown" }

  # Events Collection
  - name: events
    label: "慕城日常 / Events"
    label_singular: "Event"
    folder: "src/content/events/{{lang}}"
    create: true
    slug: "{{slug}}"
    media_folder: "/public/images/uploads/event"
    public_folder: "/images/uploads/event"
    fields:
      - { label: "Language", name: "lang", widget: "hidden", default: "de" }
      - { label: "Title", name: "title", widget: "string" }
      - { label: "Description", name: "description", widget: "text" }
      - { label: "Location", name: "location", widget: "string" }
      - { label: "Date", name: "date", widget: "datetime" }
      - { label: "Event Type", name: "eventType", widget: "select",
          options: ["social-ride", "training-camp", "race", "workshop"] }
      - { label: "Cover Image", name: "coverImage", widget: "image",
          hint: "⚠️ 请重命名为 event-xxx.webp 后上传" }
      - { label: "Body", name: "body", widget: "markdown" }
```

### B. TypeScript-Typen (Vollständig)

```typescript
// src/types/search.ts

export type Collection = 'media' | 'gear' | 'training' | 'routes' | 'events';
export type Language = 'de' | 'en' | 'zh';

export interface BaseSearchItem {
  collection: Collection;
  slug: string;
  lang: Language;
}

export interface MediaSearchItem extends BaseSearchItem {
  collection: 'media';
  title: string;
  description: string;
  type: 'video' | 'interview' | 'adventure' | 'gallery';
  tags: string[];
  date: string;
  coverImage: string;
}

export interface GearSearchItem extends BaseSearchItem {
  collection: 'gear';
  title: string;
  description: string;
  category: 'bike-build' | 'electronics' | 'apparel' | 'maintenance';
  subcategory?: string;
  author: string;
  date: string;
}

export interface TrainingSearchItem extends BaseSearchItem {
  collection: 'training';
  title: string;
  description: string;
  category: 'physical' | 'planning' | 'wellness' | 'analytics';
  tags: string[];
  author: string;
  date: string;
}

export interface RouteSearchItem extends BaseSearchItem {
  collection: 'routes';
  name: string;
  description: string;
  region: 'munich-south' | 'munich-north' | 'alps-bavaria' | 'alps-austria' | 'alps-italy' | 'island-spain';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  distance: number;
  elevation: number;
  surface: 'tarmac' | 'gravel' | 'mixed';
  gpxFile?: string;
}

export interface EventSearchItem extends BaseSearchItem {
  collection: 'events';
  title: string;
  description: string;
  location: string;
  date: string;
  eventType: 'social-ride' | 'training-camp' | 'race' | 'workshop';
}

export type SearchItem = 
  | MediaSearchItem 
  | GearSearchItem 
  | TrainingSearchItem 
  | RouteSearchItem 
  | EventSearchItem;

export interface SearchIndex {
  version: string;
  generated: string;
  lang: Language;
  collections: {
    media: MediaSearchItem[];
    gear: GearSearchItem[];
    training: TrainingSearchItem[];
    routes: RouteSearchItem[];
    events: EventSearchItem[];
  };
}

export interface SearchResult<T extends SearchItem = SearchItem> {
  item: T;
  score: number;
  matches?: Array<{
    key: string;
    value: string;
    indices: [number, number][];
  }>;
}
```

### C. Risiken und Mitigationen

| Risiko                               | Wahrscheinlichkeit | Impact  | Mitigation                                          |
| ------------------------------------ | ------------------ | ------- | --------------------------------------------------- |
| **Suchindex zu groß**         | Mittel             | Hoch    | Pagination implementieren, nur Metadaten indexieren |
| **Fuse.js Performance-Issues** | Niedrig            | Mittel  | Web Worker für Suche nutzen                        |
| **URL-State-Konflikte**        | Niedrig            | Niedrig | Namespace für Filter-Parameter (`f_difficulty`)  |
| **Mobile-UX-Probleme**         | Mittel             | Hoch    | Frühzeitige Mobile-Tests, Touch-optimierte Slider  |
| **Browser-Kompatibilität**    | Niedrig            | Mittel  | Polyfills für URLSearchParams                      |

---

## Zusammenfassung

Dieser detaillierte Plan für Phase 4.1 bietet:

✅ **Klare Architektur**: Build-Zeit-Index-Generierung + Client-seitige Suche
✅ **Content-Governance-Konformität**: Vollständige Integration der Taxonomien
✅ **Schrittweise Implementierung**: 10-Tage-Roadmap mit klaren Meilensteinen
✅ **Qualitätssicherung**: Unit-Tests, E2E-Tests, Accessibility-Audits
✅ **Deployment-Strategie**: Feature-Flags, Beta-Rollout, Monitoring

**Nächste Schritte:**

1. Review dieses Plans mit dem Team
2. CMS-Konfiguration aktualisieren (Tag 0)
3. Sprint 1 starten (Tag 1)

**Geschätzte Gesamtdauer:** 10 Arbeitstage (2 Wochen)
**Geschätzter Aufwand:** 1 Full-Stack-Entwickler
**Abhängigkeiten:** Keine (kann sofort starten)`</content>`
</search_and_replace
