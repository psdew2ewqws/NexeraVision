# Menu Builder Architecture Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      MenuBuilderContainer                        │
│                   (Orchestration Layer)                          │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐  │
│  │ useMenuProducts│  │useProductSelect│  │useProductFilters│  │
│  │  (TanStack Q)  │  │  (State Mgmt)  │  │  (State Mgmt)   │  │
│  └────────────────┘  └────────────────┘  └─────────────────┘  │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐                        │
│  │useMenuCateg... │  │  useMenuSave   │                        │
│  │  (TanStack Q)  │  │  (Mutations)   │                        │
│  └────────────────┘  └────────────────┘                        │
└──────────────────────────┬───────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ↓                 ↓                 ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ ProductGrid  │  │  FilterBar   │  │ SelectionSumm│
│              │  │              │  │              │
│ ┌──────────┐ │  │ ┌──────────┐ │  │              │
│ │ProductCard│ │  │ │ Search   │ │  │              │
│ │(Memoized) │ │  │ │ Category │ │  │              │
│ └──────────┘ │  │ └──────────┘ │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Actions                             │
└────────────┬────────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    MenuBuilderContainer                          │
│                                                                  │
│  Event Handlers                                                  │
│  ├─ handleSaveMenu()        ─────→ useMenuSave hook             │
│  ├─ handleProductToggle()   ─────→ useProductSelection hook     │
│  ├─ handleSearchChange()    ─────→ useProductFilters hook       │
│  └─ handleCategoryChange()  ─────→ useProductFilters hook       │
│                                                                  │
└─────────────┬────────────────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Custom Hooks                             │
│                                                                  │
│  useMenuProducts ────────→ menuBuilderService.getProducts()     │
│  useMenuCategories ──────→ menuBuilderService.getCategories()   │
│  useMenuSave ────────────→ menuBuilderService.saveMenu()        │
│                                                                  │
└─────────────┬────────────────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│                   (menuBuilderService)                           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ API Abstraction                                          │   │
│  │ ├─ Authentication handling                              │   │
│  │ ├─ Error handling                                       │   │
│  │ ├─ Request/Response transformation                      │   │
│  │ └─ Type safety                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────┬────────────────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API                                 │
│                   (NestJS - Port 3001)                           │
│                                                                  │
│  /menu/products/paginated  (POST)                               │
│  /menu/categories          (GET)                                │
│  /menu/save                (POST)                               │
│                                                                  │
└─────────────┬────────────────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                           │
│                      (postgres)                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
MenuBuilderContainer
├── MenuBuilderHeader
│   └── Save Button (with loading state)
│
├── Form Inputs
│   ├── Menu Name Input
│   ├── BranchSelector
│   └── ChannelSelector
│
├── Product Selection Section
│   ├── SelectionSummary
│   │   ├── Selected count
│   │   └── Select/Deselect all button
│   │
│   ├── FilterBar
│   │   ├── Search Input
│   │   └── Category Dropdown
│   │
│   ├── ErrorDisplay (conditional)
│   │   ├── Error message
│   │   └── Retry button
│   │
│   └── ProductGrid
│       └── ProductCard[] (memoized)
│           ├── Product Image
│           ├── Product Info
│           ├── Price
│           └── Selection Indicator
```

## Hook Composition

```
MenuBuilderContainer
│
├─ useAuth()                    (Context)
├─ useLanguage()                (Context)
│
├─ useProductFilters()          (Custom Hook)
│   ├─ categoryId: string | null
│   ├─ search: string
│   ├─ setCategoryId()
│   ├─ setSearch()
│   └─ clearFilters()
│
├─ useProductSelection()        (Custom Hook)
│   ├─ selectedIds: string[]
│   ├─ toggleProduct()
│   ├─ selectAll()
│   ├─ deselectAll()
│   └─ isSelected()
│
├─ useMenuProducts()            (TanStack Query)
│   ├─ products: MenuProduct[]
│   ├─ loading: boolean
│   ├─ error: Error | null
│   └─ refetch()
│
├─ useMenuCategories()          (TanStack Query)
│   ├─ categories: MenuCategory[]
│   ├─ loading: boolean
│   ├─ error: Error | null
│   └─ refetch()
│
└─ useMenuSave()                (TanStack Mutation)
    ├─ saveMenu()
    ├─ saving: boolean
    ├─ error: Error | null
    └─ data: SaveMenuResponse
```

## State Management Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      State Types                             │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│   Server State      │
│  (TanStack Query)   │
├─────────────────────┤
│ • Products          │
│ • Categories        │
│ • Menu data         │
└─────────────────────┘
         ↓
   Cached (5-10 min)
   Auto-refetch
   Deduplication

┌─────────────────────┐
│   Client State      │
│ (useState + hooks)  │
├─────────────────────┤
│ • Selected IDs      │
│ • Filter values     │
│ • Search term       │
└─────────────────────┘
         ↓
   Component-local
   No persistence
   Fast updates

┌─────────────────────┐
│    Form State       │
│ (Controlled inputs) │
├─────────────────────┤
│ • Menu name         │
│ • Branch IDs        │
│ • Channel IDs       │
└─────────────────────┘
         ↓
   Controlled
   Validation ready
   Submit on save
```

## Request/Response Flow

```
User Action → Component Event → Hook Call → Service Method → API Request
                                                                    ↓
User Sees Result ← Component Updates ← Hook Returns ← Service Transforms ← API Response
```

