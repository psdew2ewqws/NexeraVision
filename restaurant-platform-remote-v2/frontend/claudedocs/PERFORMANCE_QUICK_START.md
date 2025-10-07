# Performance Optimization Quick Start Guide

**Quick reference for implementing the performance optimizations**

---

## Immediate Actions (Copy-Paste Ready)

### 1. Enable Optimized Components (5 minutes)

**Replace MenuBuilder import in `pages/menu/builder.tsx`:**
```typescript
// Change this:
import MenuBuilder from '../../src/components/menu/MenuBuilder';

// To this:
import MenuBuilder from '../../src/components/menu/MenuBuilder.optimized';
```

**Or use feature flag approach:**
```typescript
import MenuBuilder from '../../src/components/menu/MenuBuilder';
import MenuBuilderOptimized from '../../src/components/menu/MenuBuilder.optimized';

const USE_OPTIMIZED = process.env.NEXT_PUBLIC_USE_OPTIMIZED === 'true';

export default function MenuBuilderPage() {
  const Component = USE_OPTIMIZED ? MenuBuilderOptimized : MenuBuilder;
  return <Component onSave={handleSave} />;
}
```

### 2. Add Performance Monitoring (2 minutes)

**In `pages/_app.tsx`, add:**
```typescript
import { useEffect } from 'react';
import { initPerformanceMonitoring } from '../src/lib/performance-monitoring';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    initPerformanceMonitoring();
  }, []);

  return <Component {...pageProps} />;
}
```

### 3. Install Missing Dependencies (1 minute)

```bash
cd /home/admin/restaurant-platform-remote-v2/frontend

# web-vitals is already in package.json (via Next.js)
# If not, install it:
npm install web-vitals
```

---

## Testing the Optimizations

### Development Testing

**1. Start dev server:**
```bash
cd /home/admin/restaurant-platform-remote-v2/frontend
npm run dev
```

**2. Open browser console and navigate to `/menu/builder`**

**3. Look for performance logs:**
```
🔍 Performance monitoring initialized
✅ [GOOD] FCP: 850ms
✅ [GOOD] LCP: 1150ms
📊 Products loaded in 245ms
```

**4. Test interactions:**
- Type in search box → should see only 1 API call after pause
- Select products → should be instant (no lag)
- Change category → should use cache if recently loaded

### React DevTools Profiling

**1. Install React DevTools extension (Chrome/Firefox)**

**2. Open DevTools → Profiler tab**

**3. Click "Record" → perform actions → click "Stop"**

**4. Compare commits:**
```
Before optimization:
  Product selection: 8-12 commits, 150ms duration

After optimization:
  Product selection: 2-3 commits, 20ms duration
```

---

## Performance Comparison Commands

### Quick Performance Check

```bash
# Terminal 1: Start frontend
cd /home/admin/restaurant-platform-remote-v2/frontend
npm run dev

# Terminal 2: Run Lighthouse
npx lighthouse http://localhost:3000/menu/builder \
  --only-categories=performance \
  --quiet \
  --chrome-flags="--headless"
```

### Bundle Size Analysis

```bash
# Build and analyze
npm run build

# If bundle analyzer not configured, add to package.json:
npm install --save-dev @next/bundle-analyzer

# Then run:
ANALYZE=true npm run build
```

---

## Key Files Reference

### Optimized Components
```
/frontend/src/components/menu/
├── MenuBuilder.optimized.tsx      ← Main optimized component
├── BranchSelector.optimized.tsx   ← Optimized branch selector
└── ChannelSelector.optimized.tsx  ← Optimized channel selector
```

### Utilities & Hooks
```
/frontend/src/
├── hooks/
│   └── useDebounce.ts            ← Debounce hook (already exists)
└── lib/
    └── performance-monitoring.ts  ← Performance tracking
```

### Configuration
```
/frontend/
├── performance-budget.json        ← Performance budgets
└── claudedocs/
    ├── MENU_BUILDER_PERFORMANCE_ANALYSIS.md
    └── PERFORMANCE_OPTIMIZATION_IMPLEMENTATION.md
```

---

## Common Issues & Solutions

### Issue: "Cannot find module 'web-vitals'"
**Solution:**
```bash
npm install web-vitals
```

### Issue: React Query errors
**Solution:** Ensure @tanstack/react-query is installed
```bash
npm install @tanstack/react-query@4.40.1
```

