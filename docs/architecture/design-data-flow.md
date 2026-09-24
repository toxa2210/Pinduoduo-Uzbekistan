# Design, code and data flow

Figma defines visual structure, tokens, component intent and screen contracts. GitHub contains the production implementation and API contracts. The backend/database remains the runtime source of truth for products, prices, stock, users, orders and payments.

Flow:
Figma component/screen -> Code Connect -> web React/TypeScript or Android Compose implementation -> /api/v1 -> NestJS -> Prisma/database/external providers.

Never make the backend request runtime data from Figma. Figma is not an application database or API gateway.

Web and Android consume the same versioned API and the same shared design-token contract. UI changes are first reflected in Figma, then mapped to the corresponding code component/screen and implemented in GitHub.
