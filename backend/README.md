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
