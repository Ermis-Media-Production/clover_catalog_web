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

## Landing Page Pública

- [x] Hero banner con nombre del restaurante, slogan y CTA al menú
- [x] Sección de horarios del restaurante
- [x] Sección de dirección / ubicación
- [x] Navegación pública separada del panel admin
- [x] Diseño con identidad visual de Casa de Pizza & Wings

## Subida de Fotos de Platos (Admin)

- [x] Columna customImageUrl en clover_items (DB migration)
- [x] Endpoint de subida de imagen (multipart/form-data → S3)
- [x] Express routes: POST/DELETE /api/items/:cloverId/image (multer + S3)
- [x] Página /photos con grid de todos los items y botón de subida por item
- [x] Preview de imagen actual y opción de reemplazar o eliminar
- [x] Filtro/búsqueda de items en la página de fotos
- [x] MenuPage: mostrar customImageUrl si existe, con fallback a imagen de Clover o placeholder
- [x] Tests Vitest para los procedures de imagen (cubiertos por catalog.test.ts)

## Sistema de Cupones de Descuento

- [x] Tabla coupons en DB (código, tipo, valor, activo, usos, expiración)
- [x] Cupón Casa98 creado (98% de descuento, tipo porcentaje)
- [x] tRPC procedure: validateCoupon (retorna descuento calculado)
- [x] tRPC procedure: applyCoupon en placeOrder (aplica descuento al total)
- [x] Campo de cupón en CheckoutPage con feedback visual (válido/inválido)
- [x] Total actualizado en tiempo real al aplicar cupón
- [x] Página de gestión de cupones en panel admin (/coupons)
- [x] Tests Vitest para validateCoupon (9 tests en coupon.test.ts)

## Order History Admin Page

- [x] tRPC procedure: orders.list — list all orders with customer info, total, status, items count
- [x] tRPC procedure: orders.getById — get order details with all items and modifiers
- [x] Admin Orders page (/orders) with table of all orders
- [x] Order detail view with customer info, items, modifiers, coupon, total, Clover order ID
- [x] Register /orders route in admin navigation (Home.tsx nav + Orders link)

## Landing Page Improvements

- [x] Add restaurant phone number to landing page — (702) 200-5252
- [x] Update restaurant hours to real schedule — 10:00 AM to 10:00 PM every day

## Clover Order Integration (Push orders to Clover POS)

- [x] Research Clover Orders API (POST /v3/merchants/{mId}/orders, add line items, mark as paid)
- [x] Create cloverOrders.ts helper: createCloverOrder(items, customer) → cloverOrderId
- [x] Add line items to Clover order: POST /v3/merchants/{mId}/orders/{orderId}/bulk_line_items
- [x] Mark Clover order as locked (paid externally) after successful Authorize.net charge
- [x] Store cloverOrderId in local orders table (new column)
- [x] Wire cloverOrders.ts into checkout.ts placeOrder mutation (after markOrderPaid)
- [x] Handle Clover API errors gracefully (log but don't fail the local order)
- [x] Add DB migration for cloverOrderId column in orders table
- [x] Add Vitest tests for Clover order creation helper (6 tests)

## Clover Atomic Order Flow (print_event integration)

- [x] Rewrite cloverOrders.ts to use /atomic_order/orders endpoint (not /orders + bulk_line_items)
- [x] Add sleep(2s) after atomic order creation before print_event
- [x] Send POST /print_event with orderRef + deviceRef BEFORE marking as paid
- [x] Send POST /orders/{id}/payments to mark order as paid externally (after print)
- [x] Add CLOVER_PRINTER_DEVICE_ID and CLOVER_PAYMENT_TENDER_ID env secrets
- [x] 10 Vitest tests covering atomic flow, print order, payment, error handling

## Brand Redesign (Landing Page + Menu Page)

- [x] Upload Casa de Pizza & Wings logo to static assets
- [x] Update global CSS theme: forest green (#2d5a1e) primary, deep red (#c41e1e) accent, warm cream (#f7f2e8) background
- [x] Add Playfair Display, Oswald, and Lato fonts from Google Fonts
- [x] Redesign LandingPage: top bar, branded nav with logo, hero with food photo, stats bar, 16-category grid, lunch specials callout, hours/location section, footer
- [x] Redesign MenuPage: branded nav with logo, dark green sidebar, category sort order matching restaurant categories, branded item cards with green/red accents
- [x] All 39 tests still passing after redesign

## Most Popular Section (Landing Page)
- [x] tRPC procedure: catalog.getPopularItems — query order_items grouped by itemId, count frequency, join with clover_items for name/price/image
- [x] Fallback: if no order data, show top 6 items from Clover catalog sorted by price (available items)
- [x] LandingPage: "Most Popular" section with 6 item cards showing photo, name, price, and ORDER NOW button
- [x] Item cards match brand style (green/red/cream) with hover effects and skeleton loading state
