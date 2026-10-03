# Backend

NestJS + Prisma backend for Uriona. AliExpress is the external catalog provider.

## Local development

1. Start infrastructure from repository root:
   `docker compose up -d`
2. Copy `.env.example` to `.env`.
3. Install dependencies:
   `npm install`
4. Generate Prisma client:
   `npm run prisma:generate`
5. Create the local database schema:
   `npm run prisma:migrate -- --name init`
6. Start the API:
   `npm run dev`

API base URL: `http://localhost:8000/api/v1`.

The development OTP is returned by `POST /auth/request-otp`. This is intentionally disabled as a production delivery mechanism; production must use an approved OTP provider.

Email/password sign-in is provided by Firebase Authentication. Enable the Email/Password provider in Firebase Console, set `FIREBASE_PROJECT_ID` to that project's ID, and provide the Firebase Web App configuration to the frontend. The API accepts a Firebase ID token at `POST /api/v1/auth/firebase` and rejects sign-in until the Firebase token reports a verified email. Apply database migrations with `npm run prisma:migrate:deploy`; Render runs this command during the backend build.

AliExpress product detail requests use `GET /api/v1/integrations/aliexpress/product/:productId` and require an app with Dropshipping API access. The endpoint defaults to delivery country `UZ`, currency `USD`, and language `ru_RU`; these can be overridden with `ship_to_country`, `target_currency`, and `target_language` query parameters.

Image search uses SerpApi's Google Lens engine. Set `SERPAPI_API_KEY` in the backend environment; the key must never be placed in the frontend. `POST /api/v1/integrations/aliexpress/image-search` accepts a multipart `image` file up to 8 MB, forwards it to SerpApi for image matching, and returns matching AliExpress products. Users are informed in the UI that their selected image is sent to SerpApi and Google Lens.

AliExpress catalog responses and product details are cached in the PostgreSQL `MarketplaceApiCache` table. Fresh responses are served from the database; expired responses are returned immediately while the backend refreshes them in the background. Cache lifetimes are one hour for searches, 12 hours for product details, and 24 hours for categories. Old cache entries are pruned every six hours. The browser requests catalog pages in batches of 20, while the image proxy resizes marketplace images and serves WebP thumbnails (larger WebP images for product details).

Shipping estimates use `GET /api/v1/integrations/aliexpress/freight` with `productId`, `selectedSkuId`, and `quantity`. The backend calls `aliexpress.ds.freight.query` with destination `UZ` by default; currency defaults to USD and locale to Russian. Freight quotes are deliberately not cached. The buyer must select an available option before adding an AliExpress product through the detail view.

Authenticated customers submit checkout to `POST /api/v1/orders` with recipient/address details and cart item snapshots. Before saving an AliExpress item, the backend rechecks the current SKU price and stock and requests a fresh delivery quote for the selected SKU, quantity, and destination `UZ`. Shipping is converted to UZS using AliExpress's UZS quote where available; if the quote is in another currency, the backend uses the Central Bank of Uzbekistan's published rate (cached for six hours). The saved order includes the product subtotal, delivery amount, discount, and payable total, and starts in `AWAITING_PAYMENT`. The order confirmation and order history show that status; payment initiation is deliberately not exposed yet. Apply all pending Prisma migrations before deployment. The legacy `POST /api/v1/checkout` endpoint is retired and returns `410 Gone`. AliExpress order placement and payment collection remain out of scope.

Configure `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET`, `ALIEXPRESS_REDIRECT_URI`, a base64-encoded 32-byte `ALIEXPRESS_TOKEN_ENCRYPTION_KEY`, and a long random `ALIEXPRESS_OAUTH_SETUP_SECRET` in the backend environment. Set the exact same redirect URI in AliExpress Open Platform. Generate keys with `openssl rand -base64 32` and `openssl rand -hex 32`; keep them stable because changing the encryption key makes stored tokens unreadable. Apply the Prisma migration before enabling OAuth. To start authorization, send a POST to `/api/v1/integrations/aliexpress/oauth/start` with the `x-aliexpress-setup-secret` header; open the returned `authorizationUrl` in a browser. The public callback validates its one-time state, exchanges the authorization code, and saves encrypted access and refresh tokens in PostgreSQL. The backend refreshes access tokens as needed. A manually supplied `ALIEXPRESS_ACCESS_TOKEN` remains a fallback and must only be configured on the backend. Never place app secrets or tokens in the frontend or repository.
