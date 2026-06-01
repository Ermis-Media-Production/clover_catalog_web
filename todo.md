# Clover Catalog Web — TODO

## Database Schema
- [x] Add clover_categories table (id, clover_id, name, sort_order)
- [x] Add clover_tags table (id, clover_id, name, show_in_reporting)
- [x] Add clover_modifier_groups table (id, clover_id, name, min_required, max_allowed)
- [x] Add clover_modifiers table (id, clover_id, modifier_group_id, name, price, available)
- [x] Add clover_items table (id, clover_id, name, price, cost, description, sku, hidden, available, stock_count, image_url)
- [x] Add clover_item_categories join table
- [x] Add clover_item_tags join table
- [x] Add clover_item_modifier_groups join table
- [x] Add sync_logs table (id, started_at, finished_at, status, items_synced, categories_synced, tags_synced, modifiers_synced, error_message)

## Clover API Sync Engine
- [x] Clover API client utility (base URL, token, merchant ID from env)
- [x] Fetch all categories from Clover
- [x] Fetch all tags from Clover
- [x] Fetch all modifier groups + modifiers from Clover
- [x] Fetch all items with expansions (categories, tags, modifierGroups, images)
- [x] Upsert all entities into DB within a single sync run
- [x] Record sync log entry on each run (success or error)

## tRPC Procedures
- [x] catalog.getItems — list items with categories, tags, modifiers
- [x] catalog.getCategories — list all categories
- [x] catalog.getTags — list all tags
- [x] catalog.getModifierGroups — list all modifier groups
- [x] catalog.getModifiers — modifiers for a given group
- [x] catalog.syncNow — trigger manual sync (admin only)
- [x] catalog.getSyncLogs — return last N sync log entries
- [x] catalog.getLastSync — last successful sync summary

## Admin Dashboard UI
- [x] Home landing page with stats (items, categories, last sync)
- [x] Catalog browser page — items grouped by category, tags and modifiers per item
- [x] Category sidebar filter
- [x] Search by name, SKU, description
- [x] Item cards with image, price, cost, SKU, availability, hidden status, tags, modifiers
- [x] Sync control panel — manual sync button, last sync time, items synced count
- [x] Sync log table — timestamp, status, duration, counts, error message
- [x] Loading and error states throughout

## Scheduled Sync
- [x] Heartbeat-based scheduled sync handler at /api/scheduled/clover-sync
- [x] Mounted in server/_core/index.ts before Vite fallthrough
- [ ] Heartbeat cron job created (requires deploy first — see delivery notes)

## Secrets / Configuration
- [ ] CLOVER_MERCHANT_ID env variable (needs user input)
- [ ] CLOVER_API_TOKEN env variable (needs user input)
- [ ] CLOVER_API_BASE_URL env variable (default: https://api.clover.com)

## Tests
- [x] Vitest: catalog.getCategories — public access
- [x] Vitest: catalog.getTags — public access
- [x] Vitest: catalog.getItems — returns items with associations
- [x] Vitest: catalog.getSyncLogs — returns log entries
- [x] Vitest: catalog.syncNow — admin allowed
- [x] Vitest: catalog.syncNow — non-admin rejected
- [x] Vitest: catalog.syncNow — unauthenticated rejected
