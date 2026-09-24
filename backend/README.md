# Backend

NestJS + Prisma backend for Pinduoduo Uzbekistan.

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
