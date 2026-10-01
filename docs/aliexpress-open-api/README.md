# AliExpress Open Platform API

This folder contains the authenticated export from `https://openservice.aliexpress.com/` captured on 2026-10-01.

## Export summary

- 18 sections
- 197 API methods
- API paths, HTTP method types, descriptions, parameters, outputs, examples, error codes and endpoint metadata where published
- Raw complete export: [raw/all-api.json](raw/all-api.json)

## Sections

| Section | Methods | Use |
| --- | ---: | --- |
| System Tool | 4 | Access token creation and refresh, including security tokens. |
| AE-Affiliate | 15 | Affiliate products, categories, hot products, links and affiliate orders. This is the first integration slice used by Uriona. |
| AE-Logistics | 16 | Shipping services, seller/package logistics and delivery operations. |
| AE-Product Management | 47 | Product creation, editing, SKU and product management for seller workflows. |
| AE-Aliexpress-Direct-Product | 16 | AliExpress Direct product flows. |
| AE-KoreanCrossborder-Product | 7 | Korean cross-border product workflows. |
| AE-Order & Transaction | 8 | Orders, transactions and order operations. |
| AE-Settlement | 12 | Settlement and financial reconciliation. |
| AE-Custmize | 4 | Customized platform operations. |
| AE-Dropshipper | 16 | Dropshipping workflows. |
| AE-Image | 4 | Image upload and image management. |
| AE-Seller | 24 | Seller account and store operations. |
| AE-Category&Attributes | 7 | Categories and product attributes. |
| AE-Refund&return | 5 | Refund and return operations. |
| AE-Freight (Shipment) | 1 | Freight/shipment operations. |
| AliExpress Direct Logistic | 9 | AliExpress Direct logistics. |
| AE-EAN Code | 1 | EAN code operations. |
| CSP-Seller | 1 | CSP seller operations. |

## First backend integration

Uriona exposes these server-side routes:

```text
GET /api/v1/integrations/aliexpress/affiliate/products
GET /api/v1/integrations/aliexpress/affiliate/categories
GET /api/v1/integrations/aliexpress/affiliate/links
GET /api/v1/integrations/aliexpress/affiliate/orders
GET /api/v1/integrations/aliexpress/affiliate/orders/detail
```

They map to:

- `aliexpress.affiliate.hotproduct.query`
- `aliexpress.affiliate.category.get`
- `aliexpress.affiliate.link.generate`
- `aliexpress.affiliate.order.list`
- `aliexpress.affiliate.order.get`

The backend keeps `ALIEXPRESS_APP_SECRET` and access tokens out of the browser. Seller mutations, fulfilment, refund, and logistics methods are documented but not exposed as unauthenticated public routes.

## Configuration

Copy the AliExpress settings into the backend's local `.env` and fill values from the AliExpress App Console:

```env
ALIEXPRESS_API_URL=https://api-sg.aliexpress.com/sync
ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=
ALIEXPRESS_ACCESS_TOKEN=
```

Do not commit secrets. The current client uses the Open Platform signed request shape (`app_key`, `method`, `timestamp`, `sign_method`, `format`, `v`, optional `access_token`, and `sign`). Confirm the exact gateway/signature requirements for the selected account and API version in the method card before production use.
