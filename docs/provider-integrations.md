# Provider integrations

This repository keeps provider secrets outside Git. Copy `backend/.env.example` to a local `.env`.

## AliExpress

The AliExpress Open Platform app credentials are configured on the backend only; never put the app secret or access token in frontend variables. Add `ALIEXPRESS_APP_KEY` and `ALIEXPRESS_APP_SECRET` (and, when issued, `ALIEXPRESS_ACCESS_TOKEN`) to the backend environment in Render or `backend/.env` locally. `ALIEXPRESS_API_URL` defaults to `https://api-sg.aliexpress.com/sync`.

The signed-in Open Platform reference is in [docs/aliexpress-open-api](aliexpress-open-api/README.md). The backend exposes an affiliate/catalog slice under `/api/v1/integrations/aliexpress`:

- `GET /affiliate/products?keywords=phone&category_ids=...&page_no=1&page_size=20&target_currency=CNY` -> `aliexpress.affiliate.hotproduct.query`
- `GET /affiliate/categories` -> `aliexpress.affiliate.category.get`
- `GET /affiliate/links` -> `aliexpress.affiliate.link.generate`
- `GET /affiliate/orders` -> `aliexpress.affiliate.order.list`
- `GET /affiliate/orders/detail` -> `aliexpress.affiliate.order.get`

The frontend loads live affiliate categories and products through these backend routes. The displayed CNY prices are converted using `VITE_CNY_TO_UZS` (defaults to `1800`). Confirm the app has access to Affiliate API methods and is approved for live data; test-status apps may only return sandbox/test results. Seller mutations and fulfillment APIs remain in the API reference and are not exposed publicly by default.

## Click

Implemented Shop API callback endpoint:

`POST /api/v1/payments/click/callback`

Supports Prepare (action 0) and Complete (action 1), verifies the official Click signature format and stores the payment in the existing Prisma `Payment` model.

Environment:
- `CLICK_SERVICE_ID`
- `CLICK_MERCHANT_ID`
- `CLICK_SECRET_KEY`

Click must whitelist/configure the production callback URL on the merchant side.

## Payme

Implemented Merchant API JSON-RPC endpoint:

`POST /api/v1/payments/payme`

Methods:
- `CheckPerformTransaction`
- `CreateTransaction`
- `CheckTransaction`
- `PerformTransaction`
- `CancelTransaction`
- `GetStatement`

Environment:
- `PAYME_MERCHANT_ID`
- `PAYME_MERCHANT_KEY`
- `PAYME_TEST_MODE`

## Paynet

Implemented Paynet UWS JSON-RPC endpoint:

`POST /api/v1/payments/paynet/uws`

Methods:
- `GetInformation`
- `PerformTransaction`
- `CheckTransaction`
- `CancelTransaction`
- `GetStatement`

Environment:
- `PAYNET_USERNAME`
- `PAYNET_PASSWORD`

For Paynet UWS production, configure HTTPS, Basic Auth and the provider IP allowlist. The official Paynet onboarding also requires the serviceId list and production URL.

## Production checklist

1. Provision PostgreSQL/Redis.
2. Set all provider credentials as deployment secrets.
3. Put the API behind HTTPS.
4. Configure provider callback URLs.
5. Complete provider sandbox/UAT tests.
6. Obtain production credentials/merchant IDs.
7. Run Prisma migrations.
8. Start backend.
9. Enable product synchronization only after the Pinduoduo application has the required API permissions.

No production secret belongs in GitHub.