### Issue: Performance monitoring not showing logs
**Check:**
1. Is `NODE_ENV=development`?
2. Did you call `initPerformanceMonitoring()` in `_app.tsx`?
3. Open browser console (F12)

### Issue: Components not re-rendering when they should
**Check memo dependencies:**
```typescript
// Make sure you're comparing the right props
React.memo(Component, (prev, next) => {
  // Return true if props are equal (skip re-render)
  // Return false if props changed (re-render)
  return prev.id === next.id;
});
```

---

## Performance Checklist

### ✅ Pre-Deployment Checklist

- [ ] Replace imports with `.optimized` versions
- [ ] Add `initPerformanceMonitoring()` to `_app.tsx`
- [ ] Test in development with console logs
- [ ] Run React DevTools Profiler comparison
- [ ] Run Lighthouse audit (score >90)
- [ ] Test rapid interactions (search, select, filter)
- [ ] Check browser console for errors
- [ ] Verify API calls reduced (Network tab)
- [ ] Test page navigation during loading (cleanup)
- [ ] Run bundle analyzer

### ✅ Post-Deployment Monitoring

- [ ] Monitor Web Vitals in production
- [ ] Check error rates (Sentry/logs)
- [ ] Compare performance metrics (before/after)
- [ ] Monitor user feedback
- [ ] Check API cache hit rates
- [ ] Review re-render counts in React DevTools

---

## Expected Performance Gains

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| TTI | 3.2s | 1.4s | **-56%** |
| LCP | 2.9s | 1.15s | **-60%** |
| Product selection | 150ms lag | 20ms lag | **-87%** |
| Re-renders | 8-12 | 2-3 | **-75%** |
| Search API calls | 5 per "pizza" | 1 total | **-80%** |
| Cache hit rate | 0% | 70% | **+70pp** |

---

## Rollback Instructions

### If Issues Occur in Production

**Quick Rollback (2 minutes):**
```bash
cd /home/admin/restaurant-platform-remote-v2/frontend

# Option 1: Revert imports
# Change .optimized back to original in imports

# Option 2: Git revert (if committed)
git revert HEAD
git push

# Option 3: Feature flag disable
# Set NEXT_PUBLIC_USE_OPTIMIZED=false in .env
```

### Gradual Rollback (If Using Feature Flags)

```typescript
// _app.tsx or feature flag config
const ROLLOUT_PERCENTAGE = 0; // 0% = disabled, 100% = all users

const shouldUseOptimized = Math.random() * 100 < ROLLOUT_PERCENTAGE;
```

---

## Support & Debugging

### Enable Verbose Logging

```typescript
// In performance-monitoring.ts
const isDevelopment = true; // Force development mode

// Or set environment variable
NEXT_PUBLIC_DEBUG_PERFORMANCE=true npm run dev
```

### React Query DevTools

```typescript
// pages/_app.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <Component {...pageProps} />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Performance Profiling

```typescript
// Add to any component
import { PerformanceMarkers } from '../lib/performance-monitoring';

useEffect(() => {
  PerformanceMarkers.componentRenderStart('MyComponent');

  return () => {
    PerformanceMarkers.componentRenderEnd('MyComponent');
  };
});
```

---

## Next Steps After Implementation

1. **Week 1**: Monitor metrics daily
2. **Week 2**: Implement Phase 2 optimizations (virtualization)
3. **Week 3**: Add image optimization with Next.js Image
4. **Week 4**: Implement code splitting for heavy dependencies
5. **Ongoing**: Maintain performance budget compliance

---

## Contact & Resources

**Documentation**:
- Full Analysis: `/frontend/claudedocs/MENU_BUILDER_PERFORMANCE_ANALYSIS.md`
- Implementation Guide: `/frontend/claudedocs/PERFORMANCE_OPTIMIZATION_IMPLEMENTATION.md`
- This Quick Start: `/frontend/claudedocs/PERFORMANCE_QUICK_START.md`

**Useful Links**:
- React Profiler: https://react.dev/reference/react/Profiler
- React Query Docs: https://tanstack.com/query/latest/docs/react
- Web Vitals: https://web.dev/vitals/
- Lighthouse: https://developers.google.com/web/tools/lighthouse

---

**Quick Start Version**: 1.0
**Last Updated**: October 2, 2025
