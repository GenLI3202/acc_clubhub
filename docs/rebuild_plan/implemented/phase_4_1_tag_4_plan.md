# Sprint 2 - Tag 4: Search UI Components Implementation Plan

## Objective
Implement the user-facing search interface, including the search bar, results dropdown, and highlighting logic. The components will be built using Preact to provide a responsive, interactive experience without shipping heavy hydration costs for the rest of the page.

## 1. Search Index Loader (`src/lib/search/searchIndex.ts`)
Implement the singleton loader to fetch and cache the search index.

- **Features**:
  - `loadSearchIndex(lang)`: Fetches `/api/search-index.[lang].json`.
  - **Data Normalization**: Flattens `json.collections` into a single `SearchItem[]` array for Fuse.js.
  - Caching: Stores the promise to prevent multiple network requests.
  - Error Handling: Returns a safe empty index on failure.

## 2. Highlight Component (`src/components/search/SearchHighlight.tsx`)
A functional component to highlight matching text segments.

- **Props**: `text: string`, `matches: Fuse.FuseResultMatch[]`
- **Logic**: Parses Fuse.js indices to split text into `mark` and `span` segments.

## 3. Search Result Item (`src/components/search/SearchResultItem.tsx`)
Renders a single result card in the dropdown.

- **Props**: `result: FuseResult<SearchItem>`, `isSelected: boolean` (for keyboard nav).
- **UI**:
  - Title with highlighting.
  - Description snippet (truncated) with highlighting.
  - Collection badge (icon + name).
  - Thumbnail (if available).

## 4. Search Results Dropdown (`src/components/search/SearchResults.tsx`)
Container for the list of results.

- **Props**: `results: FuseResult<SearchItem>[]`, `selectedIndex: number`.
- **UI**:
  - Grouped by Collection (optional, or flat list with badges).
  - "No results" state.
  - Loading state.

## 5. Main Search Bar (`src/components/search/SearchBar.tsx`)
The controller component.

- **State**: `query`, `results`, `isOpen`, `selectedIndex`, `isLoading`.
- **Logic**:
  - `onFocus`: Trigger `loadSearchIndex`.
  - `onChange`: Debounce 300ms -> `fuse.search()`.
  - `onKeyDown`: Manage `selectedIndex` (ArrowUp/Down), Enter to navigate, Esc to close.
  - `useClickOutside`: Close dropdown when clicking elsewhere.

## 6. Integration
- Add `SearchBar` to `src/components/Header.astro` (or layout) as a Preact Island (`client:idle`).

## Execution Steps

1.  **[Logic]**: Create `src/lib/search/searchIndex.ts`.
2.  **[UI - Atom]**: Create `SearchHighlight.tsx`.
3.  **[UI - Molecule]**: Create `SearchResultItem.tsx` and `SearchResults.tsx`.
4.  **[UI - Organism]**: Create `SearchBar.tsx` and wire everything together.
5.  **[Integration]**: Add to a test page first, then Header.

## Technical Considerations
- **Lazy Loading**: The heavy JSON index (~200KB?) is ONLY fetched when the user focuses the input.
- **Accessibility**: Use `combobox` pattern.
- **Style**: Use scoped CSS or existing utility classes.
