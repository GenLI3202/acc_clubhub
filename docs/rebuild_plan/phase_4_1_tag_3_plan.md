# Sprint 1 - Tag 3: Filter Infrastructure Implementation Plan

## Objective
Build the core filtering logic and UI components needed to filter content collections client-side. This infrastructure will bridge the static content (Astro) with dynamic user preferences (URL state).

## 1. Type Refactoring (`src/types/`)
We detected that `src/types/search.ts` currently holds rudimentary filter types. We will extract and enhance them.

### 1.1 Create `src/types/filter.ts`
Move `FilterState` and `FilterConfig` from `search.ts` to here, and strictly define them:

```typescript
export type FilterType = 'select' | 'multiselect' | 'range' | 'date';

export interface FilterOption {
  value: string | number;
  label: string;
  count?: number; // Facet count (New)
}

export interface FilterDefinition {
  key: string;
  label: string;
  type: FilterType;
  options?: FilterOption[]; // For static options like Categories
  min?: number; // For range
  max?: number; // For range
  unit?: string;
}

// Runtime state
export interface FilterState {
  [key: string]: string | string[] | [number, number] | undefined;
}
```

### 1.2 Cleanup `src/types/search.ts`
- Remove `FilterState` and `FilterConfig` from `search.ts`.
- Ensure `SearchItem` is exported (it is) so `filter.ts` or utils can use it if needed (though mostly utils will use it).

## 2. State Management (`src/lib/filter/useFilterState.ts`)
A custom Preact hook to sync state with URL query parameters.

- **Features**:
  - Initialize state from `window.location.search`.
  - Debounce URL updates (optional, but good for sliders).
  - Provide `setFilter(key, value)`, `resetFilters()`.
  - Handle array serialization (`?tags=alps,2025`) vs single value.
  - **SSR Safety**: Ensure it doesn't crash during build (check `import.meta.env.SSR` or `typeof window`).

## 3. Facet Logic (`src/lib/filter/facetUtils.ts`)
Logic to verify which filters are available based on the current data set.

- `calculateFacets(items: SearchItem[], definitions: FilterDefinition[]): FilterDefinition[]`
  - Iterates through the provided items.
  - Counts occurrences for 'select'/'multiselect' fields.
  - Updates the `options` in the definitions with the calculated `count`.

## 4. UI Components (`src/components/filter/`)
*Using Preact + Vanilla CSS*

### 4.1 `FilterSection.tsx`
- A collapsible container for a single filter group.
- Props: `title`, `isOpen`, `onToggle`, `preview` (e.g., "3 selected").

### 4.2 `FilterCheckboxGroup.tsx`
- Renders a list of options with counts.
- Props: `options: FilterOption[]`, `selected: string[]`, `onChange`.

### 4.3 `FilterRangeSlider.tsx`
- A dual-thumb slider for Distance/Elevation.
- Props: `min`, `max`, `value: [number, number]`, `onChange`.
- *Note*: Start with two number inputs if dual-slider complexity is high.

### 4.4 `FilterPanel.tsx` (The Controller)
- Accepts `config: FilterDefinition[]` and `status: FilterState`.
- Renders the list of `FilterSection`s.
- Mobile responsive.

## Execution Steps

1.  **[Types]**: Create `src/types/filter.ts` and clean up `src/types/search.ts`.
2.  **[Logic]**: Create `src/lib/filter/useFilterState.ts` & `facetUtils.ts`.
3.  **[Verification]**: Create a temporary test page `/de/test-filter` to verify the Hook updates the URL correctly.
4.  **[UI]**: Build the `FilterPanel` components.
