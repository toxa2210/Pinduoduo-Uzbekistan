# API v1

Base path: /api/v1

## Auth
POST /auth/request-otp
POST /auth/verify-otp
POST /auth/refresh

## Catalog
GET /categories
GET /products
GET /products/:id

## Cart
GET /cart
POST /cart/items
PATCH /cart/items/:id
DELETE /cart/items/:id

## Orders
POST /orders
GET /orders
GET /orders/:id

## Payments
POST /orders/:id/payment
POST /payments/:provider/webhook

## Admin
GET /admin/orders
PATCH /admin/orders/:id/status

External providers must not be exposed directly to the mobile client.