### Example: Loading Products

```
1. Component mounts
   └─→ useMenuProducts({ categoryId: null, search: '' })

2. TanStack Query checks cache
   └─→ Cache miss → Triggers fetch

3. Hook calls service
   └─→ menuBuilderService.getProducts(filters)

4. Service builds request
   ├─→ Adds auth token
   ├─→ Sets headers
   └─→ POSTs to /menu/products/paginated

5. Backend processes request
   ├─→ Validates token
   ├─→ Filters products
   └─→ Returns paginated response

6. Service transforms response
   └─→ Validates with Zod schema (optional)

7. TanStack Query stores in cache
   └─→ Sets stale time (5 min)

8. Hook returns data
   └─→ { products, loading: false, error: null }

9. Component renders
   └─→ ProductGrid → ProductCard[]
```

## Error Handling Flow

```
Error Occurs (API/Network)
         ↓
Service Layer catches error
         ↓
┌────────┴────────┐
│                 │
↓                 ↓
TanStack Query    Custom Error
Error State       Handling
│                 │
↓                 ↓
Hook returns      Toast notification
error object      shown
│
↓
Component renders
ErrorDisplay
│
↓
User sees error
+ Retry button
```

## Performance Optimization Points

```
┌──────────────────────────────────────────────────────────┐
│                   Optimization Layer                     │
└──────────────────────────────────────────────────────────┘

1. Component Level
   ├─ React.memo(ProductCard)       ← Prevent re-renders
   └─ useMemo for derived values    ← Expensive calculations

2. Query Level
   ├─ TanStack Query cache          ← Reduce API calls
   ├─ Background refetching         ← Fresh data
   └─ Query deduplication           ← Multiple consumers

3. Network Level
   ├─ Debounced search              ← Reduce requests
   ├─ Pagination support            ← Load less data
   └─ Retry with backoff            ← Handle failures

4. Render Level
   ├─ Virtual scrolling ready       ← Large lists
   └─ Lazy loading support          ← Code splitting
```

## File Structure by Responsibility

```
features/menu-builder/
│
├── index.ts                    [Public API]
│   └─ Barrel exports all public interfaces
│
├── types/                      [Type Definitions]
│   └── menuBuilder.types.ts
│       ├─ MenuProduct
│       ├─ MenuCategory
│       ├─ ProductFilters
│       └─ API Response types
│
├── schemas/                    [Runtime Validation]
│   └── menuBuilder.schemas.ts
│       ├─ Zod schemas
│       └─ Type inference
│
├── services/                   [API Layer]
│   └── menuBuilderService.ts
│       ├─ getProducts()
│       ├─ getCategories()
│       ├─ saveMenu()
│       └─ syncToPlatform()
│
├── hooks/                      [Reusable Logic]
│   ├── useMenuProducts.ts      [Data fetching]
│   ├── useMenuCategories.ts    [Data fetching]
│   ├── useProductSelection.ts  [State management]
│   ├── useProductFilters.ts    [State management]
│   └── useMenuSave.ts          [Mutations]
│
├── components/                 [Presentation]
│   ├── ProductCard.tsx         [Pure, memoized]
│   ├── ProductGrid.tsx         [Layout]
│   ├── FilterBar.tsx           [Filters]
│   ├── SelectionSummary.tsx    [Summary]
│   ├── MenuBuilderHeader.tsx   [Header]
│   └── ErrorDisplay.tsx        [Errors]
│
├── containers/                 [Orchestration]
│   └── MenuBuilderContainer.tsx
│       └─ Combines all hooks + components
│
├── utils/                      [Helpers]
│   └── menuBuilder.utils.ts
│       ├─ groupProductsByCategory()
│       ├─ calculateTotalPrice()
│       ├─ validateMenuData()
│       └─ debounce()
│
└── README.md                   [Documentation]
```

## Dependency Graph

```
MenuBuilderContainer
│
├─ depends on →
│  ├─ hooks/*
│  ├─ components/*
│  ├─ contexts/*
│  └─ external selectors
│
hooks/*
│
├─ depends on →
│  ├─ services/*
│  ├─ types/*
│  └─ @tanstack/react-query
│
services/*
│
├─ depends on →
│  ├─ types/*
│  └─ localStorage (auth)
│
components/*
│
├─ depends on →
│  ├─ types/*
│  ├─ utils/*
│  └─ @heroicons/react
│
types/*
│
└─ no dependencies (base layer)
```

## Testing Pyramid

```
                    ┌─────────────┐
                    │   E2E (1)   │
                    │  Playwright  │
                    └─────────────┘
                   ┌───────────────┐
                   │ Integration   │
                   │   (5 tests)   │
                   │  Container +  │
                   │   Components  │
                   └───────────────┘
              ┌──────────────────────┐
              │   Component Tests    │
              │     (20 tests)       │
              │   Pure components    │
              └──────────────────────┘
        ┌────────────────────────────────┐
        │        Hook Tests              │
        │         (30 tests)              │
        │  useMenuProducts, etc.         │
        └────────────────────────────────┘
   ┌──────────────────────────────────────┐
   │         Unit Tests                   │
   │          (40 tests)                  │
   │   Service, utils, validation         │
   └──────────────────────────────────────┘
```

---

**Legend**:
- `→` Flow direction
- `├─` Component hierarchy
- `└─` Dependency
- `[Type]` Layer or category
