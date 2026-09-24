# Architecture

## Layers

1. Client — web/mobile UI.
2. API — authentication and application APIs.
3. Domain services — catalog, pricing, checkout, orders, delivery and notifications.
4. Integrations — supplier, payment, logistics and messaging providers.
5. Data — relational database, cache and object storage.
6. Operations — CI/CD, monitoring, logging and secrets.

## Core modules

Users/authentication, products/categories, search, cart, checkout, orders, payments, delivery, supplier integration, notifications, admin/moderation and analytics.

Provider-specific integrations should be isolated behind interfaces so providers can be replaced without rewriting the core domain.
