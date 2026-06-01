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
- [x] Heartbeat cron job setup/cancel UI built (Enable Auto-Sync button on Sync Dashboard; job registers after deploy)

## Secrets / Configuration
- [x] CLOVER_MERCHANT_ID env variable (set and validated)
- [x] CLOVER_API_TOKEN env variable (set and validated)
- [x] CLOVER_API_BASE_URL env variable (set to https://api.clover.com)

## Tests
- [x] Vitest: catalog.getCategories — public access
- [x] Vitest: catalog.getTags — public access
- [x] Vitest: catalog.getItems — returns items with associations
- [x] Vitest: catalog.getSyncLogs — returns log entries
- [x] Vitest: catalog.syncNow — admin allowed
- [x] Vitest: catalog.syncNow — non-admin rejected
- [x] Vitest: catalog.syncNow — unauthenticated rejected

## Carrito de Compras y Checkout (Authorize.net)
- [x] Schema DB: tabla orders y order_items
- [x] Migración aplicada a la base de datos
- [x] Integración Authorize.net: charge con tarjeta (createTransactionRequest)
- [x] tRPC router: cart procedures (createOrder, getOrder, placeOrder)
- [x] CartContext global con estado persistente en localStorage
- [x] CartDrawer: sidebar deslizable con items, cantidades y total
- [x] Botón "Agregar al carrito" en cada item del catálogo
- [x] Página /checkout con formulario de datos del cliente y tarjeta
- [x] Página /order-confirmation con resumen de la orden
- [x] Manejo de errores de pago con mensajes claros al usuario
- [x] Tests Vitest para el router de órdenes

## Menú Interactivo Público

- [x] Sincronización completa con Clover (todas las categorías e items) — 293 items, 39 cat., 653 mods
- [x] Página /menu pública con items agrupados por categoría
- [x] Navegación lateral sticky por categoría en el menú
- [x] Modal interactivo paso a paso para selección de modificadores
- [x] Botón "Add to Cart" en cada item del menú
- [x] CartDrawer global con resumen, cantidades y checkout
