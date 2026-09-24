# Provider integrations

This repository keeps provider secrets outside Git. Copy `backend/.env.example` to a local `.env`.

## Pinduoduo

Gateway: `https://gw-api.pinduoduo.com/api/router`.

Implemented:
- `pdd.ddk.goods.search`
- `pdd.ddk.goods.detail`
- `pdd.goods.cats.get`
- `pdd.ddk.mall.goods.list.get`

The adapter signs requests server-side with MD5 and never exposes `PDD_CLIENT_SECRET` to the browser.

Environment:
- `PDD_CLIENT_ID`
- `PDD_CLIENT_SECRET`
- `PDD_ACCESS_TOKEN` (only when the selected API method requires OAuth)

Important: API access is subject to Pinduoduo application approval and per-method permissions. A public API endpoint is not an anonymous API.

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
