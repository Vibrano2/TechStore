# Architecture

## Recommended Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS

### Backend
Preferred:
- Django
- Django REST Framework

### Database
- PostgreSQL

### Cache / Queue
Optional for scale:
- Redis
- Celery

### Media Storage
- S3-compatible storage or Cloudinary

### Deployment
- Frontend: Vercel
- Backend: managed Linux/container platform
- Database: managed PostgreSQL

## Core Domains
- Authentication
- Catalogue
- Categories
- Brands
- Product variants
- Specifications
- Search
- Inventory
- Cart
- Wishlist
- Checkout
- Payments
- Shipping
- Orders
- Reviews
- Returns
- Warranty
- Promotions
- Admin

## Core Data Models
### User
- id
- email
- phone
- first_name
- last_name
- language
- created_at

### Product
- id
- name
- slug
- brand_id
- category_id
- description
- short_description
- status
- created_at
- updated_at

### ProductVariant
- id
- product_id
- sku
- price
- compare_at_price
- stock
- vat_rate
- barcode
- weight
- status

### ProductSpecification
- id
- product_id
- name
- value
- unit
- group

### Order
- id
- user_id
- status
- payment_status
- subtotal
- shipping_total
- tax_total
- discount_total
- grand_total
- currency
- created_at

### OrderItem
- id
- order_id
- variant_id
- quantity
- unit_price
- tax_amount

## API Style
REST API for MVP.

Prefix:
`/api/v1/`

Examples:
- `/api/v1/products/`
- `/api/v1/categories/`
- `/api/v1/cart/`
- `/api/v1/orders/`
- `/api/v1/returns/`

## Search
MVP:
- PostgreSQL full-text search

Scale-up:
- Meilisearch or Algolia

## Payments
Use provider-hosted or tokenized payment flows.

Never store raw card details.

## Internationalization
Use locale-aware formatting for:
- German
- English
- EUR currency
- Dates
- Numbers

## SEO
Use server-rendered product and category pages.

Add:
- Metadata
- Canonical URLs
- JSON-LD
- Product schema
- Breadcrumb schema
- XML sitemap

## Observability
Add:
- Structured logs
- Error monitoring
- Payment event logs
- Order status audit trail
- Admin activity logs
