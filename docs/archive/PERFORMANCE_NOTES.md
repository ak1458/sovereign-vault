# Performance Notes

Date: February 18, 2026

## Implemented Optimizations

1. Virtualized note rendering
- `src/features/vault/components/note-list.tsx`
- Large lists now render only visible rows + overscan window.
- Reduces DOM node count and scroll jank for high note volumes.

2. Debounced search input
- `src/lib/use-debounced-value.ts`
- `src/features/vault/pages/vault-page.tsx`
- Search query evaluation now waits briefly before triggering expensive reload/filter logic.

3. Worker offload for AI tasks
- `src/workers/ai.worker.ts`
- Embedding and summary work remains off the main UI thread.

4. Incremental pagination + load more
- `src/features/vault/pages/vault-page.tsx`
- Data fetch size scales by page rather than loading everything by default.

## Profiling Guidance

Use Chrome DevTools Performance panel:
1. Seed 1000+ notes.
2. Record scroll in Vault tab.
3. Record search typing in keyword and semantic modes.
4. Confirm low scripting/layout spikes and stable frame times.

Use Memory panel:
1. Take baseline snapshot after unlock.
2. Scroll deep list.
3. Trigger search and summarize once.
4. Take second snapshot and compare retained nodes.

## Expected Outcomes
- Scroll smoothness stays stable with large lists due to virtualization.
- Search no longer triggers heavy recompute on each keystroke.
- Main thread remains responsive during AI operations.
